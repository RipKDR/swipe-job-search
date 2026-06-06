"""Hi-Hired Backend - Celery app configuration.

Queue topology (production):

  scrapers       → High-volume, retry-heavy. Source adapters fetch job listings.
                     Dead-letter after 5 retries → logged; operator alert.
  processing     → CPU-bound normalisation + classification.
                     Retries with exponential backoff (30s-10m).
                     Dead-letter after 5 retries → logged.
  notifications  → Low-latency push notification dispatch.
                     Retries with exponential backoff (30s-5m).
                     Dead-letter after 5 retries → logged; alert.
  default        → Unrouted tasks land here. Should stay empty in production.

Beat schedule:
  verify-active-jobs   → every 6h — checks active job URLs, prunes expired.
  retrain-match-model  → every 7d — collects labelled swipes, re-trains the
                         match-scoring model, promotes to Production if gate passes.
"""

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
    # Dead-letter: tasks exceeding max_retries are rejected permanently
    # Subscribers should watch celery.backend for these events.
    task_reject_on_worker_lost=True,
    beat_schedule={
        "verify-active-jobs": {
            "task": "src.workers.processing.verify_and_prune_jobs",
            "schedule": 21600.0,
        },
        "retrain-match-model": {
            "task": "src.workers.ml_training.retrain_match_model",
            "schedule": 604800.0,  # 7 days
        },
    },
)
celery_app.autodiscover_tasks(["src.workers"])
