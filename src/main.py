from fastapi import FastAPI
from .core.algorithm import TokenBucket
from .core.bucket_store import BucketStore
from .core.extractor import IPKeyExtractor
from .limiter import RateLimiter
from .middleware import RateLimitMiddleware

app = FastAPI()

store = BucketStore(factory=lambda: TokenBucket(capacity=10, refill_rate=2))
limiter = RateLimiter(store=store, extractor=IPKeyExtractor())

app.add_middleware(RateLimitMiddleware, limiter=limiter)


@app.get("/")
async def root():
    return {"message": "ok"}
