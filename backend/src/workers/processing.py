"""Hi-Hired Backend - Processing worker tasks."""

import asyncio
import structlog
from src.core.config import get_settings
from src.workers.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(queue="processing")
def process_raw_job(raw_data: dict) -> str:
    from src.schemas.jobs import RawJobInput
    from src.services.job_normalizer import normalize_job

    raw = RawJobInput(**raw_data)
    normalized = normalize_job(raw, source_name=raw.source_name)
    logger.info("job_normalized", job_id=str(normalized.id), title=normalized.title)
    return normalized.model_dump_json()


@celery_app.task(
    queue="processing",
    bind=True,
    soft_time_limit=600,
    time_limit=900,
    max_retries=2,
    default_retry_delay=300,
)
def verify_and_prune_jobs(self):
    """Celery beat task — verify active job URLs and soft-delete expired ones.

    Runs every 6 hours (configured via ``celery_app.conf.beat_schedule``).
    Fetches active jobs older than 24 hours, checks each URL, and
    soft-deletes listings that return 404/410 or contain expired-content
    indicators.

    Integrates with :class:`~src.services.scraper_health.ScraperHealthMonitor`
    to track per-source health and auto-quarantine misbehaving scrapers.
    """
    logger.info("verification_task_started")

    try:
        from supabase import create_client

        settings = get_settings()
        supabase = create_client(settings.supabase_url, settings.supabase_service_key)

        from src.services.data_pruner import DataPruner

        pruner = DataPruner()

        # Run the async verification in a fresh event loop.
        checked, expired = asyncio.run(pruner.verify_active_jobs(supabase))

        result = {
            "status": "ok",
            "checked": checked,
            "expired": expired,
            "health_summary": pruner.health.get_health_summary(),
        }
        logger.info(
            "verification_task_complete",
            checked=checked,
            expired=expired,
        )
        return result

    except Exception:
        logger.exception("verification_task_failed")
        raise
