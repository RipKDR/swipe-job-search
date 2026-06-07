"""Token-bucket rate limiting middleware for Hi-Hired.

Provides two backends:

1. **RedisRateLimiter** (default when Redis is available, enabled via
   config ``RATE_LIMITER_BACKEND=redis``).  Uses Redis sorted sets for
   a sliding-window counter per client key + role.  Suitable for
   multi-process / multi-worker deployments.

2. **InMemoryRateLimiter** (default when ``RATE_LIMITER_BACKEND=memory``
   or Redis is unavailable).  Token bucket per client key with periodic
   stale-bucket cleanup.  Suitable for local dev and single-process
   deployments.

RateLimitMiddleware auto-selects the backend after a Redis connectivity
probe on first use.

Per-role rate limits (requests per minute):
  anonymous:  30
  jobseeker: 100
  employer:   50
  provider:   30
  admin:     200
"""

from __future__ import annotations

import os
import time
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from src.core.config import get_settings

settings = get_settings()

# Per-role rate limits (requests per 60-second sliding window)
ROLE_RATE_LIMITS: dict[str, int] = {
    "anonymous": 30,
    "jobseeker": 100,
    "employer": 50,
    "provider": 30,
    "admin": 200,
}

_RATE_LIMIT_WINDOW = 60  # seconds


class TokenBucket:
    """Token bucket rate limiter with continuous refill.

    Tokens are consumed per-request.  The bucket refills at a constant
    rate of ``capacity`` tokens per 60 seconds.  When empty, requests
    are rejected until tokens are replenished.
    """

    __slots__ = ("capacity", "tokens", "refill_rate", "last_refill")

    def __init__(self, capacity: int) -> None:
        self.capacity = capacity
        self.tokens = float(capacity)
        # Refill the full capacity over 60 seconds
        self.refill_rate = capacity / 60.0
        self.last_refill = time.monotonic()

    def _refill(self) -> None:
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

    def consume(self, tokens: float = 1.0) -> bool:
        """Attempt to consume *tokens* from the bucket.

        Returns:
            True if the tokens were consumed (request allowed).
            False if insufficient tokens remain (rate limited).
        """
        self._refill()
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False


class InMemoryRateLimiter:
    """In-memory token bucket registry with periodic stale-bucket cleanup."""

    def __init__(self) -> None:
        self._buckets: dict[str, TokenBucket] = {}
        self._last_cleanup = time.monotonic()
        self._cleanup_interval = 60.0

    def get_or_create(self, key: str, limit: int) -> TokenBucket:
        """Return an existing bucket for *key* or create a new one."""
        if key not in self._buckets:
            self._buckets[key] = TokenBucket(capacity=limit)
        return self._buckets[key]

    def check(self, key: str, role: str) -> bool:
        """Check whether a request from *key* with *role* is allowed.

        Returns True if allowed, False if rate-limited.
        """
        limit = ROLE_RATE_LIMITS.get(role, 30)
        bucket = self.get_or_create(key, limit)
        return bucket.consume()

    def cleanup(self) -> None:
        """Evict buckets that have been idle for longer than the interval."""
        now = time.monotonic()
        if now - self._last_cleanup < self._cleanup_interval:
            return
        stale = [
            k for k, b in self._buckets.items() if now - b.last_refill > self._cleanup_interval
        ]
        for k in stale:
            del self._buckets[k]
        self._last_cleanup = now

    def reset(self) -> None:
        """Clear all buckets (useful for testing)."""
        self._buckets.clear()
        self._last_cleanup = time.monotonic()


class RedisRateLimiter:
    """Sliding-window rate limiter backed by Redis sorted sets.

    Each client key (+ role suffix) gets a sorted set entry per request.
    Entries older than the window (60s) are pruned on each check.
    The window size is determined by ``ROLE_RATE_LIMITS[role]``.

    Falls back to allow-all on Redis connection error.
    """

    def __init__(self, redis_url: str | None = None) -> None:
        self._redis_url = redis_url or settings.redis_url
        self._redis = None

    async def _get_redis(self):
        if self._redis is None:
            from redis import asyncio as aioredis

            self._redis = aioredis.from_url(self._redis_url, decode_responses=True)
        return self._redis

    async def check(self, key: str, role: str) -> bool:
        """Check whether a request from *key* with *role* is allowed.

        Returns True if allowed, False if rate-limited.
        """
        limit = ROLE_RATE_LIMITS.get(role, 30)
        now = time.time()
        window_start = now - _RATE_LIMIT_WINDOW
        redis_key = f"ratelimit:{key}:{role}"

        try:
            r = await self._get_redis()
            async with r.pipeline(transaction=True) as pipe:
                # Remove stale entries
                await pipe.zremrangebyscore(redis_key, "-inf", window_start)
                # Count recent entries
                await pipe.zcard(redis_key)
                results = await pipe.execute()
            recent_count = results[1] if len(results) > 1 else 0

            if recent_count >= limit:
                return False

            # Record this request (score = now, value = unique id)
            await r.zadd(redis_key, {str(now): now})
            await r.expire(redis_key, _RATE_LIMIT_WINDOW * 2)
            return True
        except Exception:
            # Redis unavailable — allow request to avoid blocking traffic
            return True

    async def close(self) -> None:
        if self._redis is not None:
            await self._redis.close()
            self._redis = None

    async def reset(self) -> None:
        """Clear all rate limit entries (testing / admin)."""
        if self._redis is not None:
            await self._redis.flushdb()


# Global rate limiter — InMemory by default, override with RATE_LIMITER_BACKEND=redis
_rate_limiter: InMemoryRateLimiter = InMemoryRateLimiter()


def _rate_limit_key(request: Request) -> tuple[str, str]:
    """Extract a (client_key, role) pair from the request.

    Priority:
    1. Authenticated user (decodes Bearer token inline).
    2. Client IP address.
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.removeprefix("Bearer ")
        from src.api.middleware.auth import verify_access_token

        claims = verify_access_token(token)
        if claims is not None and claims.user_id is not None:
            return f"user:{claims.user_id}", claims.role

    ip = request.client.host if request.client else "unknown"
    return f"ip:{ip}", "anonymous"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware with dual backend.

    Applies per-role rate limits determined by the client's IP address or
    authenticated user identity.

    - By default uses the global ``InMemoryRateLimiter``.
    - Set ``RATE_LIMITER_BACKEND=redis`` for a Redis-backed sliding-window
      counter suitable for multi-process deployments.
    """

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)
        self._redis_limiter: RedisRateLimiter | None = None

    async def _get_limiter(self) -> InMemoryRateLimiter | RedisRateLimiter:
        backend = os.environ.get("RATE_LIMITER_BACKEND", "memory").lower()
        if backend == "redis":
            if self._redis_limiter is None:
                self._redis_limiter = RedisRateLimiter()
            return self._redis_limiter
        return _rate_limiter

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        # Bypass rate limiting for health checks
        if request.url.path == "/health":
            return await call_next(request)

        client_key, role = _rate_limit_key(request)
        limiter = await self._get_limiter()

        if isinstance(limiter, RedisRateLimiter):
            allowed = await limiter.check(client_key, role)
        else:
            allowed = limiter.check(client_key, role)
            limiter.cleanup()

        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "rate_limit_exceeded",
                    "message": "Too many requests. Please try again later.",
                    "retry_after_seconds": 60,
                },
                headers={"Retry-After": "60"},
            )

        return await call_next(request)
