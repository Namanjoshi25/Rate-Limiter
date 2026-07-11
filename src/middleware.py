from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from .limiter import RateLimiter
from typing import Optional


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        

    _SKIP = frozenset({"/config", "/docs", "/redoc", "/openapi.json"})

    async def dispatch(self, request: Request, call_next):
        limiter = getattr(request.app.state,"limiter",None)
        if limiter is None:
            return await call_next(request)
        if request.url.path in self._SKIP:
            return await call_next(request)
        result = await limiter.check_request(request)
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
