from redis.asyncio import Redis
from ..util.base_store import BaseStore
from ..core.algorithm import RateLimitResult
import time 
from pathlib import Path
_SCRIPTS_DIR = Path(__file__).parent.parent / "scripts"

TOKEN_BUCKET_SCRIPT = (_SCRIPTS_DIR / "token_bucket.lua").read_text()



class RedisStore(BaseStore):
    def __init__(self,redis:Redis):
        self._redis = redis
        self._script = redis.register_script(TOKEN_BUCKET_SCRIPT)

    async def consume(
            self,
            key:str,
            capacity:int,
            refill_rate:float,
            cost: int =1
    ) -> RateLimitResult:
        now = time.time()
        result = await self._script(
            key = [key],
            args=[capacity,refill_rate,cost,now]

        )
        allowed,remaining ,retry_after= result
        return RateLimitResult(
            allowed=allowed,
            remaining=int(remaining),
            retry_after=round(retry_after,3),
            limit=capacity
        )
    async def warmup(self)->None:
        await self._script.register()

    async def ping(self)->bool:
        try:
            return await self._redis.ping()
        except Exception:
            return False    

        
            