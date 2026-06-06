"""Hi-Hired Backend - Processing worker tasks."""

import asyncio
import structlog
from src.core.config import get_settings
from src.workers.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(
    queue="processing",
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 30},
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    acks_late=True,
)
def process_raw_job(self, raw_data: dict) -> str:
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


@celery_app.task(
    queue="processing",
    bind=True,
    soft_time_limit=1800,
    time_limit=3600,
    max_retries=2,
    default_retry_delay=600,
)
def retrain_match_model(self) -> dict:
    """Celery beat task — retrain the ML match scoring model.

    Runs daily (configured via ``celery_app.conf.beat_schedule``).
    Fetches recent swipe/interaction data from Supabase, triggers the
    ML pipeline to retrain the XGBoost model, and logs the new metrics.

    The training runs in a subprocess to isolate it from Celery worker
    memory pressure.
    """
    logger.info("retrain_match_model_started")

    try:
        from src.services.ml_pipeline import run_training_pipeline

        metrics = asyncio.run(run_training_pipeline())

        result = {
            "status": "ok",
            "metrics": metrics,
        }
        logger.info(
            "retrain_match_model_complete",
            auc_roc=metrics.get("auc_roc"),
        )
        return result

    except Exception:
        logger.exception("retrain_match_model_failed")
        raise
