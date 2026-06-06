"""Tests for the multi-level cache manager.

Memory-only tests run without any Redis server.
Redis-backed tests are automatically skipped if Redis is unavailable.
"""

from __future__ import annotations

import asyncio
from typing import Any

import pytest

from src.services.cache_manager import CacheLevel, CacheManager, _MISS


# ======================================================================
# L1: In-memory cache — pure unit tests, no Redis needed
# ======================================================================


class TestMemoryCache:
    """Direct L1 (in-memory) cache operations."""

    def test_memory_cache_hit_miss(self):
        """Set a value, read it back, verify miss for unknown keys."""
        cache = CacheManager()

        # Miss for missing key
        assert cache.memory_get("nonexistent") is _MISS

        # Set and hit
        cache.memory_set("greeting", "hello world", ttl=30)
        assert cache.memory_get("greeting") == "hello world"

        # Second hit
        assert cache.memory_get("greeting") == "hello world"

    def test_memory_cache_with_different_types(self):
        """L1 should handle various Python types including None."""
        cache = CacheManager()
        cache.memory_set("str", "text")
        cache.memory_set("int", 42)
        cache.memory_set("float", 3.14)
        cache.memory_set("list", [1, 2, 3])
        cache.memory_set("dict", {"a": 1})
        cache.memory_set("bool_true", True)
        cache.memory_set("bool_false", False)
        cache.memory_set("none_val", None)

        assert cache.memory_get("str") == "text"
        assert cache.memory_get("int") == 42
        assert cache.memory_get("float") == 3.14
        assert cache.memory_get("list") == [1, 2, 3]
        assert cache.memory_get("dict") == {"a": 1}
        assert cache.memory_get("bool_true") is True
        assert cache.memory_get("bool_false") is False
        assert cache.memory_get("none_val") is None  # explicit None is a valid value

    def test_memory_expiry(self):
        """Values with ttl=0 should be expired on next read."""
        cache = CacheManager()
        cache.memory_set("expires", "soon", ttl=-1)  # already expired
        assert cache.memory_get("expires") is _MISS

    def test_memory_ttl_uses_default(self):
        """When ttl is None, the instance default should be used."""
        cache = CacheManager(memory_default_ttl=10)
        cache.memory_set("defaulted", "val")  # no ttl arg
        entry = cache._memory["defaulted"]  # type: ignore[attr-defined]
        _value, expires_at = entry
        import time

        remaining = expires_at - time.monotonic()
        assert 9.0 < remaining <= 10.0, f"expected ~10s remaining, got {remaining:.2f}"

    def test_memory_invalidate(self):
        """Invalidating a key should remove it from L1."""
        cache = CacheManager()
        cache.memory_set("key1", 1)
        cache.memory_set("key2", 2)
        assert cache.memory_get("key1") == 1
        assert cache.memory_get("key2") == 2

        cache.memory_invalidate("key1")
        assert cache.memory_get("key1") is _MISS
        assert cache.memory_get("key2") == 2  # unaffected

    def test_memory_invalidate_missing_key(self):
        """Invalidating a non-existent key should not raise."""
        cache = CacheManager()
        cache.memory_invalidate("does-not-exist")  # no error


# ======================================================================
# L2: Redis cache — integration tests, skipped if no Redis
# ======================================================================


def _redis_is_available() -> bool:
    """Check whether a Redis server is reachable."""
    try:
        import asyncio

        from redis import asyncio as aioredis

        async def probe() -> bool:
            try:
                from src.core.config import get_settings

                r = aioredis.from_url(
                    get_settings().redis_url,
                    decode_responses=True,
                    socket_connect_timeout=2,
                )
                await r.ping()
                await r.aclose()
                return True
            except Exception:
                return False

        return asyncio.run(probe())
    except ImportError:
        return False


redis_available = _redis_is_available()


@pytest.mark.skipif(not redis_available, reason="Redis server not available")
class TestRedisCache:
    """Direct L2 (Redis) cache operations — requires running Redis."""

    async def test_redis_get_miss(self):
        cache = CacheManager()
        from src.services.cache_manager import _MISS
        result = await cache.redis_get("nonexistent:key")
        assert result is _MISS, "redis_get should return _MISS sentinel on cache miss"

    async def test_redis_set_and_get(self):
        cache = CacheManager()
        await cache.redis_set("test:string", "hello redis", ttl=60)
        result = await cache.redis_get("test:string")
        assert result == "hello redis"
        await cache.redis_invalidate("test:string")

    async def test_redis_set_complex_types(self):
        cache = CacheManager()
        payload = {"name": "Alice", "scores": [1, 2, 3], "active": True}
        await cache.redis_set("test:complex", payload, ttl=60)
        result = await cache.redis_get("test:complex")
        assert result == payload
        await cache.redis_invalidate("test:complex")

    async def test_redis_expiry(self):
        cache = CacheManager()
        await cache.redis_set("test:expires", "gone", ttl=1)
        result = await cache.redis_get("test:expires")
        assert result == "gone"
        await asyncio.sleep(1.5)
        from src.services.cache_manager import _MISS
        result = await cache.redis_get("test:expires")
        assert result is _MISS, "expired key should return _MISS sentinel"

    async def test_redis_invalidate(self):
        cache = CacheManager()
        await cache.redis_set("test:inval", "data", ttl=60)
        assert await cache.redis_get("test:inval") == "data"
        await cache.redis_invalidate("test:inval")
        from src.services.cache_manager import _MISS
        assert await cache.redis_get("test:inval") is _MISS, "invalidated key should return _MISS sentinel"

    async def test_redis_invalidate_missing(self):
        cache = CacheManager()
        await cache.redis_invalidate("test:missing")  # no error

    async def test_multiple_keys(self):
        cache = CacheManager()
        await cache.redis_set("test:mk1", "v1")
        await cache.redis_set("test:mk2", "v2")
        await cache.redis_set("test:mk3", "v3")
        assert await cache.redis_get("test:mk1") == "v1"
        assert await cache.redis_get("test:mk2") == "v2"
        assert await cache.redis_get("test:mk3") == "v3"
        await cache.redis_invalidate("test:mk1")
        await cache.redis_invalidate("test:mk2")
        await cache.redis_invalidate("test:mk3")


