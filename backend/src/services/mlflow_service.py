"""Hi-Hired Backend — Thin MLflow integration layer.

Provides :class:`MLflowService` as a single entry point for:

- Setting up the MLflow tracking URI.
- Loading registered models by name, version, or stage.
- Promoting a model version from Staging to Production in the registry.
- Retrieving the current production model URI.

This keeps model-registry logic out of the training pipeline and scoring
code, making both easier to test and swap out later.
"""

from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

# MLflow 2.18+ deprecates the filesystem tracking backend.
# Setting the env var here bypasses the migration warning for local dev.
if os.environ.get("MLFLOW_ALLOW_FILE_STORE", "true").lower() in ("true", "1", "yes"):
    os.environ.setdefault("MLFLOW_ALLOW_FILE_STORE", "true")


class MLflowService:
    """Thin wrapper around MLflow tracking and model-registry operations.

    Uses a SQLite backend (``sqlite:///mlruns.db``) by default for local
    development to avoid the MLflow 2.18+ filesystem-backend deprecation.
    Set ``MLFLOW_TRACKING_URI=sqlite:///mlruns.db`` or any database URI
    for production.
    """

    def __init__(self, tracking_uri: str | None = None) -> None:
        self._tracking_uri = tracking_uri or "sqlite:///mlruns.db"
        self._initialised = False

    # ------------------------------------------------------------------
    # Setup
    # ------------------------------------------------------------------

    def setup_tracking(self) -> None:
        """Configure the MLflow tracking URI for the current process.

        Safe to call multiple times — only the first call applies the URI.
        """
        if self._initialised:
            return
        import mlflow

        mlflow.set_tracking_uri(self._tracking_uri)
        self._initialised = True
        logger.info("MLflow tracking URI set to %s", self._tracking_uri)

    # ------------------------------------------------------------------
    # Model loading
    # ------------------------------------------------------------------

    def load_model(
        self,
        model_name: str = "match-scorer",
        version: str | None = None,
        stage: str | None = None,
    ) -> Any | None:
        """Load an XGBoost model from the MLflow Model Registry.

        Parameters
        ----------
        model_name :
            Registered model name.
        version :
            Specific model version.  Takes precedence over *stage*.
        stage :
            Model stage alias (e.g. ``"Production"``, ``"Staging"``).
            Ignored when *version* is set.

        Returns
        -------
        An ``xgboost.Booster`` instance, or ``None`` on failure.
        """
        self.setup_tracking()
        import mlflow

        if version:
            uri = f"models:/{model_name}/{version}"
        elif stage:
            uri = f"models:/{model_name}/{stage}"
        else:
            uri = f"models:/{model_name}/latest"

        try:
            model = mlflow.xgboost.load_model(uri)
            logger.info("Loaded model from %s", uri)
            return model
        except Exception:
            logger.exception("Failed to load model from %s", uri)
            return None

    # ------------------------------------------------------------------
    # Registry helpers
    # ------------------------------------------------------------------

    def get_production_model_uri(self, model_name: str = "match-scorer") -> str | None:
        """Return the URI for the current Production model version.

        Returns ``None`` when no Production version exists.
        """
        self.setup_tracking()
        from mlflow import MlflowClient

        client = MlflowClient()
        try:
            latest = client.get_latest_versions(model_name, stages=["Production"])
            if not latest:
                logger.info("No Production version found for %s", model_name)
                return None
            version = latest[0].version
            uri = f"models:/{model_name}/{version}"
            logger.info("Production model URI: %s", uri)
            return uri
        except Exception:
            logger.exception("Failed to get production model URI for %s", model_name)
            return None

    def promote_to_production(
        self, model_name: str = "match-scorer", version: str | None = None
    ) -> bool:
        """Promote a model version to the Production stage.

        Transitions any previously-staged version to Production.
        If *version* is ``None``, the latest Staging version is promoted.

        Returns ``True`` on success, ``False`` otherwise.
        """
        self.setup_tracking()
        from mlflow import MlflowClient
        from mlflow.entities.model_registry.model_version_stages import STAGE_PRODUCTION

        client = MlflowClient()

        try:
            if version is None:
                # Find the latest Staging version
                latest_staging = client.get_latest_versions(model_name, stages=["Staging"])
                if not latest_staging:
                    logger.warning("No Staging version found for %s", model_name)
                    return False
                version = latest_staging[0].version

            client.transition_model_version_stage(
                name=model_name,
                version=version,
                stage=STAGE_PRODUCTION,
            )
            logger.info("Promoted %s version %s to Production", model_name, version)
            return True
        except Exception:
            logger.exception("Failed to promote %s version %s to Production", model_name, version)
            return False

    def register_model(
        self,
        run_id: str,
        model_name: str = "match-scorer",
        stage: str = "Staging",
    ) -> str | None:
        """Register a model run in the Model Registry.

        Parameters
        ----------
        run_id :
            MLflow run ID.
        model_name :
            Registered model name.
        stage :
            Initial stage to assign (default ``"Staging"``).

        Returns
        -------
        The registered model version string, or ``None`` on failure.
        """
        self.setup_tracking()
        import mlflow

        model_uri = f"runs:/{run_id}/model"
        try:
            result = mlflow.register_model(model_uri=model_uri, name=model_name)
            registered_version = result.version

            # Transition to desired stage
            from mlflow import MlflowClient
            from mlflow.entities.model_registry.model_version_stages import STAGE_STAGING

            client = MlflowClient()
            client.transition_model_version_stage(
                name=model_name,
                version=registered_version,
                stage=STAGE_STAGING,
            )

            logger.info(
                "Registered model %s version %s (stage=%s)",
                model_name,
                registered_version,
                stage,
            )
            return registered_version
        except Exception:
            logger.exception("Failed to register model %s from run %s", model_name, run_id)
            return None

    # ------------------------------------------------------------------
    # Run helpers
    # ------------------------------------------------------------------

    def log_params(self, params: dict[str, Any]) -> None:
        """Log parameters to the current active MLflow run."""
        import mlflow

        for k, v in params.items():
            mlflow.log_param(k, v)

    def log_metrics(self, metrics: dict[str, float]) -> None:
        """Log metrics to the current active MLflow run."""
        import mlflow

        for k, v in metrics.items():
            mlflow.log_metric(k, v)

    def log_dict(self, data: dict[str, Any], artifact_name: str) -> None:
        """Log a JSON-serialisable dict as an artifact."""
        import mlflow

        mlflow.log_dict(data, artifact_name)

    def get_run_id(self) -> str | None:
        """Return the active run ID, or ``None`` if no run is active."""
        import mlflow

        active_run = mlflow.active_run()
        if active_run is not None:
            return active_run.info.run_id
        return None
