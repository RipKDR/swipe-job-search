"""Hi-Hired Backend — ML-powered match scoring with heuristic fallback.

Provides a :class:`LogisticMatchScorer` that scores a candidate profile
against a job posting.  When an XGBoost model has been registered in MLflow
the scorer loads it and produces model-based scores; otherwise it falls back
to a deterministic heuristic.
"""

from __future__ import annotations

import os
from typing import Any

import numpy as np
import structlog
import xgboost as xgb

from src.schemas.jobs import NormalizedJob

logger = structlog.get_logger()

# ---------------------------------------------------------------------------
# Feature indices — named constants so feature logic stays readable
# ---------------------------------------------------------------------------
_FEATURE_COUNT = 5  # skill_overlap, salary_alignment, location_match, type_match, bias


class LogisticMatchScorer:
    """Match scorer that caches an XGBoost model and falls back to heuristics.

    Parameters
    ----------
    model_uri :
        MLflow model URI (e.g. ``"models:/match-scorer/latest"``).
        If ``None`` the scorer attempts to read the ``MLFLOW_MODEL_URI``
        environment variable.  When neither is set, *or* the model cannot
        be loaded, all scoring goes through :meth:`_heuristic_score`.
    """

    def __init__(self, model_uri: str | None = None) -> None:
        self._model_uri = model_uri or os.getenv("MLFLOW_MODEL_URI")
        self._model: xgb.Booster | None = None
        self._loaded = False  # True after a load *attempt* (successful or not)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def score(
        self,
        user_profile: dict[str, Any],
        job: NormalizedJob,
    ) -> float:
        """Return a match score in ``[0, 1]`` for *user_profile* vs *job*.

        Uses the ML model when available; otherwise falls back to the
        deterministic heuristic scorer.
        """
        features = self._compute_features(user_profile, job).reshape(1, -1)
        model = self._load_model()
        if model is not None:
            dmat = xgb.DMatrix(features)
            score = float(model.predict(dmat)[0])
            # XGBoost raw margin — clamp to [0, 1]
            score = max(0.0, min(1.0, score))
            logger.debug("ml_score", score=round(score, 4), job=str(job.id))
            return score

        return self._heuristic_score(user_profile, job)

    # ------------------------------------------------------------------
    # Feature engineering
    # ------------------------------------------------------------------

    @staticmethod
    def _compute_features(
        user_profile: dict[str, Any],
        job: NormalizedJob,
    ) -> np.ndarray:
        """Build a 5-dimensional feature vector from profile and job.

        Features
        --------
        0. **skill_overlap** — Jaccard similarity between required skills
           and the candidate's skills.
        1. **salary_alignment** — 1.0 if expected salary ≤ job max, else
           a linear decay down to 0 at 2× the max.
        2. **location_match** — 1.0 when suburb matches (case-insensitive),
           otherwise 0.0.  (Future: geo-distance.)
        3. **type_match** — 1.0 when the preferred employment type matches.
        4. **bias** — always 1.0 (intercept term).
        """
        user_skills = set(s.strip().lower() for s in user_profile.get("skills", []) if s)
        job_skills = set(r.name.strip().lower() for r in job.requirements if r.name.strip())
        union = user_skills | job_skills
        skill_overlap = len(user_skills & job_skills) / len(union) if union else 0.0

        # Salary alignment
        expected = user_profile.get("expected_salary")
        salary_alignment = 0.0
        if expected is not None and job.salary is not None:
            max_salary = job.salary.max
            if max_salary > 0:
                if expected <= max_salary:
                    salary_alignment = 1.0
                else:
                    ratio = expected / max_salary
                    salary_alignment = max(0.0, 2.0 - ratio)

        # Location match
        user_suburb = user_profile.get("suburb", "").strip().lower()
        job_suburb = job.location.suburb.strip().lower() if job.location.suburb else ""
        location_match = 1.0 if user_suburb and user_suburb == job_suburb else 0.0

        # Type match
        pref_type = user_profile.get("preferred_type")
        type_match = 1.0 if pref_type and job.employment_type.value == pref_type else 0.0

        feat = np.zeros(_FEATURE_COUNT, dtype=np.float64)
        feat[0] = skill_overlap
        feat[1] = salary_alignment
        feat[2] = location_match
        feat[3] = type_match
        feat[4] = 1.0  # bias
        return feat

    # ------------------------------------------------------------------
    # Heuristic fallback scorer
    # ------------------------------------------------------------------

    @staticmethod
    def _heuristic_score(
        user_profile: dict[str, Any],
        job: NormalizedJob,
    ) -> float:
        """Deterministic rule-based score in ``[0, 1]``.

        Weights (summing to 1.0 for bounded output):

        * **Skills** (0.45): Jaccard overlap.
        * **Salary** (0.30): Linear alignment.
        * **Location** (0.15): Exact suburb match.
        * **Type** (0.10): Employment-type match.
        """
        feat = LogisticMatchScorer._compute_features(user_profile, job)

        weights = np.array([0.45, 0.30, 0.15, 0.10, 0.0], dtype=np.float64)
        raw = float(np.dot(feat, weights))
        return max(0.0, min(1.0, raw))

    # ------------------------------------------------------------------
    # Model loading
    # ------------------------------------------------------------------

    def _load_model(self) -> xgb.Booster | None:
        """Load the XGBoost model from MLflow (once).

        Returns ``None`` when no URI is configured or loading fails, which
        causes the scorer to use the heuristic fallback.
        """
        if self._loaded:
            return self._model

        self._loaded = True

        uri = self._model_uri
        if not uri:
            logger.info("No MLflow model URI configured — using heuristic scorer")
            return None

        try:
            import mlflow

            self._model = mlflow.xgboost.load_model(uri)
            logger.info("Loaded XGBoost model from %s", uri)
        except Exception:
            logger.exception("Failed to load XGBoost model from MLflow", uri=uri)
            return None

        return self._model
