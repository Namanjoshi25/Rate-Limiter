from typing import Callable
from .algorithm import TokenBucket
import threading

BucketFactory = Callable[[],TokenBucket]

class BucketStore:
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
