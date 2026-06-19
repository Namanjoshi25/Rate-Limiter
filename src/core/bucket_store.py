from typing import Callable
from .algorithm import TokenBucket
import threading
from ..util.base_store import BaseStore
BucketFactory = Callable[[],TokenBucket]

class BucketStore(BaseStore):
    def __init__(self,factory:BucketFactory):
        self._factory = factory
        self._buckets: dict[str, TokenBucket] = {}
        self._lock = threading.Lock()

    def get_or_create(self,key:str)->TokenBucket:
        bucket = self._buckets.get(key)
        if bucket is not None:
            return bucket
        with self._lock:
            if key not in self._buckets:
                self._buckets[key] = self._factory()
            return self._buckets[key]

    def __len__(self)->int:
        return len(self._buckets)
    def keys(self)->str:
        with self._lock:
            return list(self._buckets.keys())  

    async def consume(self, key: str, capacity: int, refill_rate: float, cost: int = 1):
        bucket = self.get_or_create(key)
        return await bucket.consume(cost=cost)
