from .core.bucket_store import BucketStore
from .core.extractor import KeyExtractor
from typing import Any
from .core.algorithm import RateLimitResult

class RateLimiter:
    def __init__(self,store:BucketStore,extractor:KeyExtractor):
        self._store=  store
        self._extractor = extractor

    def check_request(self,request:Any)->RateLimitResult:
        key = self._extractor.extract(request)
        bucket =self._store.get_or_create(key)
        return bucket.consume()    