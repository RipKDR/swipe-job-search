"""Hi-Hired Backend - Notification worker tasks."""

import structlog
from src.workers.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(
    queue="notifications",
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 30},
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    acks_late=True,
)
def send_match_notification(self, user_id: str, job_id: str, match_type: str) -> bool:
    logger.info(
        "notification_sending",
        user_id=user_id,
        job_id=job_id,
        match_type=match_type,
    )
    return True
