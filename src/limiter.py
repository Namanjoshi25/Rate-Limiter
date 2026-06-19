from .util.base_store import BaseStore
from .core.extractor import KeyExtractor
from typing import Any
from .core.algorithm import RateLimitResult
from .models.rate_limit import RateLimitConfig

class RateLimiter:
    def __init__(self,store:BaseStore,extractor:KeyExtractor,config:RateLimitConfig):
        self._store=  store
        self._extractor = extractor
        self._config = config

    async def check_request(self,request:Any,cost:int =1)->RateLimitResult:
        key = self._extractor.extract(request)
        result = await self._store.consume(
            key=key,
            capacity=self._config.capacity,
            refill_rate=self._config.refill_rate,
            cost=cost,
        )
        return result  