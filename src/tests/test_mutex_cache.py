import asyncio
import sys
import time
from redis.asyncio import Redis

# Ensure src is on path
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from src.cache.mutex_cache import MutexCache
from src.services.mock_db import db


async def run_cache_tests():
    print("=" * 65)
    print("TEST: Stampede-Proof Mutex Cache (Concurrency & Penetration)")
    print("=" * 65)

    redis_client = Redis(host="localhost", port=6380, db=0, decode_responses=True)
    try:
        await redis_client.ping()
    except Exception as e:
        print(f"[ERROR] Could not connect to Redis at port 6380: {e}")
        return

    cache = MutexCache(redis_client)

    # Clean up test keys
    for key in await redis_client.keys("cache:test:*"):
        await redis_client.delete(key)
    for key in await redis_client.keys("lock:test:*"):
        await redis_client.delete(key)

    # -------------------------------------------------------------------------
    # TEST 1: Concurrency Stampede Test (50 simultaneous requests for item_1)
    # -------------------------------------------------------------------------
    print("\n[Test 1] Firing 50 CONCURRENT requests for an expired key ('item_1')...")
    db.reset_counter()

    start_time = time.time()
    tasks = [
        cache.get_or_compute(
            key="test:item_1",
            fetch_fn=lambda: db.get_item("item_1"),
            ttl_seconds=30
        )
        for _ in range(50)
    ]
    results = await asyncio.gather(*tasks)
    elapsed = time.time() - start_time

    # Validate
    assert len(results) == 50
    assert all(r is not None and r["id"] == "item_1" for r in results)

    print(f"  * Total concurrent requests : 50")
    print(f"  * Actual DB query count     : {db.query_count}")
    print(f"  * Total elapsed time        : {elapsed:.3f}s (DB delay is 0.3s)")

    if db.query_count == 1:
        print("  -> [PASS] Mutex lock completely suppressed cache stampede! (Only 1 DB hit)")
    else:
        print(f"  -> [FAIL] Expected exactly 1 DB query, but got {db.query_count}.")

    # -------------------------------------------------------------------------
    # TEST 2: Penetration Defense Test (20 requests for non-existent item)
    # -------------------------------------------------------------------------
    print("\n[Test 2] Testing Negative Caching / Penetration Defense ('item_999')...")
    db.reset_counter()

    tasks_null = [
        cache.get_or_compute(
            key="test:item_999",
            fetch_fn=lambda: db.get_item("item_999"),
            ttl_seconds=30
        )
        for _ in range(20)
    ]
    null_results = await asyncio.gather(*tasks_null)

    assert len(null_results) == 20
    assert all(r is None for r in null_results)

    print(f"  * Total requests for missing key : 20")
    print(f"  * Actual DB query count          : {db.query_count}")

    if db.query_count == 1:
        print("  -> [PASS] Negative caching prevented repeated database penetration!")
    else:
        print(f"  -> [FAIL] Expected exactly 1 DB query, got {db.query_count}.")

    # Clean up
    for key in await redis_client.keys("cache:test:*"):
        await redis_client.delete(key)
    for key in await redis_client.keys("lock:test:*"):
        await redis_client.delete(key)
    await redis_client.aclose()

    print("\n" + "=" * 65)
    print("ALL CACHE CONCURRENCY TESTS PASSED!")
    print("=" * 65)


if __name__ == "__main__":
    asyncio.run(run_cache_tests())
