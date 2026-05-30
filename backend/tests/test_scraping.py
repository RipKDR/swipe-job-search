"""Tests for anti-bot scraping session and scraper health monitor.

Covers:
  - ProxyPool: health tracking and proportional proxy selection.
  - ScraperHealthMonitor: sliding-window rates, auto-quarantine.
  - ScrapingSession: header generation, backoff delay computation, proxy
    integration (actual HTTP requests are skipped to avoid hitting real
    servers).
"""

from __future__ import annotations

import time
from unittest.mock import patch

from src.services.scraper_health import ScraperHealthMonitor
from src.services.scraping_session import (
    USER_AGENTS,
    ProxyPool,
    ScrapingSession,
)


# ── Test helpers ──────────────────────────────────────────────────────


def _make_proxy(url: str = "http://p1.example.com:8080") -> dict[str, str]:
    return {"url": url}


# ── ProxyPool tests ───────────────────────────────────────────────────


class TestProxyPool:
    def test_get_proxy_returns_one(self):
        pool = ProxyPool(proxies=[_make_proxy("http://a:1"), _make_proxy("http://b:2")])
        proxy = pool.get_proxy()
        assert proxy is not None
        assert proxy["url"] in ("http://a:1", "http://b:2")

    def test_get_proxy_returns_none_on_empty(self):
        pool = ProxyPool(proxies=[])
        assert pool.get_proxy() is None

    def test_get_proxy_returns_none_on_none_init(self):
        pool = ProxyPool()
        assert pool.get_proxy() is None

    def test_mark_unhealthy_removes_from_pool(self):
        pool = ProxyPool(proxies=[_make_proxy("http://a:1"), _make_proxy("http://b:2")])
        pool.mark_unhealthy("http://a:1")
        # Only 'b' should remain healthy.
        for _ in range(20):
            proxy = pool.get_proxy()
            assert proxy is not None
            assert proxy["url"] == "http://b:2"

    def test_all_unhealthy_returns_none(self):
        pool = ProxyPool(proxies=[_make_proxy("http://a:1"), _make_proxy("http://b:2")])
        pool.mark_unhealthy("http://a:1")
        pool.mark_unhealthy("http://b:2")
        assert pool.get_proxy() is None

    def test_mark_healthy_restores_proxy(self):
        pool = ProxyPool(proxies=[_make_proxy("http://a:1"), _make_proxy("http://b:2")])
        pool.mark_unhealthy("http://a:1")
        pool.mark_healthy("http://a:1")
        found_a = False
        for _ in range(40):
            proxy = pool.get_proxy()
            assert proxy is not None
            if proxy["url"] == "http://a:1":
                found_a = True
                break
        assert found_a

    def test_add_proxy_increases_pool(self):
        pool = ProxyPool()
        assert pool.total_count == 0
        pool.add_proxy(_make_proxy("http://x:1"))
        assert pool.total_count == 1
        assert pool.get_proxy() is not None

    def test_healthy_count_property(self):
        pool = ProxyPool(
            proxies=[
                _make_proxy("http://a:1"),
                _make_proxy("http://b:2"),
                _make_proxy("http://c:3"),
            ]
        )
        assert pool.healthy_count == 3
        pool.mark_unhealthy("http://a:1")
        assert pool.healthy_count == 2
        pool.mark_unhealthy("http://b:2")
        assert pool.healthy_count == 1

    def test_all_proxies_returns_copy(self):
        pool = ProxyPool(proxies=[_make_proxy("http://a:1")])
        proxies = pool.all_proxies
        assert len(proxies) == 1
        assert proxies[0]["url"] == "http://a:1"
        # Mutating the returned list must not affect the pool.
        proxies.clear()
        assert pool.total_count == 1


# ── ScraperHealthMonitor tests ────────────────────────────────────────


