"""Scraper health monitor with sliding-window success rates and auto-quarantine.

Tracks scrape attempts per source (e.g. a job board domain) over a sliding
time window, computes success rates, and auto-quarantines sources that exceed
a configurable consecutive-failure threshold.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Any


class ScraperHealthMonitor:
    """Tracks per-source scrape health and auto-quarantines bad actors.

    Parameters
    ----------
    threshold:
        Minimum allowed success rate (0.0 – 1.0). Sources below this
        within the sliding window are considered unhealthy.  Default 0.9.
    window_minutes:
        Width of the sliding time window in minutes (default 60).
    max_consecutive_failures:
        Number of consecutive failures after which a source is
        automatically quarantined regardless of the rolling rate.
        Default 5.
    """

    def __init__(
        self,
        threshold: float = 0.9,
        window_minutes: int = 60,
        max_consecutive_failures: int = 5,
    ) -> None:
        self._threshold = threshold
        self._window_seconds = window_minutes * 60
        self._max_consecutive_failures = max_consecutive_failures

        # source_name → deque of (timestamp, success_bool)
        self._attempts: dict[str, deque[tuple[float, bool]]] = defaultdict(lambda: deque())
        # source_name → consecutive failure counter
        self._consecutive_failures: dict[str, int] = defaultdict(int)
        # source_name → bool (auto-quarantine flag)
        self._quarantined: dict[str, bool] = defaultdict(bool)

    # ── Public API ─────────────────────────────────────────────────

    def record_attempt(self, source: str, success: bool) -> None:
        """Record a scrape attempt for a source.

        Parameters
        ----------
        source:
            Logical source name (e.g. ``'seek'``, ``'indeed'``,
            ``'linkedin'``).
        success:
            Whether the scrape succeeded.
        """
        now = time.time()

        # Prune stale entries *before* adding the new one so the window is
        # always accurate.
        self._prune(source, now)

        self._attempts[source].append((now, success))

        # Consecutive-failure tracking.
        if success:
            self._consecutive_failures[source] = 0
            # A successful scrape lifts any existing auto-quarantine.
            self._quarantined[source] = False
        else:
            self._consecutive_failures[source] += 1
            if self._consecutive_failures[source] >= self._max_consecutive_failures:
                self._quarantined[source] = True

    def success_rate(self, source: str) -> float:
        """Compute the success rate over the sliding window.

        Returns 1.0 if there is no data in the window.
        """
        self._prune(source, time.time())
        entries = self._attempts.get(source)
        if not entries:
            return 1.0

        successes = sum(1 for _, ok in entries if ok)
        return successes / len(entries)

    def is_quarantined(self, source: str) -> bool:
        """Return *True* if *source* is currently quarantined."""
        return self._quarantined.get(source, False)

    def get_health_summary(self) -> dict[str, Any]:
        """Return a snapshot of the health of all tracked sources.

        Returns
        -------
        dict
            Keys are source names, each value is a dict with:
            ``success_rate``, ``is_quarantined``, ``total_attempts``,
            ``consecutive_failures``.
        """
        now = time.time()
        summary: dict[str, Any] = {}

        for source in list(self._attempts.keys()):
            self._prune(source, now)
            entries = self._attempts.get(source)
            if not entries:
                continue
            successes = sum(1 for _, ok in entries if ok)
            total = len(entries)
            summary[source] = {
                "success_rate": successes / total if total > 0 else 1.0,
                "is_quarantined": self.is_quarantined(source),
                "total_attempts": total,
                "consecutive_failures": self._consecutive_failures.get(source, 0),
            }

        return summary

    def clear_source(self, source: str) -> None:
        """Remove all tracking data for *source*.

        Useful when re-enabling a previously quarantined source after
        manual review.
        """
        self._attempts.pop(source, None)
        self._consecutive_failures.pop(source, None)
        self._quarantined.pop(source, None)

    # ── Internal helpers ───────────────────────────────────────────

    def _prune(self, source: str, now: float) -> None:
        """Remove entries older than the sliding window."""
        cutoff = now - self._window_seconds
        entries = self._attempts.get(source)
        if entries is None:
            return
        while entries and entries[0][0] < cutoff:
            entries.popleft()

    @property
    def threshold(self) -> float:
        """The success-rate threshold below which a source is unhealthy."""
        return self._threshold

    @property
    def max_consecutive_failures(self) -> int:
        """The consecutive-failure threshold for auto-quarantine."""
        return self._max_consecutive_failures
