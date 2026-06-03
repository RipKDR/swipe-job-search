"""Anti-bot scraping session with User-Agent rotation, proxy pool, and retry logic.

Provides:
  - USER_AGENTS: a module-level list of 10+ realistic browser User-Agent strings.
  - ProxyPool: tracks proxy health (url → bool) and returns random healthy proxies.
  - ScrapingSession: wraps httpx.AsyncClient with header rotation, exponential
    backoff with jitter, proxy failure marking, and human-like delays.
"""

from __future__ import annotations

import asyncio
import random
from typing import Any, Optional

import httpx

# ── Realistic browser User-Agent strings ──────────────────────────────

USER_AGENTS: list[str] = [
    # Chrome 120+ on Windows 11
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    # Chrome 120+ on macOS
    (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    # Chrome 119 on Windows
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/119.0.0.0 Safari/537.36"
    ),
    # Chrome 119 on macOS
    (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/119.0.0.0 Safari/537.36"
    ),
    # Firefox 121 on Windows
    ("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0"),
    # Firefox 121 on macOS
    ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0"),
    # Safari 17.2 on macOS
    (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) "
        "Version/17.2 Safari/605.1.15"
    ),
    # Edge 120 on Windows
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0"
    ),
    # Chrome 120 on Linux
    (
        "Mozilla/5.0 (X11; Linux x86_64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    # Firefox 120 on Linux
    ("Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0"),
    # Chrome 118 on Windows (fallback older)
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/118.0.0.0 Safari/537.36"
    ),
    # Safari 16.6 on macOS (fallback older)
    (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) "
        "Version/16.6 Safari/605.1.15"
    ),
]

ACCEPT_LANGUAGES: list[str] = [
    "en-AU,en;q=0.9",
    "en-US,en;q=0.9",
    "en,en-AU;q=0.9",
    "en-GB,en;q=0.9",
    "en-AU,en-GB;q=0.8,en;q=0.7",
]


# ── Proxy pool ────────────────────────────────────────────────────────


class ProxyPool:
    """Tracks proxy health and returns random healthy proxies."""

    def __init__(self, proxies: list[dict[str, str]] | None = None) -> None:
        """Initialise with an optional list of proxy dicts.

        Each dict must have the form ``{'url': 'http://user:pass@host:port'}``.
        """
        self._proxies: list[dict[str, str]] = list(proxies or [])
        self._health: dict[str, bool] = {p["url"]: True for p in self._proxies}

    def add_proxy(self, proxy: dict[str, str]) -> None:
        """Add a single proxy to the pool."""
        self._proxies.append(proxy)
        self._health[proxy["url"]] = True

    def get_proxy(self) -> Optional[dict[str, str]]:
        """Return a random healthy proxy, or *None* if none are available."""
        healthy = [p for p in self._proxies if self._health.get(p["url"], False)]
        if not healthy:
            return None
        return random.choice(healthy)

    def mark_unhealthy(self, url: str) -> None:
        """Mark a proxy as unhealthy so it won't be returned by *get_proxy*."""
        self._health[url] = False

    def mark_healthy(self, url: str) -> None:
        """Re-mark a previously unhealthy proxy as healthy."""
        self._health[url] = True

    @property
    def healthy_count(self) -> int:
        """Number of proxies currently considered healthy."""
        return sum(1 for v in self._health.values() if v)

    @property
    def total_count(self) -> int:
        """Total number of proxies in the pool."""
        return len(self._proxies)

    @property
    def all_proxies(self) -> list[dict[str, str]]:
        """Return the full list of proxies (read-only view)."""
        return list(self._proxies)


# ── Scraping session ──────────────────────────────────────────────────