class TestScraperHealth:
    def test_initial_health_is_good(self):
        monitor = ScraperHealthMonitor()
        assert monitor.success_rate("seek") == 1.0
        assert not monitor.is_quarantined("seek")

    def test_records_success(self):
        monitor = ScraperHealthMonitor()
        monitor.record_attempt("seek", success=True)
        rate = monitor.success_rate("seek")
        assert rate == 1.0
        assert monitor.is_quarantined("seek") is False

    def test_records_failure_lowers_rate(self):
        monitor = ScraperHealthMonitor()
        monitor.record_attempt("seek", success=True)
        monitor.record_attempt("seek", success=False)
        assert monitor.success_rate("seek") == 0.5

    def test_quarantine_after_consecutive_failures(self):
        monitor = ScraperHealthMonitor(max_consecutive_failures=3)
        for _ in range(3):
            monitor.record_attempt("seek", success=False)
        assert monitor.is_quarantined("seek") is True

    def test_not_quarantined_below_threshold(self):
        monitor = ScraperHealthMonitor(max_consecutive_failures=5)
        for _ in range(4):
            monitor.record_attempt("seek", success=False)
        assert monitor.is_quarantined("seek") is False

    def test_success_resets_consecutive_failures(self):
        monitor = ScraperHealthMonitor(max_consecutive_failures=3)
        monitor.record_attempt("seek", success=False)
        monitor.record_attempt("seek", success=False)
        monitor.record_attempt("seek", success=True)  # resets
        monitor.record_attempt("seek", success=False)
        monitor.record_attempt("seek", success=False)
        # Only 2 consecutive failures after the success -> not quarantined.
        assert monitor.is_quarantined("seek") is False
        monitor.record_attempt("seek", success=False)
        # Now 3 consecutive failures.
        assert monitor.is_quarantined("seek") is True

    def test_success_lifts_quarantine(self):
        monitor = ScraperHealthMonitor(max_consecutive_failures=2)
        monitor.record_attempt("seek", success=False)
        monitor.record_attempt("seek", success=False)
        assert monitor.is_quarantined("seek") is True
        # A success should lift quarantine.
        monitor.record_attempt("seek", success=True)
        assert monitor.is_quarantined("seek") is False

    def test_success_rate_sliding_window(self):
        monitor = ScraperHealthMonitor(window_minutes=60)
        monitor.record_attempt("seek", success=True)
        monitor.record_attempt("seek", success=True)
        monitor.record_attempt("seek", success=False)
        assert monitor.success_rate("seek") == 2 / 3

    def test_success_rate_outside_window_is_one(self):
        """Sources with no data in the window report 1.0."""
        monitor = ScraperHealthMonitor()
        assert monitor.success_rate("nonexistent") == 1.0
        assert not monitor.is_quarantined("nonexistent")

    def test_get_health_summary(self):
        monitor = ScraperHealthMonitor(max_consecutive_failures=2)
        monitor.record_attempt("seek", success=True)
        monitor.record_attempt("seek", success=False)
        monitor.record_attempt("seek", success=False)
        # Two consecutive failures triggers quarantine.
        summary = monitor.get_health_summary()
        assert "seek" in summary
        s = summary["seek"]
        assert s["is_quarantined"] is True
        assert s["total_attempts"] == 3
        assert s["consecutive_failures"] == 2
        assert s["success_rate"] == 1 / 3

    def test_get_health_summary_empty(self):
        monitor = ScraperHealthMonitor()
        assert monitor.get_health_summary() == {}

    def test_clear_source_removes_data(self):
        monitor = ScraperHealthMonitor(max_consecutive_failures=2)
        monitor.record_attempt("seek", success=False)
        monitor.record_attempt("seek", success=False)
        assert monitor.is_quarantined("seek") is True
        monitor.clear_source("seek")
        assert not monitor.is_quarantined("seek")
        assert monitor.success_rate("seek") == 1.0
        assert "seek" not in monitor.get_health_summary()

    def test_independent_sources(self):
        monitor = ScraperHealthMonitor(max_consecutive_failures=3)
        monitor.record_attempt("seek", success=False)
        monitor.record_attempt("seek", success=False)
        monitor.record_attempt("linkedin", success=True)
        # seek has 2 consecutive failures, not yet quarantined.
        assert not monitor.is_quarantined("seek")
        assert not monitor.is_quarantined("linkedin")
        assert monitor.success_rate("linkedin") == 1.0

    def test_sliding_window_prunes_old_entries(self):
        """With a 1-minute window, an entry recorded at t=0 should be
        pruned when queried at t=120 (2 minutes later)."""
        monitor = ScraperHealthMonitor(window_minutes=1)  # 1 minute window
        with patch.object(time, "time", return_value=0.0):
            monitor.record_attempt("seek", success=False)
            assert monitor.success_rate("seek") == 0.0

        # Advance time by 120 seconds — well past the 60-second window.
        with patch.object(time, "time", return_value=120.0):
            rate = monitor.success_rate("seek")
            assert rate == 1.0  # no data in window → 1.0

    def test_mixed_sources_in_summary(self):
        monitor = ScraperHealthMonitor()
        monitor.record_attempt("seek", success=True)
        monitor.record_attempt("indeed", success=False)
        summary = monitor.get_health_summary()
        assert set(summary.keys()) == {"seek", "indeed"}


