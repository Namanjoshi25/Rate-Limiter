from fastapi import FastAPI,Request,HTTPException
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
from .queue.job_dispatcher import JobDispatcher
from .services.mock_db import db 
from .cache.mutex_cache import MutexCache


config = RateLimitConfig(capacity=settings.capacity, refill_rate=settings.refill_rate)
@asynccontextmanager
async def lifespan(app:FastAPI):
    client = get_redis_client()
    store = RedisStore(client)
    limiter = RateLimiter(store=store, extractor=IPKeyExtractor(), config=config)
    
    app.state.limiter = limiter
    app.state.cache =MutexCache(client)
    app.state.dispatcher = JobDispatcher(client)
    yield

    await client.close()



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


@app.get("/api/items/{item_id}")
async def get_item(item_id:str,request:Request):
    data  = await app.state.cache.get_or_compute(f"item:{item_id}",fetch_fn = lambda:db.get_item(item_id),ttl_seconds=30)
    if data is None:
        raise HTTPException(404,detail="Item not found")
    return data


@app.get("/")
async def root():
    return {"message": "ok"}