class ScrapingSession:
    """Manages an HTTP scraping session with anti-bot counter-measures.

    Features
    --------
    * Random User-Agent and Accept-Language on every request.
    * Configurable proxy pool (optional).
    * Exponential backoff with jitter on 429/503/504 errors.
    * Automatic proxy quarantine on server-side rejection.
    * Human-like random delays between requests.
    """

    def __init__(
        self,
        proxy_pool: ProxyPool | None = None,
        *,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        min_delay_between: float = 2.0,
        max_delay_between: float = 5.0,
        long_pause_min: float = 10.0,
        long_pause_max: float = 20.0,
        retry_statuses: set[int] | None = None,
    ) -> None:
        self._proxy_pool = proxy_pool
        self._base_delay = base_delay
        self._max_delay = max_delay
        self._min_delay_between = min_delay_between
        self._max_delay_between = max_delay_between
        self._long_pause_min = long_pause_min
        self._long_pause_max = long_pause_max
        self._retry_statuses = retry_statuses or {429, 503, 504}
        self._client: httpx.AsyncClient | None = None

    # ── Client management ──────────────────────────────────────────

    def _get_client(self) -> httpx.AsyncClient:
        """Return (or create) a direct (non-proxied) :class:`httpx.AsyncClient`.

        For proxied requests a separate per-request client is created
        inline so that the proxy URL can be set on the client itself
        (httpx expects ``proxy`` at the client level, not per-request).
        """
        if self._client is None or self._client.is_closed:
            limits = httpx.Limits(
                max_keepalive_connections=5,
                max_connections=10,
            )
            timeout = httpx.Timeout(30.0)
            self._client = httpx.AsyncClient(
                limits=limits,
                timeout=timeout,
            )
        return self._client

    async def close(self) -> None:
        """Close the underlying HTTP client if it was opened."""
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()

    # ── Header rotation ────────────────────────────────────────────

    def _random_headers(self) -> dict[str, str]:
        """Build a headers dict with a random User-Agent and Accept-Language."""
        return {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": random.choice(ACCEPT_LANGUAGES),
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
        }

    # ── Fetch with retry ───────────────────────────────────────────

    def _compute_delay(self, attempt: int) -> float:
        """Calculate exponential backoff with jitter.

        ``delay = min(base * 2^attempt, max_delay) + uniform(0, 0.5 * delay)``
        """
        delay = min(self._base_delay * (2**attempt), self._max_delay)
        jitter = random.uniform(0, 0.5 * delay)
        return delay + jitter

    async def fetch(
        self,
        url: str,
        retries: int = 5,
        **kwargs: Any,
    ) -> tuple[int, str]:
        """Fetch a URL with retry, backoff, and proxy health management.

        Parameters
        ----------
        url:
            The URL to fetch.
        retries:
            Maximum number of retry attempts (default 5).
        **kwargs:
            Extra keyword arguments forwarded to :meth:`httpx.AsyncClient.request`.

        Returns
        -------
        tuple[int, str]
            ``(status_code, body)`` — the HTTP status and response text.

        Raises
        ------
        httpx.ConnectError
            If all retries are exhausted and the last failure was a connection error.
        httpx.HTTPError
            If all retries are exhausted and the last failure was an HTTP error.
        """
        # Build shared limits & timeout for any per-request client we create.
        limits = httpx.Limits(
            max_keepalive_connections=5,
            max_connections=10,
        )
        timeout = httpx.Timeout(30.0)

        for attempt in range(retries + 1):
            # Pick a proxy on each attempt (may change between retries).
            proxy = self._get_proxy()

            # Human-like delay between requests (skip on first attempt).
            if attempt > 0:
                # Longer pause on retries to appear more human.
                pause = random.uniform(self._long_pause_min, self._long_pause_max)
                await asyncio.sleep(pause)
            else:
                await asyncio.sleep(
                    random.uniform(self._min_delay_between, self._max_delay_between)
                )

            try:
                headers = self._random_headers()
                # Merge any user-supplied headers on top of defaults.
                if "headers" in kwargs:
                    extra = kwargs.pop("headers")  # type: ignore[misc]
                    assert isinstance(extra, dict)
                    headers.update(extra)

                if proxy:
                    proxy_url = proxy["url"]
                    # Create a fresh client with the proxy (httpx requires
                    # proxy at the client level).
                    async with httpx.AsyncClient(
                        proxy=proxy_url,
                        limits=limits,
                        timeout=timeout,
                    ) as client:
                        response = await client.get(
                            url,
                            headers=headers,
                            **kwargs,
                        )
                else:
                    client = self._get_client()
                    response = await client.get(
                        url,
                        headers=headers,
                        **kwargs,
                    )

                status = response.status_code

                # Retryable server / rate-limit errors.
                if status in self._retry_statuses:
                    self._mark_proxy_unhealthy(proxy["url"] if proxy else None)
                    if attempt < retries:
                        delay = self._compute_delay(attempt)
                        await asyncio.sleep(delay)
                        continue
                    return (status, response.text)

                # Non-retryable response — return immediately.
                return (status, response.text)

            except (httpx.ConnectError, httpx.HTTPError):
                self._mark_proxy_unhealthy(proxy["url"] if proxy else None)
                if attempt < retries:
                    delay = self._compute_delay(attempt)
                    await asyncio.sleep(delay)
                    continue
                # Exhausted retries — re-raise last exception.
                raise

        # Should not be reached (loop always returns or raises),
        # but satisfies the type-checker.
        raise RuntimeError("fetch reached unreachable state")

    # ── Internal helpers ───────────────────────────────────────────

    def _get_proxy(self) -> Optional[dict[str, str]]:
        """Return a proxy from the pool, or *None* if no pool is configured."""
        if self._proxy_pool is None:
            return None
        return self._proxy_pool.get_proxy()

    def _mark_proxy_unhealthy(self, proxy_url: str | None) -> None:
        """Mark a proxy as unhealthy after a failure."""
        if proxy_url is not None and self._proxy_pool is not None:
            self._proxy_pool.mark_unhealthy(proxy_url)
