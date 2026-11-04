import asyncio
import json
import random
import uuid
from typing import Any, Awaitable, Callable, Optional
from redis.asyncio import Redis
import time

# Safe Lua script to release lock only if the token matches (prevents deleting someone else's lock)
RELEASE_LOCK_LUA = """
if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
else
    return 0
end
"""

NULL_SENTINEL = "__NULL_CACHE__"


class MutexCache:
    """
    Stampede-Proof Cache-Aside client backed by Redis.
    
    Protects databases from:
    1. Cache Stampede (Thundering Herd) -> Mutex Lock via SET NX PX
    2. Cache Avalanche -> Randomized TTL Jitter (+- 10%)
    3. Cache Penetration -> Negative Caching with NULL_SENTINEL
    """

    def __init__(self, redis_client: Redis, lock_timeout_ms: int = 5000):
        self.redis = redis_client
        self.lock_timeout_ms = lock_timeout_ms
        self._release_script = self.redis.register_script(RELEASE_LOCK_LUA)

    async def _background_refresh(self,cache_key,lock_key,lock_token,fetch_fn,ttl_seconds,jitter_seconds):
         try:
              data = await fetch_fn()
              if data is None:
                   envelope = {"data":None,"expires_at":time.time()+15}
                   await self.redis.set(cache_key,value=json.dumps(envelope),ex=30)
              else:
                   jittered_ttl = ttl_seconds+random.randint(-jitter_seconds,jitter_seconds)
                   envelope={'data':data,'expires_at':time.time()+jittered_ttl}
                   await self.redis.set(cache_key,value=json.dumps(envelope),ex=jittered_ttl*2)
         except Exception as e:
              pass          
         finally:
              await self._release_script(keys=[lock_key], args=[lock_token])       
         
    
    async def get_or_compute(
        self,
        key: str,
        fetch_fn: Callable[[], Awaitable[Any]],
        ttl_seconds: int = 60,
        jitter_seconds: int = 5,
        max_retries: int = 15,
        retry_interval_seconds: float = 0.05,
        lock_timeout_ms: int | None =None
    ) -> Any:
        """
        Gets a cached value or executes fetch_fn() using distributed mutex locking.
        
        Args:
            key: Cache key (e.g. 'item:item_1')
            fetch_fn: Async function to query DB if cache misses
            ttl_seconds: Base TTL for valid cached data
            jitter_seconds: Random variation added to TTL
            max_retries: Maximum polling attempts for follower requests waiting on the lock
            retry_interval_seconds: Polling delay between retries
        """
        cache_key = f"cache:{key}"
        lock_key = f"lock:{key}"

        effective_lock_timeout = lock_timeout_ms or self.lock_timeout_ms
        lock_token = str(uuid.uuid4())
        cached_data = await self.redis.get(cache_key)
        if cached_data :
            envelope = json.loads(cached_data)
            is_stale = time.time() > envelope["expires_at"]
            if not is_stale:
                 return envelope["data"]

            if is_stale:
                 acquired=await self.redis.set(lock_key,lock_token,nx=True,px=effective_lock_timeout)
                 if acquired:
                    asyncio.create_task(self._background_refresh(cache_key,lock_key,lock_token,fetch_fn,ttl_seconds,jitter_seconds))
                 return envelope["data"]       
            
        #acquiring a lock for the miss operation    
        
        acquired = await self.redis.set(lock_key, lock_token, nx=True, px=effective_lock_timeout)
        if acquired:
                        try:
                            stored_data = await fetch_fn() # Note: if fetch_fn is blocking/sync, consider run_in_executor
                            if stored_data is None:
                                envelope={"data":None,"expires_at":time.time()+15}
                                await self.redis.set(cache_key, value=json.dumps(envelope), ex=30)
                            else:
                                jittered_ttl = ttl_seconds + random.randint(-jitter_seconds, jitter_seconds)
                                envelope ={
                                     "data":stored_data,
                                     "expires_at":time.time()+jittered_ttl 
                                }
                                await self.redis.set(cache_key, value=json.dumps(envelope), ex=jittered_ttl*2) 
                            return stored_data
                        except Exception as e:
                    # Catch specific exceptions or log the real error
                            raise ValueError(f"Redis cache implementation failed: {e}")
                        finally:
                            await self._release_script(keys=[lock_key], args=[lock_token])
        for i in range(max_retries):
    # If lock wasn't acquired, wait and check cache, or loop back to try acquiring again
            await asyncio.sleep(retry_interval_seconds)
            cached_data = await self.redis.get(cache_key)
    
            if cached_data is not None:
                envelope=json.loads(cached_data)
                return envelope["data"]

        return await fetch_fn()

