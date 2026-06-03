"""Token-bucket rate limiting middleware for Hi-Hired.

Provides:
- RateLimitMiddleware: Starlette BaseHTTPMiddleware that applies per-role
  rate limits using an in-memory token bucket algorithm.
- Production path: replace InMemoryRateLimiter with a Redis-backed
  implementation using the configured redis_url.

Per-role rate limits (requests per minute):
  anonymous:  30
  jobseeker: 100
  employer:   50
  admin:     200
"""

from __future__ import annotations

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


# Global rate limiter singleton
_rate_limiter = InMemoryRateLimiter()


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
    """Token-bucket rate limiting middleware.

    Applies per-role rate limits determined by the client's IP address or
    authenticated user identity.  The /health endpoint is excluded.

    Production deployment should replace :class:`InMemoryRateLimiter` with
    a Redis-backed implementation using ``settings.redis_url``.
    """

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        # Bypass rate limiting for health checks
        if request.url.path == "/health":
            return await call_next(request)

        client_key, role = _rate_limit_key(request)

        if not _rate_limiter.check(client_key, role):
            return JSONResponse(
                status_code=429,
                content={
                    "error": "rate_limit_exceeded",
                    "message": "Too many requests. Please try again later.",
                    "retry_after_seconds": 60,
                },
                headers={"Retry-After": "60"},
            )

        # Periodic stale-bucket eviction
        _rate_limiter.cleanup()

        return await call_next(request)
