from redis.asyncio import Redis, ConnectionPool
from .config import settings

_pool: ConnectionPool | None = None


def get_redis_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        _pool = ConnectionPool.from_url(
            settings.redis_url,
            max_connections=settings.redis_max_conns,
            decode_responses=True,
        )
    return _pool


def get_redis_client() -> Redis:
    pool = get_redis_pool()
    return Redis(connection_pool=pool)