# ── ScrapingSession unit tests (no HTTP) ──────────────────────────────


class TestScrapingSession:
    def test_random_headers_has_user_agent(self):
        session = ScrapingSession()
        headers = session._random_headers()
        assert "User-Agent" in headers
        assert headers["User-Agent"] in USER_AGENTS
        assert "Accept-Language" in headers
        assert "Accept" in headers

    def test_random_headers_variety(self):
        """Ensure that multiple calls produce different User-Agents
        over a reasonable number of samples."""
        session = ScrapingSession()
        uas = {session._random_headers()["User-Agent"] for _ in range(50)}
        # With at least 10 agents in the pool we should see at least 2
        # distinct values in 50 picks (statistically near-certain).
        assert len(uas) >= 2

    def test_compute_delay_increases_with_attempt(self):
        session = ScrapingSession(base_delay=1.0, max_delay=60.0)
        d0 = session._compute_delay(0)
        d1 = session._compute_delay(1)
        d2 = session._compute_delay(2)
        # Each step should be larger than the previous (at minimum
        # because the base delay doubles, even with jitter).
        assert d0 < d1 < d2

    def test_compute_delay_respects_max(self):
        session = ScrapingSession(base_delay=1.0, max_delay=10.0)
        for attempt in range(0, 10):
            delay = session._compute_delay(attempt)
            assert delay <= 15.0  # max_delay + max jitter (0.5 * max_delay)

    def test_compute_delay_has_jitter(self):
        """Jitter makes the delay non-deterministic for the same attempt."""
        session = ScrapingSession(base_delay=1.0, max_delay=60.0)
        delays = [session._compute_delay(3) for _ in range(50)]
        # The jitter term is uniform(0, 0.5 * delay), so 50 samples should
        # contain both near-min and larger values.
        min_d = min(delays)
        max_d = max(delays)
        assert max_d > min_d  # jitter is working

    def test_get_proxy_no_pool_returns_none(self):
        session = ScrapingSession()
        assert session._get_proxy() is None

    def test_get_proxy_with_pool(self):
        pool = ProxyPool(proxies=[_make_proxy("http://p1:8080")])
        session = ScrapingSession(proxy_pool=pool)
        proxy = session._get_proxy()
        assert proxy is not None
        assert proxy["url"] == "http://p1:8080"

    def test_get_client_creates_async_client(self):
        session = ScrapingSession()
        client = session._get_client()
        assert client is not None
        # The same client should be returned on second call.
        assert session._get_client() is client
        # Clean up.
        import asyncio

        asyncio.run(session.close())

    def test_mark_proxy_unhealthy_no_pool(self):
        session = ScrapingSession()
        # Should not raise.
        session._mark_proxy_unhealthy("http://p1:8080")

    def test_mark_proxy_unhealthy_none_url(self):
        pool = ProxyPool(proxies=[_make_proxy("http://p1:8080")])
        session = ScrapingSession(proxy_pool=pool)
        # Should not raise.
        session._mark_proxy_unhealthy(None)
        assert pool.healthy_count == 1

    def test_mark_proxy_unhealthy_with_pool(self):
        pool = ProxyPool(proxies=[_make_proxy("http://p1:8080")])
        session = ScrapingSession(proxy_pool=pool)
        session._mark_proxy_unhealthy("http://p1:8080")
        assert pool.healthy_count == 0

    def test_user_agents_list_length(self):
        assert len(USER_AGENTS) >= 10, f"Expected at least 10 USER_AGENTS, got {len(USER_AGENTS)}"

    def test_all_user_agents_are_strings(self):
        for ua in USER_AGENTS:
            assert isinstance(ua, str)
            assert ua.startswith("Mozilla/")
