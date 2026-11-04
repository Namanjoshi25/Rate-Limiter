import asyncio
import json
import time
from typing import Any, Awaitable, Callable, Dict, Optional
from redis.asyncio import Redis

HandlerType = Callable[[Dict[str, Any]], Awaitable[Any]]


class JobWorker:
    """
    Background Task Consumer backed by Redis Lists and Hashes.
    
    Pops jobs from the queue, invokes registered task handlers,
    and updates the job state machine:
    
    [queued] -> [processing] -> [completed]
                              -> [failed]
    """

    def __init__(self, redis_client: Redis, queue_name: str = "queue:tasks"):
        self.redis = redis_client
        self.queue_name = queue_name
        self._handlers: Dict[str, HandlerType] = {}

    def register_handler(self, task_type: str, handler: HandlerType):
        """Registers an async function to execute for a given task_type."""
        self._handlers[task_type] = handler

    async def process_one_job(self, timeout: int = 1) -> bool:
       
        pop_result = await self.redis.brpop(self.queue_name,timeout)
        if pop_result is None:
            return False
        _,job_id = pop_result
        
        job_key = f"job:{job_id}"

        job_data = {}
        for i in range(3):
            job_data = await self.redis.hgetall(job_key)
            if job_data:
                break
            else:
                await asyncio.sleep(0.05)
        if not job_data:
            return False
        
        await self.redis.hset(job_key,mapping={
            "status":"processing",
            "started_at":str(time.time())
        })
        task_type = job_data.get("task_type")
        handler = self._handlers.get(task_type)
        if not handler:
            await self.redis.hset(job_key,mapping={
                "status":"failed",
                "error":f"No handler registered for task type: {task_type}",
                "finished_at":str(time.time())
            })
            return True
        try:
            payload = json.loads(job_data.get("payload","{}"))
            result = await handler(payload)
            await self.redis.hset(job_key,mapping={
                "status":"completed",
                "result":json.dumps(result),
                "finished_at":str(time.time())
            })
        except Exception as exc:
            await self.redis.hset(job_key,mapping={
                "status":"failed",
                 "error":str(exc),
                 "finished_at":str(time.time())
            })  

        return True      


    async def run(self, stop_event: Optional[asyncio.Event] = None):
        """Continuous worker loop that processes jobs until stop_event is set."""
        while stop_event is None or not stop_event.is_set():
            processed = await self.process_one_job(timeout=1)
            if not processed:
                # Small sleep when queue is idle to yield to event loop
                await asyncio.sleep(0.01)
