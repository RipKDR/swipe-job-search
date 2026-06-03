"""Hi-Hired Backend - Notification worker tasks."""

import structlog
from src.workers.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(queue="notifications")
def send_match_notification(user_id: str, job_id: str, match_type: str) -> bool:
    logger.info(
        "notification_sent",
        user_id=user_id,
        job_id=job_id,
        match_type=match_type,
    )
    return True
