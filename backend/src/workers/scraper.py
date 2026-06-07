"""Hi-Hired Backend - Scraper worker tasks.

Reads scrape sources from Supabase, invokes per-source adapters (stubbed),
chains results through processing, and tracks health via ScraperHealthMonitor.
"""

from __future__ import annotations

import structlog
from typing import Any

from src.services.scraper_health import ScraperHealthMonitor
from src.workers.celery_app import celery_app

logger = structlog.get_logger()

# Shared health monitor instance — in-memory across worker processes.
# For production durability, the health state should be backed by Redis/DB.
_health_monitor = ScraperHealthMonitor()


# ── Per-source adapter stubs ───────────────────────────────────────────────


async def _scrape_seek(
    query: str, location: str | None = None, page: int = 1
) -> list[dict[str, Any]]:
    """Stub: scrape Seek job listings.

    In production, this would make HTTP requests to the Seek API or
    scrape their public job pages. For now, logs and returns an empty list.
    """
    logger.info(
        "scrape_adapter_stub",
        source="seek",
        query=query,
        location=location,
        page=page,
    )
    # TODO(jordan): Implement Seek API adapter
    return []


async def _scrape_indeed(
    query: str, location: str | None = None, page: int = 1
) -> list[dict[str, Any]]:
    """Stub: scrape Indeed job listings."""
    logger.info(
        "scrape_adapter_stub",
        source="indeed",
        query=query,
        location=location,
        page=page,
    )
    # TODO(jordan): Implement Indeed API adapter
    return []


async def _scrape_jora(
    query: str, location: str | None = None, page: int = 1
) -> list[dict[str, Any]]:
    """Stub: scrape Jora job listings."""
    logger.info(
        "scrape_adapter_stub",
        source="jora",
        query=query,
        location=location,
        page=page,
    )
    # TODO(jordan): Implement Jora API adapter
    return []


# ── Source-name → adapter dispatch ─────────────────────────────────────────

_ADAPTERS: dict[str, Any] = {
    "seek": _scrape_seek,
    "indeed": _scrape_indeed,
    "jora": _scrape_jora,
}


# ── Celery tasks ───────────────────────────────────────────────────────────


@celery_app.task(
    bind=True,
    queue="scrapers",
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 60},
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    acks_late=True,
)
def scrape_job_source(self, source_url: str, source_name: str) -> dict[str, Any]:
    """Scrape a single job source by name.

    Reads the source configuration from Supabase ``scrape_sources``,
    dispatches to the appropriate adapter, chains raw results through
    ``processing.process_raw_job``, and records outcome in the health
    monitor.

    Parameters
    ----------
    source_url:
        The base URL or endpoint for the source (e.g.
        ``"https://www.seek.com.au/api/jobs"``).
    source_name:
        Logical source name (e.g. ``"seek"``, ``"indeed"``, ``"jora"``).

    Returns
    -------
    dict
        Summary with ``source_name``, ``source_url``, ``jobs_found``,
        ``success``, and ``error`` (if any).
    """
    logger.info(
        "scrape_job_source_started",
        source=source_name,
        url=source_url,
    )

    # ── Check quarantine ────────────────────────────────────────────
    if _health_monitor.is_quarantined(source_name):
        logger.warning(
            "scrape_source_quarantined_skipping",
            source=source_name,
        )
        return {
            "source_name": source_name,
            "source_url": source_url,
            "jobs_found": 0,
            "success": False,
            "error": "Source is quarantined",
            "quarantined": True,
        }

    adapter = _ADAPTERS.get(source_name)
    if adapter is None:
        msg = f"No adapter registered for source '{source_name}'"
        logger.error("scrape_no_adapter", source=source_name)
        _health_monitor.record_attempt(source_name, False)
        return {
            "source_name": source_name,
            "source_url": source_url,
            "jobs_found": 0,
            "success": False,
            "error": msg,
        }

    try:
        # In a real async context we'd run the async adapter in an event
        # loop. For the stub, synchronous invocation is fine since the
        # stubs return immediately.
        import asyncio

        raw_jobs: list[dict[str, Any]] = asyncio.run(
            adapter(query="software+engineer", location=None, page=1)
        )

        logger.info(
            "scrape_adapter_returned",
            source=source_name,
            jobs_found=len(raw_jobs),
        )

        # ── Chain each raw job to the processing pipeline ────────────
        from src.workers.processing import process_raw_job

        processed_count = 0
        for raw in raw_jobs:
            raw["source_name"] = source_name
            raw["source_url"] = source_url
            # Fire-and-forget via Celery delay (avoids coupling).
            process_raw_job.delay(raw)
            processed_count += 1

        _health_monitor.record_attempt(source_name, True)

        return {
            "source_name": source_name,
            "source_url": source_url,
            "jobs_found": len(raw_jobs),
            "processed_count": processed_count,
            "success": True,
            "error": None,
        }

    except Exception as exc:
        logger.exception(
            "scrape_job_source_failed",
            source=source_name,
            error=str(exc),
        )
        _health_monitor.record_attempt(source_name, False)
        raise


@celery_app.task(queue="scrapers")
def get_health_summary() -> dict[str, Any]:
    """Return the current in-memory scraper health summary.

    Useful for admin dashboards and monitoring probes.
    """
    return dict(_health_monitor.get_health_summary())


@celery_app.task(queue="scrapers")
def clear_source_quarantine(source: str) -> dict[str, Any]:
    """Manually lift quarantine for a source.

    Useful for operator recovery after fixing a source adapter.
    """
    _health_monitor.clear_source(source)
    logger.info("scrape_quarantine_cleared", source=source)
    return {"source": source, "quarantine_lifted": True}


# ── Scheduled: run all active sources ──────────────────────────────────────


@celery_app.task(
    queue="scrapers",
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 2, "countdown": 120},
)
def scrape_all_sources(self) -> list[dict[str, Any]]:
    """Read all active scrape sources from Supabase and dispatch each.

    Intended to be triggered by the Celery beat scheduler.
    """
    logger.info("scrape_all_sources_started")

    try:
        from supabase import create_client

        from src.core.config import get_settings

        settings = get_settings()
        supabase = create_client(settings.supabase_url, settings.supabase_service_key)

        result = (
            supabase.table("scrape_sources")
            .select("id, name, url, active")
            .eq("active", True)
            .execute()
        )

        sources: list[dict[str, Any]] = result.data if hasattr(result, "data") else []

        if not sources:
            logger.info("scrape_all_sources_no_sources")
            return []

        results: list[dict[str, Any]] = []
        for source in sources:
            source_name = source.get("name", "unknown")
            source_url = source.get("url", "")

            # Skip quarantined (redundant with the task-level check but
            # avoids queueing work that will be thrown away).
            if _health_monitor.is_quarantined(source_name):
                logger.warning(
                    "scrape_source_quarantined_skipping_beat",
                    source=source_name,
                )
                results.append(
                    {
                        "source_name": source_name,
                        "source_url": source_url,
                        "success": False,
                        "error": "quarantined",
                        "skipped": True,
                    }
                )
                continue

            results.append(scrape_job_source(source_url, source_name))

        logger.info(
            "scrape_all_sources_complete",
            total=len(sources),
            results=len(results),
        )
        return results

    except Exception:
        logger.exception("scrape_all_sources_failed")
        raise