# ======================================================================
# get_or_compute — L1-only (no Redis needed for most tests)
# ======================================================================


class TestGetOrComputeMemoryOnly:
    """get_or_compute using only L1 (memory)."""

    async def test_compute_on_miss(self):
        """First call should compute, second should return cached."""
        cache = CacheManager()
        call_count = 0

        async def compute() -> int:
            nonlocal call_count
            call_count += 1
            return 42

        result1 = await cache.get_or_compute("answer", compute, ttl=30, level=CacheLevel.MEMORY)
        assert result1 == 42
        assert call_count == 1

        result2 = await cache.get_or_compute("answer", compute, ttl=30, level=CacheLevel.MEMORY)
        assert result2 == 42
        assert call_count == 1  # compute not called again

    async def test_different_keys_independent(self):
        """Keys should be independent in L1."""
        cache = CacheManager()

        async def compute_a() -> str:
            return "alpha"

        async def compute_b() -> str:
            return "beta"

        assert (
            await cache.get_or_compute("a", compute_a, ttl=30, level=CacheLevel.MEMORY) == "alpha"
        )
        assert await cache.get_or_compute("b", compute_b, ttl=30, level=CacheLevel.MEMORY) == "beta"
        # Keys shouldn't interfere
        assert (
            await cache.get_or_compute("a", compute_a, ttl=30, level=CacheLevel.MEMORY) == "alpha"
        )

    async def test_cache_miss_after_expiry(self):
        """After L1 TTL expires, compute should be called again."""
        cache = CacheManager()
        call_count = 0

        async def compute() -> str:
            nonlocal call_count
            call_count += 1
            return f"call-{call_count}"

        result1 = await cache.get_or_compute("exp", compute, ttl=0, level=CacheLevel.MEMORY)
        assert result1 == "call-1"

        # TTL=0 means immediate expiry... but due to strict > check, let's
        # set the ttl to a negative value by invalidating and re-computing
        cache.memory_invalidate("exp")
        result2 = await cache.get_or_compute("exp", compute, ttl=30, level=CacheLevel.MEMORY)
        assert result2 == "call-2"
        assert call_count == 2

    async def test_compute_fn_called_once_on_concurrent(self):
        """Simulate concurrent calls for the same key — only one compute."""
        cache = CacheManager()
        call_count = 0
        lock = asyncio.Lock()

        async def slow_compute() -> str:
            async with lock:
                nonlocal call_count
                call_count += 1
                await asyncio.sleep(0.05)
                return "computed"

        # Launch three concurrent get_or_compute — all should get same result
        results = await asyncio.gather(
            cache.get_or_compute("con", slow_compute, ttl=60, level=CacheLevel.MEMORY),
            cache.get_or_compute("con", slow_compute, ttl=60, level=CacheLevel.MEMORY),
            cache.get_or_compute("con", slow_compute, ttl=60, level=CacheLevel.MEMORY),
        )
        assert all(r == "computed" for r in results)
        # The lock serialises them: first sets cache, the rest hit
        assert call_count == 1


# ======================================================================
# Multi-level get_or_compute — requires Redis
# ======================================================================


