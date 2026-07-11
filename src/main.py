from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from .core.extractor import IPKeyExtractor
from .core.connection import get_redis_client
from .limiter import RateLimiter
from .middleware import RateLimitMiddleware
from .models.rate_limit import RateLimitConfig
from .store.redis import RedisStore
from .core.config import settings
from contextlib import asynccontextmanager

config = RateLimitConfig(capacity=settings.capacity, refill_rate=settings.refill_rate)
@asynccontextmanager
async def lifespan(app:FastAPI):
    client = get_redis_client()
    store = RedisStore(client)
    limiter = RateLimiter(store=store, extractor=IPKeyExtractor(), config=config)
    app.state.limiter = limiter
    yield



app = FastAPI(lifespan=lifespan)

app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "Retry-After"],
)


class ConfigUpdate(BaseModel):
    capacity: Optional[int] = None
    refill_rate: Optional[float] = None


@app.get("/config")
async def get_config():
    return {"capacity": config.capacity, "refill_rate": config.refill_rate}


@app.patch("/config")
async def update_config(body: ConfigUpdate):
    if body.capacity is not None:
        config.capacity = body.capacity
    if body.refill_rate is not None:
        config.refill_rate = body.refill_rate
    return {"capacity": config.capacity, "refill_rate": config.refill_rate}


@app.get("/")
async def root():
    return {"message": "ok"}
