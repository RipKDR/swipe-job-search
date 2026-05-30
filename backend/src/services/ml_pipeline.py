"""Hi-Hired Backend — ML training pipeline with Optuna + MLflow.

Provides :class:`MatchTrainingPipeline` that:

1. Generates synthetic training data (or accepts real labelled data).
2. Optimises XGBoost hyper-parameters with **Optuna**.
3. Trains a final model and logs everything to **MLflow**.
4. Evaluates with **NDCG** (normalised discounted cumulative gain) and
   precision, then **registers the model in the MLflow Model Registry**
   only if NDCG exceeds the **promotion gate** (default 0.3).
"""

from __future__ import annotations

from typing import Any

import numpy as np
import optuna
import pandas as pd
import structlog
import xgboost as xgb
from optuna.samplers import TPESampler
from sklearn.metrics import ndcg_score, precision_score
from sklearn.model_selection import train_test_split

logger = structlog.get_logger()

# Number of features must match match_scorer._FEATURE_COUNT
_FEATURE_COUNT = 5
_FEATURE_NAMES = [
    "skill_overlap",
    "salary_alignment",
    "location_match",
    "type_match",
    "bias",
]


class MatchTrainingPipeline:
    """End-to-end training pipeline for the Hi-Hired match scorer.

    Parameters
    ----------
    mlflow_tracking_uri :
        MLflow tracking server URI.  Defaults to ``"file:./mlruns"``
        (local directory) if not set.
    """

    def __init__(
        self,
        mlflow_tracking_uri: str | None = None,
    ) -> None:
        self._tracking_uri = mlflow_tracking_uri or "file:./mlruns"

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def train(self, data: pd.DataFrame | None = None) -> dict[str, Any]:
        """Run the full training cycle.

        Steps
        -----
        1. Create dummy data if *data* is ``None``.
        2. Train / test split (80/20).
        3. Optuna hyper-parameter optimisation (20 trials).
        4. Train final XGBoost model with best params.
        5. Log run, params, metrics, and model artifact to MLflow.
        6. Register model in Model Registry **only** if NDCG > 0.3.

        Returns
        -------
        dict
            Keys: ``run_id``, ``precision``, ``ndcg``, ``model_registered``.
        """
        if data is None:
            data = self._create_dummy_data(n_samples=1000)

        # Train / test split
        y = data["label"].values
        X = data[_FEATURE_NAMES].values
        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.2,
            random_state=42,
            stratify=y,
        )

        # Optuna optimisation
        logger.info("Starting Optuna hyper-parameter optimisation")
        study = self.optimize_hyperparams(X_train, y_train, n_trials=20)

        best_params = study.best_params
        logger.info("Optuna best params", **best_params)

        # Train final model with best params
        dtrain_final = xgb.DMatrix(X_train, label=y_train)
        dtest = xgb.DMatrix(X_test, label=y_test)

        # Map Optuna params to XGBoost params (remove trial-specific keys)
        xgb_params = {
            "max_depth": int(best_params["max_depth"]),
            "learning_rate": best_params["learning_rate"],
            "n_estimators": int(best_params["n_estimators"]),
            "subsample": best_params["subsample"],
            "objective": "binary:logistic",
            "eval_metric": "logloss",
            "seed": 42,
        }

        final_model = xgb.train(
            xgb_params,
            dtrain_final,
            num_boost_round=int(best_params["n_estimators"]),
        )

        # Evaluate
        y_pred_prob = final_model.predict(dtest)
        y_pred_binary = (y_pred_prob >= 0.5).astype(int)

        precision = precision_score(y_test, y_pred_binary, zero_division=0.0)
        ndcg = float(ndcg_score(y_test.reshape(1, -1), y_pred_prob.reshape(1, -1)))

        logger.info("Evaluation results", precision=round(precision, 4), ndcg=round(ndcg, 4))

        # MLflow tracking
        run_id = self._log_to_mlflow(
            final_model,
            xgb_params,
            best_params,
            precision,
            ndcg,
            X_train,
            y_train,
        )

        # Promotion gate — only register if NDCG > 0.3
        model_registered = False
        if ndcg > 0.3:
            self._register_model(run_id)
            model_registered = True
            logger.info("Model registered in MLflow Model Registry (NDCG > 0.3)")
        else:
            logger.warning(
                "Model NOT registered — NDCG below promotion gate",
                ndcg=round(ndcg, 4),
                gate=0.3,
            )

        return {
            "run_id": run_id,
            "precision": round(precision, 4),
            "ndcg": round(ndcg, 4),
            "model_registered": model_registered,
        }

    # ------------------------------------------------------------------
    # Hyper-parameter optimisation
    # ------------------------------------------------------------------

    @staticmethod
    def optimize_hyperparams(
        X_train: np.ndarray,
        y_train: np.ndarray,
        n_trials: int = 10,
    ) -> optuna.Study:
        """Run Optuna to find best XGBoost hyper-parameters.

        Uses 3-fold cross-validation on ``logloss`` as the optimisation
        objective (lower is better).
        """
        dtrain = xgb.DMatrix(X_train, label=y_train)

        def objective(trial: optuna.Trial) -> float:
            params = {
                "max_depth": trial.suggest_int("max_depth", 3, 10),
                "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
                "n_estimators": trial.suggest_int("n_estimators", 50, 300),
                "subsample": trial.suggest_float("subsample", 0.5, 1.0),
                "objective": "binary:logistic",
                "eval_metric": "logloss",
                "seed": 42,
            }
            num_round = params.pop("n_estimators")
            cv_results = xgb.cv(
                params,
                dtrain,
                num_boost_round=num_round,
                nfold=3,
                stratified=True,
                early_stopping_rounds=20,
                metrics="logloss",
                seed=42,
            )
            return float(cv_results["test-logloss-mean"].min())

        study = optuna.create_study(
            direction="minimize",
            sampler=TPESampler(seed=42),
            study_name="match_scorer_optuna",
        )
        study.optimize(objective, n_trials=n_trials, show_progress_bar=False)

        return study

    # ------------------------------------------------------------------
    # Synthetic data generation
    # ------------------------------------------------------------------

    @staticmethod
    def _create_dummy_data(n_samples: int = 1000) -> pd.DataFrame:
        """Generate synthetic training data for the match scoring model.

        Each row is a feature vector (identical to what
        ``LogisticMatchScorer._compute_features`` produces) plus a
        binary ``label`` that indicates a "good match".

        The label is a noisy function of the features to give the model
        something realistic to learn:

            label ≈ sigmoid(2*skill_overlap + 1.5*salary_alignment
                            + 1.0*location_match + 0.5*type_match - 1.0)
        """
        rng = np.random.default_rng(42)

        skill_overlap = rng.beta(2, 2, size=n_samples)
        salary_alignment = rng.beta(2, 2, size=n_samples)
        location_match = rng.binomial(1, 0.3, size=n_samples).astype(np.float64)
        type_match = rng.binomial(1, 0.4, size=n_samples).astype(np.float64)

        # Ground-truth logit with noise
        logit = (
            2.0 * skill_overlap
            + 1.5 * salary_alignment
            + 1.0 * location_match
            + 0.5 * type_match
            - 1.0
            + rng.normal(0, 0.3, size=n_samples)
        )
        prob = 1.0 / (1.0 + np.exp(-logit))
        labels = (rng.uniform(size=n_samples) < prob).astype(int)

        df = pd.DataFrame(
            {
                "skill_overlap": skill_overlap,
                "salary_alignment": salary_alignment,
                "location_match": location_match,
                "type_match": type_match,
                "bias": np.ones(n_samples, dtype=np.float64),
                "label": labels,
            }
        )
        return df

    # ------------------------------------------------------------------
    # MLflow integration
    # ------------------------------------------------------------------

    def _log_to_mlflow(
        self,
        model: xgb.Booster,
        xgb_params: dict[str, Any],
        optuna_params: dict[str, Any],
        precision: float,
        ndcg: float,
        X_train: np.ndarray,
        y_train: np.ndarray,
    ) -> str:
        """Log the model, params, and metrics to MLflow.

        Returns the MLflow run ID.
        """
        import mlflow

        mlflow.set_tracking_uri(self._tracking_uri)
        mlflow.set_experiment("hi-hired-match-scorer")

        with mlflow.start_run() as run:
            run_id = run.info.run_id

            # Log all params
            for k, v in xgb_params.items():
                if k != "seed":
                    mlflow.log_param(k, v)
            for k, v in optuna_params.items():
                mlflow.log_param(f"optuna_{k}", v)

            mlflow.log_metric("precision", precision)
            mlflow.log_metric("ndcg", ndcg)

            # Log feature importance
            importance = model.get_score(importance_type="gain")
            for feat, gain in importance.items():
                mlflow.log_metric(f"gain_{feat}", gain)

            # Log model artifact
            mlflow.xgboost.log_model(
                model,
                artifact_path="model",
                registered_model_name=None,  # we register separately
            )

            # Log training feature stats for reproducibility
            mlflow.log_dict(
                {
                    "feature_names": _FEATURE_NAMES,
                    "feature_count": _FEATURE_COUNT,
                    "train_samples": int(X_train.shape[0]),
                },
                "training_metadata.json",
            )

        return run_id

    def _register_model(self, run_id: str) -> None:
        """Register the model from *run_id* in the MLflow Model Registry.

        The registered model is named ``match-scorer``.
        """
        import mlflow

        mlflow.set_tracking_uri(self._tracking_uri)

        model_uri = f"runs:/{run_id}/model"
        mlflow.register_model(model_uri=model_uri, name="match-scorer")
