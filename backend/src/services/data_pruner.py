"""Data pruner service — verifies job URLs, soft-deletes expired listings,
and monitors scraper health with auto-quarantine integration.

Designed to be run by the Celery beat scheduler on a periodic cadence.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
import structlog

from src.services.scraper_health import ScraperHealthMonitor

logger = structlog.get_logger()

# ── Constants ────────────────────────────────────────────────────────────────

EXPIRED_INDICATORS: list[str] = [
    "position filled",
    "no longer accepting",
    "job has been closed",
    "we are no longer accepting applications",
]

DEFAULT_VERIFY_TIMEOUT = 15.0
JOB_AGE_HOURS = 24

# ── Prune audit table configuration ─────────────────────────────────────────

PRUNE_AUDIT_TABLE = "prune_audit"


# ── Public service ───────────────────────────────────────────────────────────


class DataPruner:
    """Verify job URLs are still active and soft-delete expired listings.

    Parameters
    ----------
    supabase_client:
        Optional Supabase client instance.  When ``None`` the client is
        lazily initialised from settings on first use.

    Attributes
    ----------
    health:
        Shared :class:`ScraperHealthMonitor` instance that tracks per-source
        scrape-attempt health and auto-quarantines failing sources.
    """

    def __init__(self, supabase_client: Any = None) -> None:
        self._supabase = supabase_client
        self.health = ScraperHealthMonitor()

    # ── Public API ───────────────────────────────────────────────────────

    async def verify_job_url(self, url: str) -> tuple[bool, str]:
        """Verify a single job URL is still active.

        Performs an HTTP GET, checking for 404/410 responses and
        content-based expiry indicators in the response body.

        Parameters
        ----------
        url:
            The job listing URL to verify.

        Returns
        -------
        tuple[bool, str]
            ``(is_active, reason)`` where:

            =====================================  ===========================
            ``(True, 'active')``                   URL returned 200 OK with
                                                   no expired body indicators.
            ``(False, 'not_found')``               URL returned 404 or 410.
            ``(False, 'content_indicator: …')``    Body contained an expired
                                                   indicator phrase.
            ``(True, 'verification_error: …')``    Transient / network error
                                                   — kept active to avoid
                                                   false-positive deletion.
            =====================================  ===========================
        """
        try:
            async with httpx.AsyncClient(
                timeout=DEFAULT_VERIFY_TIMEOUT, follow_redirects=True
            ) as client:
                response = await client.get(url)
        except (
            httpx.ConnectError,
            httpx.TimeoutException,
            httpx.RemoteProtocolError,
        ) as exc:
            msg = f"verification_error: {exc.__class__.__name__}"
            logger.warning("job_url_verify_transient", url=url, error=str(exc))
            return True, msg

        # ── HTTP status-based expiry ─────────────────────────────────────
        if response.status_code in (404, 410):
            return False, "not_found"

        if response.status_code >= 400:
            # Other server errors (5xx, 403, etc.) → treat as transient
            msg = f"verification_error: http_{response.status_code}"
            logger.warning("job_url_verify_http_error", url=url, status=response.status_code)
            return True, msg

        # ── Content-based expiry ─────────────────────────────────────────
        body_lower = response.text.lower()
        for indicator in EXPIRED_INDICATORS:
            if indicator in body_lower:
                logger.info(
                    "job_url_expired_content",
                    url=url,
                    indicator=indicator,
                )
                return False, f"content_indicator: {indicator}"

        return True, "active"

    async def verify_active_jobs(self, supabase: Any) -> tuple[int, int]:
        """Fetch active jobs older than ``JOB_AGE_HOURS``, verify their URLs,
        and soft-delete expired ones.

        Each expired job gets ``is_active=False`` set along with
        ``expired_reason`` and ``expired_at`` timestamps.  Every
        verification result is also recorded in the
        :attr:`~DataPruner.health` monitor for scraper-health tracking
        and auto-quarantine.

        Parameters
        ----------
        supabase:
            A dict-like object duck-typing the Supabase client API:
            ``.table(name).select(cols).eq(k, v).lt(k, v).execute()``
            returning a result with a ``.data`` attribute.

        Returns
        -------
        tuple[int, int]
            ``(checked_count, expired_count)`` — total number of jobs whose
            URLs were actually verified, and how many of those were
            soft-deleted as expired.
        """
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=JOB_AGE_HOURS)).isoformat()

        result = (
            supabase.table("jobs")
            .select("id, source_url, source_name")
            .eq("is_active", True)
            .lt("posted_at", cutoff)
            .execute()
        )

        jobs: list[dict[str, Any]] = result.data if hasattr(result, "data") else []
        checked = 0
        expired = 0

        for job in jobs:
            job_id = job.get("id")
            url = job.get("source_url", "")
            source = job.get("source_name", "unknown")

            if not url:
                continue

            checked += 1
            is_active, reason = await self.verify_job_url(url)

            if not is_active:
                expired += 1
                self.health.record_attempt(source, False)

                now_iso = datetime.now(timezone.utc).isoformat()
                supabase.table("jobs").update(
                    {
                        "is_active": False,
                        "expired_reason": reason,
                        "expired_at": now_iso,
                    }
                ).eq("id", job_id).execute()

                logger.info(
                    "job_soft_deleted",
                    job_id=job_id,
                    source=source,
                    reason=reason,
                )
            else:
                self.health.record_attempt(source, True)
                # If the source was quarantined but is now succeeding, the
                # ScraperHealthMonitor automatically lifts quarantine after
                # a successful attempt — no extra work needed.

        # ── Log to prune audit table ────────────────────────────────────
        await self._log_prune_audit(
            supabase,
            {
                "checked": checked,
                "expired": expired,
                "healthy_sources": self.health.get_health_summary(),
            },
        )

        if expired:
            logger.warning(
                "verify_active_jobs_complete",
                checked=checked,
                expired=expired,
                health_summary=self.health.get_health_summary(),
            )
        else:
            logger.info(
                "verify_active_jobs_complete",
                checked=checked,
                expired=0,
            )

        return checked, expired

    # ── Audit logging ────────────────────────────────────────────────────

    async def _log_prune_audit(
        self, supabase: Any, summary: dict[str, Any]
    ) -> None:
        """Write a prune audit record to Supabase.

        Creates a row in ``PRUNE_AUDIT_TABLE`` (default ``prune_audit``)
        so that pruning activity is visible in dashboards and operations
        tooling.

        Errors are logged but not propagated — audit writes must never
        break the pruning pipeline.
        """
        try:
            from datetime import datetime, timezone

            record = {
                "ran_at": datetime.now(timezone.utc).isoformat(),
                "checked": summary.get("checked", 0),
                "expired": summary.get("expired", 0),
                "healthy_sources": summary.get("healthy_sources", {}),
            }
            supabase.table(PRUNE_AUDIT_TABLE).insert(record).execute()
            logger.debug(
                "prune_audit_written",
                checked=record["checked"],
                expired=record["expired"],
            )
        except Exception as exc:
            logger.warning(
                "prune_audit_write_failed",
                error=str(exc),
            )

    def get_prune_summary(
        self, supabase: Any, limit: int = 20
    ) -> list[dict[str, Any]]:
        """Fetch the most recent prune audit entries.

        Useful for admin dashboard endpoints to visualise pruning
        activity over time.

        Parameters
        ----------
        supabase:
            Supabase client instance.
        limit:
            Maximum number of audit rows to fetch (default 20).

        Returns
        -------
        list[dict]
            Chronologically-ordered list of audit records, newest first.
            Each record contains ``ran_at``, ``checked``, ``expired``,
            and ``healthy_sources`` fields.
        """
        try:
            result = (
                supabase.table(PRUNE_AUDIT_TABLE)
                .select("*")
                .order("ran_at", desc=True)
                .limit(limit)
                .execute()
            )
            return result.data if hasattr(result, "data") else []
        except Exception as exc:
            logger.warning(
                "prune_summary_fetch_failed",
                error=str(exc),
            )
            return []
