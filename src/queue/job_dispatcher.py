import json
import time
import uuid
from typing import Any, Dict, Optional
from redis.asyncio import Redis
from redis.exceptions import RedisError

class JobDispatcher:
    """
    Decoupled Producer for Asynchronous Background Jobs.
    
    Provides sub-2ms write ingestion (202 Accepted) by:
    1. Storing job state and payload in a Redis Hash (`job:<job_id>`).
    2. Enqueueing the job ID onto a FIFO List (`queue:tasks`).
    """

    def __init__(self, redis_client: Redis, queue_name: str = "queue:tasks"):
        self.redis = redis_client
        self.queue_name = queue_name

    async def enqueue_job(self, task_type: str, payload: Dict[str, Any]) -> str:
        """
        Enqueues a new background job into Redis.
        
        Must complete in < 2ms:
        1. Generates a unique UUID `job_id`.
        2. Initializes the job state hash at `job:<job_id>` with:
           - "id": job_id
           - "task_type": task_type
           - "payload": json.dumps(payload)
           - "status": "queued"
           - "created_at": str(time.time())
        3. Pushes the job ID to the right/left of the FIFO queue:
           - self.redis.lpush(self.queue_name, job_id)
        
        Args:
            task_type: Identifier of the task (e.g. 'send_email', 'generate_report')
            payload: Parameters needed to execute the job
            
        Returns:
            job_id: Unique string identifier for tracking status
        """
        # TODO: Step 1 - Generate unique UUID string for job_id
        # job_id = str(uuid.uuid4())
        # job_key = f"job:{job_id}"
        job_id = str(uuid.uuid4())
        job_key = f"job:{job_id}"
        try:
            await self.redis.hset(job_key,mapping={
                "id":job_id,
                "task_type":task_type,
                "payload":json.dumps(payload),
                "status":"queued",
                "created_at":str(time.time())
            })
            await self.redis.lpush(self.queue_name,job_id)

            return job_id
        except RedisError as e:
            print(f"Failed to enqueue job {job_id}: {e}")
            raise

    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetches the current lifecycle state and metadata for a job.
        
        Reads the Redis Hash at `job:<job_id>`.
        Returns None if job does not exist.
        Deserializes 'payload' and 'result' from JSON if present.
        """
        job_key = f"job:{job_id}"
      
        try:
            data = await self.redis.hgetall(job_key)
            if not data:
                return None
            if "payload" in data:
                data["payload"]= json.loads(data["payload"])
            if "result" in data and data["result"]:
                data["result"] = json.loads(data["result"]) 
            return data
        except RedisError as e:
            print(f"Failed to fetch status for job {job_id}: {e}")
            raise
