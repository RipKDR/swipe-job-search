"""Hi-Hired Backend - Multi-level cache manager with stampede protection.

Provides a two-level cache (L1: in-memory, L2: Redis) with a generic
get_or_compute interface that prevents cache stampede using a distributed
Redis SET NX lock.

Usage:
    manager = CacheManager()
    result = await manager.get_or_compute(
        "my:key",
        lambda: fetch_expensive_data(),
        ttl=60,
    )
"""

from __future__ import annotations

import asyncio
import json
import time
from collections.abc import Awaitable, Callable
from enum import Enum
from typing import Any, TypeVar

import structlog
from redis import asyncio as aioredis

from src.core.config import get_settings

logger = structlog.get_logger()

T = TypeVar("T")
CacheComputeFn = Callable[[], Awaitable[T]]

# Sentinel used to distinguish "cache miss" from a cached None value.
# This is an object() rather than None so that ``memory_get`` and
# ``redis_get`` can correctly report that a key simply isn't stored.
_MISS: Any = object()


class CacheLevel(Enum):
    """Cache level selector for get_or_compute."""

    MEMORY = "memory"  # L1 only
    REDIS = "redis"  # L2 only
    ALL = "all"  # L1 → L2 → compute (default)


class CacheManager:
    """Multi-level cache manager with stampede protection.

    L1 (in-memory):
        - Simple dict with per-key expiry timestamps.
        - Per-key async lock prevents in-process stampede.
        - Default TTL: 30 seconds.

    L2 (Redis):
        - Async Redis client with JSON serialization.
        - Shared across processes/machines.
        - Default TTL: 300 seconds.

    Stampede protection:
        - When a key is missing at both levels, the first caller
          acquires a Redis distributed lock (SET NX + EX).
        - Other callers wait with exponential backoff and re-check
          both levels, avoiding redundant computation.
        - Lock auto-releases after ``lock_ttl`` seconds via EX.
    """

    def __init__(
        self,
        redis_url: str | None = None,
        memory_default_ttl: int = 30,
        redis_default_ttl: int = 300,
        lock_ttl: int = 10,
        max_stampede_retries: int = 5,
    ) -> None:
        """
        Args:
            redis_url: Redis connection URL. Defaults to settings.redis_url.
            memory_default_ttl: Default TTL (seconds) for L1 entries.
            redis_default_ttl: Default TTL (seconds) for L2 entries.
            lock_ttl: Distributed lock TTL (seconds) — max time a compute_fn
                may run before another process steals the lock.
            max_stampede_retries: How many times a blocked caller retries
                before falling through to a direct (unprotected) compute.
        """
        self._redis_url = redis_url or get_settings().redis_url
        self._memory_default_ttl = memory_default_ttl
        self._redis_default_ttl = redis_default_ttl
        self._lock_ttl = lock_ttl
        self._max_stampede_retries = max_stampede_retries

        # L1 store: {key: (value, monotonic_expires_at)}
        self._memory: dict[str, tuple[Any, float]] = {}

        # Per-key in-process async lock (prevents L1-only stampede)
        self._l1_locks: dict[str, asyncio.Lock] = {}

        # Lazy Redis client (connection pool managed internally)
        self._redis: aioredis.Redis | None = None

    # ------------------------------------------------------------------
    # Redis connection management
    # ------------------------------------------------------------------

    async def _get_redis(self) -> aioredis.Redis:
        """Lazy-initialise and return the shared Redis client."""
        if self._redis is None:
            self._redis = aioredis.from_url(
                self._redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
            )
        return self._redis

    async def close(self) -> None:
        """Close the Redis connection and release resources."""
        if self._redis is not None:
            await self._redis.aclose()
            self._redis = None

    # ------------------------------------------------------------------
    # L1: In-memory cache
    # ------------------------------------------------------------------

    def memory_get(self, key: str) -> Any:
        """Retrieve from L1 in-memory cache.

        Returns the cached value (which may be ``None``) or the sentinel
        ``_MISS`` if the key is missing or expired (lazy eviction on read).
        """
        entry = self._memory.get(key)
        if entry is None:
            return _MISS
        value, expires_at = entry
        if time.monotonic() > expires_at:
            del self._memory[key]
            return _MISS
        return value

    def memory_set(self, key: str, value: Any, ttl: int | None = None) -> None:
        """Store *value* in L1 in-memory cache with *ttl* seconds expiry.

        When *ttl* is ``None`` the instance-level ``memory_default_ttl``
        is used.
        """
        ttl = ttl if ttl is not None else self._memory_default_ttl
        self._memory[key] = (value, time.monotonic() + ttl)

    def memory_invalidate(self, key: str) -> None:
        """Remove *key* from L1 in-memory cache."""
        self._memory.pop(key, None)

    # ------------------------------------------------------------------
    # L2: Redis cache
    # ------------------------------------------------------------------

    async def redis_get(self, key: str) -> Any:
        """Retrieve from L2 Redis cache.

        Returns the deserialized value (which may be ``None``) or
        ``_MISS`` on miss / error.
        Errors are logged and silently treated as cache misses.
        """
        try:
            r = await self._get_redis()
            exists = await r.exists(key)
            if not exists:
                return _MISS
            data = await r.get(key)
            # ``data`` is the raw JSON string.  ``json.loads("null")``
            # returns Python None, which is a valid cached value.
            return json.loads(data)
        except Exception:
            logger.exception("cache.redis_get_error", key=key)
            return _MISS

    async def redis_set(self, key: str, value: Any, ttl: int | None = None) -> None:
        """Store *value* in L2 Redis cache with *ttl* seconds expiry.

        Values are JSON-serialized.  Non-serializable types are converted
        via ``str()`` (e.g. ``datetime``, ``UUID``).  When *ttl* is
        ``None`` the instance-level ``redis_default_ttl`` is used.
        Errors are logged and swallowed.
        """
        ttl = ttl if ttl is not None else self._redis_default_ttl
        try:
            r = await self._get_redis()
            await r.setex(key, ttl, json.dumps(value, default=str))
        except Exception:
            logger.exception("cache.redis_set_error", key=key)

    async def redis_invalidate(self, key: str) -> None:
        """Remove *key* from L2 Redis cache."""
        try:
            r = await self._get_redis()
            await r.delete(key)
        except Exception:
            logger.exception("cache.redis_invalidate_error", key=key)

    # ------------------------------------------------------------------
    # Stampede-protected get-or-compute
    # ------------------------------------------------------------------

    async def get_or_compute(
        self,
        key: str,
        compute_fn: CacheComputeFn[T],
        ttl: int | None = None,
        level: CacheLevel | str = CacheLevel.ALL,
    ) -> T:
        """Generic get-or-compute with cache stampede protection.

        Flow:
            1. **L1 hit** — return immediately (no I/O).
            2. **L2 hit** — populate L1, return.
            3. **Miss at both levels** — enter stampede-protected compute:

               a. Acquire distributed lock (Redis ``SET NX EX``).
               b. **Lock acquired** → re-check L2 (defence against race
                  where another writer just populated it), then call
                  ``compute_fn``, store at both levels, release lock.
               c. **Lock not acquired** → another process is computing.
                  Back-off and re-check L1/L2 before retrying the lock.
               d. After ``max_stampede_retries``, fall through to a
                  direct unprotected compute (fail-safe).

        Args:
            key: Cache key.
            compute_fn: Async callable that produces the value.
            ttl: TTL in seconds for both levels.
                ``None`` falls back to ``redis_default_ttl``.
            level: Which cache levels to consult before computing.
                ``CacheLevel.ALL`` (default) checks L1 → L2 → compute.
                ``CacheLevel.MEMORY`` only checks L1.
                ``CacheLevel.REDIS`` skips L1 and checks L2 only.

        Returns:
            The cached or freshly computed value.
        """
        if isinstance(level, str):
            level = CacheLevel(level)

        ttl = ttl if ttl is not None else self._redis_default_ttl

        # 1. L1 hit?
        if level in (CacheLevel.MEMORY, CacheLevel.ALL):
            cached = self.memory_get(key)
            if cached is not _MISS:
                logger.debug("cache.l1_hit", key=key)
                return cached

        # 2. L2 hit?
        if level in (CacheLevel.REDIS, CacheLevel.ALL):
            cached = await self.redis_get(key)
            if cached is not _MISS:
                logger.debug("cache.l2_hit", key=key)
                self.memory_set(key, cached, ttl)
                return cached

        # 3. Miss at both levels
        if level in (CacheLevel.REDIS, CacheLevel.ALL):
            # Redis-backed: distributed stampede protection
            return await self._compute_with_stampede(key, compute_fn, ttl)

        # L1-only: in-process stampede protection
        return await self._compute_l1_only(key, compute_fn, ttl)

    async def _compute_l1_only(
        self,
        key: str,
        compute_fn: CacheComputeFn[T],
        ttl: int,
    ) -> T:
        """L1-only compute with an in-process async lock.

        This prevents redundant computation when multiple coroutines
        simultaneously request the same missing key within the same
        process.
        """
        lock = self._l1_locks.get(key)
        if lock is None:
            lock = asyncio.Lock()
            self._l1_locks[key] = lock

        async with lock:
            # Re-check L1 — the other coroutine may have filled it
            cached = self.memory_get(key)
            if cached is not _MISS:
                logger.debug("cache.l1_only_hit_after_lock", key=key)
                return cached

            logger.debug("cache.computing_l1_only", key=key)
            value = await compute_fn()
            self.memory_set(key, value, ttl)
            return value

    async def _compute_with_stampede(
        self,
        key: str,
        compute_fn: CacheComputeFn[T],
        ttl: int,
    ) -> T:
        """Core stampede-protected compute loop with distributed lock."""
        lock_key = f"lock:{key}"

        for attempt in range(self._max_stampede_retries + 1):
            r = await self._get_redis()

            # Atomic SET NX — returns True if we got the lock, None if locked
            acquired = await r.set(lock_key, "1", nx=True, ex=self._lock_ttl)

            if acquired:
                # ── We hold the distributed lock ─────────────────────
                try:
                    # Re-check L2 (race: another writer populated it)
                    exists = await r.exists(key)
                    if exists:
                        data = await r.get(key)
                        value = json.loads(data)
                        self.memory_set(key, value, ttl)
                        logger.debug("cache.stampede_l2_after_lock", key=key)
                        return value

                    # Compute fresh value
                    logger.debug("cache.computing", key=key)
                    value = await compute_fn()

                    # Store at both levels
                    serialized = json.dumps(value, default=str)
                    await r.setex(key, ttl, serialized)
                    self.memory_set(key, value, ttl)

                    return value
                finally:
                    # Release the lock (best-effort, auto-expires via EX)
                    await r.delete(lock_key)

            else:
                # ── Another process is computing — wait and retry ──
                if attempt < self._max_stampede_retries:
                    backoff = 0.1 * (attempt + 1)
                    logger.debug(
                        "cache.stampede_backoff",
                        key=key,
                        attempt=attempt + 1,
                        backoff=backoff,
                    )
                    await asyncio.sleep(backoff)

                    # Re-check both levels before retrying lock
                    l1_val = self.memory_get(key)
                    if l1_val is not _MISS:
                        return l1_val

                    l2_data = await r.get(key)
                    if l2_data is not None:
                        value = json.loads(l2_data)
                        self.memory_set(key, value, ttl)
                        logger.debug("cache.stampede_l2_after_backoff", key=key)
                        return value
                else:
                    # Exhausted retries — fall through to direct compute
                    logger.warning(
                        "cache.stampede_exhausted",
                        key=key,
                        max_retries=self._max_stampede_retries,
                    )
                    value = await compute_fn()
                    serialized = json.dumps(value, default=str)
                    await r.setex(key, ttl, serialized)
                    self.memory_set(key, value, ttl)
                    return value

        # Should never reach here — at least one branch above returns
        raise RuntimeError(f"stampede loop exhausted without result for key={key}")

    # ------------------------------------------------------------------
    # Multi-level invalidation
    # ------------------------------------------------------------------

    async def invalidate(self, key: str) -> None:
        """Purge *key* from every cache level.

        Both L2 errors and L1 removal are logged but do not propagate.
        """
        self.memory_invalidate(key)
        await self.redis_invalidate(key)

    def _clear_memory(self) -> None:
        """Clear all in-memory entries.  Used internally for testing."""
        self._memory.clear()