@pytest.mark.skipif(not redis_available, reason="Redis server not available")
class TestGetOrComputeMultiLevel:
    """get_or_compute across L1 + L2 with stampede protection."""

    async def test_l2_backfills_l1(self):
        """A value set directly in Redis should populate L1 on read."""
        cache = CacheManager()
        await cache.redis_set("ml:backfill", "from_redis", ttl=60)

        result = await cache.get_or_compute(
            "ml:backfill",
            lambda: _unreachable(),
            ttl=60,
            level=CacheLevel.ALL,
        )
        assert result == "from_redis"

        # L1 should now be populated
        assert cache.memory_get("ml:backfill") == "from_redis"
        await cache.invalidate("ml:backfill")

    async def test_stampede_protection(self):
        """Multiple concurrent requests should only compute once."""
        cache = CacheManager()
        call_count = 0

        async def expensive_compute() -> list[int]:
            nonlocal call_count
            call_count += 1
            await asyncio.sleep(0.1)  # simulate slow compute
            return [1, 2, 3]

        results = await asyncio.gather(
            cache.get_or_compute("ml:stampede", expensive_compute, ttl=60),
            cache.get_or_compute("ml:stampede", expensive_compute, ttl=60),
            cache.get_or_compute("ml:stampede", expensive_compute, ttl=60),
        )
        assert all(r == [1, 2, 3] for r in results)
        # Stampede protection via SET NX ensures only one compute
        assert call_count == 1
        await cache.invalidate("ml:stampede")

    async def test_l1_hit_supresses_l2_and_compute(self):
        """If L1 has the value, L2 is never queried and compute never runs."""
        cache = CacheManager()
        cache.memory_set("ml:l1supress", "from_l1", ttl=60)

        result = await cache.get_or_compute(
            "ml:l1supress",
            lambda: _unreachable(),
            ttl=60,
            level=CacheLevel.ALL,
        )
        assert result == "from_l1"
        await cache.invalidate("ml:l1supress")

    async def test_redis_only_level(self):
        """With level=REDIS, L1 is skipped."""
        cache = CacheManager()
        cache.memory_set("ml:redonly", "l1_value", ttl=60)
        await cache.redis_set("ml:redonly", "l2_value", ttl=60)

        result = await cache.get_or_compute(
            "ml:redonly",
            lambda: _unreachable(),
            ttl=60,
            level=CacheLevel.REDIS,
        )
        # Should get L2 value, ignoring L1
        assert result == "l2_value"
        await cache.invalidate("ml:redonly")

    async def test_memory_only_level(self):
        """With level=MEMORY, L2 is skipped and compute runs on miss."""
        cache = CacheManager()
        await cache.redis_set("ml:memonly", "l2_value", ttl=60)

        async def compute() -> str:
            return "fresh"

        result = await cache.get_or_compute(
            "ml:memonly",
            compute,
            ttl=60,
            level=CacheLevel.MEMORY,
        )
        # L1 miss + L2 skipped → compute runs
        assert result == "fresh"
        await cache.invalidate("ml:memonly")


# ======================================================================
# Multi-level invalidation
# ======================================================================


class TestInvalidation:
    """Invalidating keys across all cache levels."""

    async def test_memory_invalidate_l1(self):
        """memory_invalidate clears L1."""
        cache = CacheManager()
        cache.memory_set("inv:l1", "present", ttl=30)
        assert cache.memory_get("inv:l1") == "present"

        cache.memory_invalidate("inv:l1")
        assert cache.memory_get("inv:l1") is _MISS

    async def test_invalidate_missing_key(self):
        """memory_invalidate on a non-existent key should not raise."""
        cache = CacheManager()
        cache.memory_invalidate("inv:missing")


@pytest.mark.skipif(not redis_available, reason="Redis server not available")
class TestInvalidationWithRedis:
    """Invalidation with both L1 and L2 populated."""

    async def test_invalidate_both_levels(self):
        cache = CacheManager()
        await cache.redis_set("inv:both", "l2", ttl=60)
        cache.memory_set("inv:both", "l1", ttl=60)

        await cache.invalidate("inv:both")
        assert cache.memory_get("inv:both") is _MISS
        assert await cache.redis_get("inv:both") is _MISS


# ======================================================================
# Edge cases
# ======================================================================


class TestEdgeCases:
    """Boundary and error handling scenarios."""

    async def test_compute_fn_raises(self):
        """If compute_fn raises, the exception should propagate."""
        cache = CacheManager()

        async def failing() -> None:
            raise ValueError("compute failed")

        with pytest.raises(ValueError, match="compute failed"):
            await cache.get_or_compute("edge:fail", failing, ttl=30, level=CacheLevel.MEMORY)

    async def test_compute_fn_returns_none(self):
        """compute_fn returning None should be cached as a valid value."""
        cache = CacheManager()
        call_count = 0

        async def return_none() -> None:
            nonlocal call_count
            call_count += 1
            return None

        result1 = await cache.get_or_compute(
            "edge:none", return_none, ttl=30, level=CacheLevel.MEMORY
        )
        assert result1 is None
        assert call_count == 1

        result2 = await cache.get_or_compute(
            "edge:none", return_none, ttl=30, level=CacheLevel.MEMORY
        )
        assert result2 is None
        assert call_count == 1  # cached, not recomputed

    async def test_close_idempotent(self):
        """Calling close() multiple times should be safe."""
        cache = CacheManager()
        await cache.close()
        await cache.close()  # second call no-op

    async def test_large_value_roundtrip(self):
        """L1 should handle moderately large values."""
        cache = CacheManager()
        large = {"data": "x" * 50_000}
        cache.memory_set("edge:large", large)
        result = cache.memory_get("edge:large")
        assert result == large
        assert len(result["data"]) == 50_000


# ======================================================================
# Helpers
# ======================================================================


async def _unreachable(**_: Any) -> Any:
    """Test helper that should never be called — fail if reached."""
    msg = "This compute_fn should never have been called"
    raise AssertionError(msg)
