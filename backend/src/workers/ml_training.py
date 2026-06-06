"""Hi-Hired Backend — Celery tasks for ML model retraining.

Provides a scheduled task that collects recent labelled swipe data,
triggers the MatchTrainingPipeline, and promotes the model to Production
if the promotion gate passes.
"""

from __future__ import annotations

import logging

import structlog

from src.workers.celery_app import celery_app

logger = structlog.get_logger()
_plain_logger = logging.getLogger(__name__)


def _collect_recent_swipes() -> None:
    """Placeholder: collect recent labelled swipe data from the database.

    In production this would query the swipe_feedback table for entries
    with labels collected since the last training run, returning a
    DataFrame ready for training.

    Returns ``None`` for now, which causes the pipeline to generate
    synthetic data for testing.
    """
    _plain_logger.info("_collect_recent_swipes: no real data source yet — using synthetic data")
    return None


@celery_app.task(
    bind=True,
    name="src.workers.ml_training.retrain_match_model",
    max_retries=2,
    default_retry_delay=300,
    acks_late=True,
)
def retrain_match_model(self) -> dict:
    """Celery beat task — retrain the match-scoring model.

    Steps
    -----
    1. Collect recent labelled swipes (stub — returns synthetic data).
    2. Run the training pipeline.
    3. If the promotion gate passes, promote the Staging model to Production.

    Scheduled to run weekly via Celery Beat.
    """
    task_logger = structlog.get_logger()
    task_logger.info("retrain-match-model: starting weekly retraining")

    # Collect training data
    data = _collect_recent_swipes()

    # Run the training pipeline
    from src.core.config import get_settings
    from src.services.ml_pipeline import MatchTrainingPipeline

    settings = get_settings()
    mlflow_uri = f"file:{settings.redis_url}/mlruns" if settings.redis_url else "file:./mlruns"
    pipeline = MatchTrainingPipeline(mlflow_tracking_uri=mlflow_uri)
    result = pipeline.train(data)

    run_id = result.get("run_id")
    ndcg = result.get("ndcg", 0.0)
    model_registered = result.get("model_registered", False)
    data_hash = result.get("data_hash", "")

    task_logger.info(
        "retrain-match-model: training complete",
        run_id=run_id,
        ndcg=ndcg,
        model_registered=model_registered,
        data_hash=data_hash,
    )

    # If the model was registered in Staging, promote it to Production
    promoted = False
    if model_registered:
        from src.services.mlflow_service import MLflowService

        mlflow_svc = MLflowService(tracking_uri=mlflow_uri)
        promoted = mlflow_svc.promote_to_production(model_name="match-scorer")
        task_logger.info(
            "retrain-match-model: promotion %s",
            "succeeded" if promoted else "failed (no staging version found)",
        )

    return {
        "run_id": run_id,
        "ndcg": ndcg,
        "model_registered": model_registered,
        "promoted": promoted,
        "data_hash": data_hash,
    }
