import asyncio
import os
import sys
import time
from redis.asyncio import Redis

# Ensure src is on python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from src.queue.job_dispatcher import JobDispatcher
from src.queue.worker import JobWorker


async def run_queue_tests():
    print("=" * 65)
    print("TEST: Decoupled Background Task Queue (Dispatcher & Worker)")
    print("=" * 65)

    redis_client = Redis(host="localhost", port=6380, db=0, decode_responses=True)
    try:
        await redis_client.ping()
    except Exception as e:
        print(f"[ERROR] Could not connect to Redis at port 6380: {e}")
        return

    test_queue = "queue:test_tasks"
    dispatcher = JobDispatcher(redis_client, queue_name=test_queue)
    worker = JobWorker(redis_client, queue_name=test_queue)

    # Clean up test keys
    for key in await redis_client.keys("job:*"):
        await redis_client.delete(key)
    await redis_client.delete(test_queue)

    # -------------------------------------------------------------------------
    # TEST 1: Sub-2ms Enqueue Latency & State Initialization
    # -------------------------------------------------------------------------
    print("\n[Test 1] Testing sub-2ms ingestion latency & initial state...")
    
    start_time = time.time()
    job_id = await dispatcher.enqueue_job(
        task_type="send_email",
        payload={"to": "dev@example.com", "subject": "Welcome"}
    )
    enqueue_time_ms = (time.time() - start_time) * 1000

    print(f"  * Generated Job ID       : {job_id}")
    print(f"  * Enqueue latency        : {enqueue_time_ms:.2f} ms")

    # Verify queue length in Redis
    q_len = await redis_client.llen(test_queue)
    assert q_len == 1, f"Expected 1 item in {test_queue}, got {q_len}"

    # Verify initial hash state
    status_data = await dispatcher.get_job_status(job_id)
    assert status_data is not None, "Job status should exist in Redis"
    assert status_data["status"] == "queued", f"Expected 'queued', got {status_data['status']}"
    assert status_data["payload"]["to"] == "dev@example.com"

    print("  -> [PASS] Job enqueued rapidly and metadata stored in Redis Hash!")

    # -------------------------------------------------------------------------
    # TEST 2: Worker Processing & Success State Transition
    # -------------------------------------------------------------------------
    print("\n[Test 2] Testing Worker execution & 'completed' state transition...")

    # Register mock async handler
    async def handle_send_email(payload: dict):
        await asyncio.sleep(0.05)  # Simulate I/O work
        return {"sent": True, "recipient": payload["to"]}

    worker.register_handler("send_email", handle_send_email)

    # Let worker process the queued job
    processed = await worker.process_one_job(timeout=1)
    assert processed is True, "Worker should have processed 1 job"

    # Verify post-processing state
    final_status = await dispatcher.get_job_status(job_id)
    assert final_status["status"] == "completed", f"Expected 'completed', got {final_status['status']}"
    assert "result" in final_status
    assert final_status["result"]["sent"] is True

    # Queue should now be empty
    q_len_after = await redis_client.llen(test_queue)
    assert q_len_after == 0, f"Expected empty queue, got {q_len_after}"

    print(f"  * Final job state: {final_status['status']}")
    print(f"  * Result: {final_status['result']}")
    print("  -> [PASS] Worker successfully completed job and recorded result!")

    # -------------------------------------------------------------------------
    # TEST 3: Worker Error Handling & 'failed' State Transition
    # -------------------------------------------------------------------------
    print("\n[Test 3] Testing Worker error handling & 'failed' state transition...")

    async def handle_failing_task(payload: dict):
        raise RuntimeError("External Payment API Timeout 504")

    worker.register_handler("process_payment", handle_failing_task)

    fail_job_id = await dispatcher.enqueue_job(
        task_type="process_payment",
        payload={"amount": 99.99}
    )

    processed_fail = await worker.process_one_job(timeout=1)
    assert processed_fail is True

    failed_status = await dispatcher.get_job_status(fail_job_id)
    assert failed_status["status"] == "failed", f"Expected 'failed', got {failed_status['status']}"
    assert "External Payment API Timeout 504" in failed_status["error"]

    print(f"  * Final job state: {failed_status['status']}")
    print(f"  * Error message: {failed_status['error']}")
    print("  -> [PASS] Worker caught error and recorded failure without crashing!")

    # Clean up
    for key in await redis_client.keys("job:*"):
        await redis_client.delete(key)
    await redis_client.delete(test_queue)
    await redis_client.aclose()

    print("\n" + "=" * 65)
    print("ALL BACKGROUND QUEUE TESTS PASSED!")
    print("=" * 65)


if __name__ == "__main__":
    asyncio.run(run_queue_tests())
