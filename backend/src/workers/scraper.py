"""Hi-Hired Backend - Scraper worker tasks."""

import structlog
from src.workers.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(
    bind=True,
    queue="scrapers",
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 60},
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
)
def scrape_job_source(self, source_url: str, source_name: str) -> dict:
    logger.info("scrape_started", source=source_name, url=source_url)
    raise NotImplementedError("Per-source scraper adapters not yet implemented")
