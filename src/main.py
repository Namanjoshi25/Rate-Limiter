from fastapi import FastAPI
from .core.algorithm import TokenBucket
from .core.bucket_store import BucketStore
from .core.extractor import IPKeyExtractor
from .limiter import RateLimiter
from .middleware import RateLimitMiddleware
from .models.rate_limit import RateLimitConfig
from .core.config import settings
app = FastAPI()

config = RateLimitConfig(capacity=settings.capacity, refill_rate=settings.refill_rate)
store = BucketStore(factory=lambda: TokenBucket(capacity=settings.capacity, refill_rate=settings.refill_rate))
limiter = RateLimiter(store=store, extractor=IPKeyExtractor(),config=config)

app.add_middleware(RateLimitMiddleware, limiter=limiter)


@app.get("/")
async def root():
    return {"message": "ok"}
