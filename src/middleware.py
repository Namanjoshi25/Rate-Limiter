from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from .limiter import RateLimiter


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limiter: RateLimiter):
        super().__init__(app)
        self._limiter = limiter

    async def dispatch(self, request: Request, call_next):
        result = await self._limiter.check_request(request)
        if not result.allowed:
            return JSONResponse(
                status_code=429,
                content={"error": "Too Many Requests", "retry_after": result.retry_after},
                headers={"Retry-After": str(result.retry_after)},
            )
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(result.limit)
        response.headers["X-RateLimit-Remaining"] = str(result.remaining)
        return response
