"""Hi-Hired Backend - Celery app configuration."""

from celery import Celery
from src.core.config import get_settings

settings = get_settings()
celery_app = Celery("hi-hired", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.update(
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_default_retry_delay=60,
    task_max_retries=5,
    task_routes={
        "src.workers.scraper.*": {"queue": "scrapers"},
        "src.workers.processing.*": {"queue": "processing"},
        "src.workers.notifications.*": {"queue": "notifications"},
    },
    task_track_started=True,
    task_soft_time_limit=300,
    task_time_limit=600,
    beat_schedule={
        "verify-active-jobs": {
            "task": "src.workers.processing.verify_and_prune_jobs",
            "schedule": 21600.0,
        },
    },
)
celery_app.autodiscover_tasks(["src.workers"])
