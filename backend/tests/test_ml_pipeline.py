"""Tests for the ML match scoring pipeline (match_scorer + ml_pipeline)."""

from __future__ import annotations

from datetime import datetime, timezone as tz
from typing import Any
from uuid import uuid4

import numpy as np
import optuna
import pandas as pd
import pytest

from src.schemas.jobs import (
    EmploymentType,
    Location,
    NormalizedJob,
    SalaryRange,
    SkillRequirement,
)
from src.services.match_scorer import LogisticMatchScorer
from src.services.ml_pipeline import MatchTrainingPipeline

utc = tz.utc


# ── Helpers ────────────────────────────────────────────────────────────


def _make_job(
    title: str = "Software Engineer",
    skills: list[str] | None = None,
    suburb: str = "Fitzroy",
    salary_max: float = 120_000.0,
    emp_type: str = "full_time",
) -> NormalizedJob:
    now = datetime.now(utc)
    return NormalizedJob(
        id=uuid4(),
        title=title,
        company_name="Acme",
        location=Location(suburb=suburb, state="VIC", postcode="3065"),
        salary=SalaryRange(min=80_000.0, max=salary_max, currency="AUD", period="yearly"),
        employment_type=EmploymentType(emp_type),
        description="A great job.",
        requirements=[SkillRequirement(name=s) for s in (skills or ["Python"])],
        posted_at=now,
        expires_at=now.replace(year=now.year + 1),
    )


def _make_profile(**overrides: Any) -> dict[str, Any]:
    defaults = {
        "user_id": "user_001",
        "skills": ["Python", "SQL"],
        "suburb": "Fitzroy",
        "expected_salary": 110_000.0,
        "preferred_type": "full_time",
    }
    defaults.update(overrides)
    return defaults


# ── LogisticMatchScorer tests ─────────────────────────────────────────


class TestMatchScorer:
    def test_heuristic_score_range(self):
        """Heuristic score is always in [0, 1] for various inputs."""
        scorer = LogisticMatchScorer()

        # Perfect match: same suburb, type, skills, salary within range
        profile = _make_profile()
        job = _make_job()
        score = scorer._heuristic_score(profile, job)
        assert 0.0 <= score <= 1.0, f"Score {score} out of [0, 1]"

        # No match at all
        profile_no = _make_profile(
            skills=[],
            suburb="Nowhere",
            expected_salary=500_000.0,
            preferred_type="casual",
        )
        job_no = _make_job(
            skills=["Rust", "OCaml"],
            suburb="Sydney",
            emp_type="full_time",
        )
        score_no = scorer._heuristic_score(profile_no, job_no)
        assert 0.0 <= score_no <= 1.0, f"Score {score_no} out of [0, 1]"
        # Should be much lower than a good match
        assert score_no < score

    def test_heuristic_score_skill_overlap(self):
        """More skill overlap produces a higher heuristic score."""
        scorer = LogisticMatchScorer()
        job = _make_job(skills=["Python", "SQL", "Docker"])

        profile_low = _make_profile(skills=["Java"])
        profile_high = _make_profile(skills=["Python", "SQL", "Docker", "K8s"])

        score_low = scorer._heuristic_score(profile_low, job)
        score_high = scorer._heuristic_score(profile_high, job)
        assert score_high > score_low, (
            f"Expected high-skill score ({score_high}) > low-skill score ({score_low})"
        )

    def test_heuristic_score_location_bonus(self):
        """Matching suburb adds to the heuristic score."""
        scorer = LogisticMatchScorer()
        base_profile = _make_profile()
        job = _make_job(suburb="Fitzroy")

        score_same = scorer._heuristic_score(base_profile, job)

        diff_profile = _make_profile(suburb="Brunswick")
        score_diff = scorer._heuristic_score(diff_profile, job)
        assert score_same > score_diff

    def test_heuristic_score_type_bonus(self):
        """Matching employment type adds to the heuristic score."""
        scorer = LogisticMatchScorer()
        base_profile = _make_profile(preferred_type="full_time")
        job = _make_job(emp_type="full_time")
        score_match = scorer._heuristic_score(base_profile, job)

        mismatch_profile = _make_profile(preferred_type="casual")
        score_mismatch = scorer._heuristic_score(mismatch_profile, job)
        assert score_match >= score_mismatch

    def test_heuristic_score_salary_alignment(self):
        """Salary below or at max gets higher score than over the max."""
        scorer = LogisticMatchScorer()
        job = _make_job(salary_max=100_000.0)

        profile_in = _make_profile(expected_salary=90_000.0)
        profile_over = _make_profile(expected_salary=200_000.0)

        score_in = scorer._heuristic_score(profile_in, job)
        score_over = scorer._heuristic_score(profile_over, job)
        assert score_in > score_over

    def test_compute_features_shape(self):
        """Feature vector has the expected shape and values."""
        profile = _make_profile()
        job = _make_job()
        feat = LogisticMatchScorer._compute_features(profile, job)

        assert isinstance(feat, np.ndarray)
        assert feat.shape == (5,)
        assert feat[4] == 1.0  # bias

        # skill_overlap: {python, sql} ∩ {python} / {python, sql, python} = 1/2 = 0.5
        assert feat[0] == pytest.approx(0.5, abs=1e-6)
        # salary_alignment: expected 110k / max 120k → within range → 1.0
        assert feat[1] == 1.0
        # location_match: same suburb
        assert feat[2] == 1.0
        # type_match: same type
        assert feat[3] == 1.0

    def test_score_without_model_falls_back_to_heuristic(self):
        """When no model URI is set, score() returns heuristic result."""
        scorer = LogisticMatchScorer(model_uri=None)
        profile = _make_profile()
        job = _make_job()

        heuristic = scorer._heuristic_score(profile, job)
        result = scorer.score(profile, job)
        assert result == heuristic


# ── MatchTrainingPipeline tests ───────────────────────────────────────


class TestMatchTrainingPipeline:
    def test_create_dummy_data_shape_and_columns(self):
        """Dummy data has correct shape and all expected columns."""
        n = 100
        df = MatchTrainingPipeline._create_dummy_data(n_samples=n)
        assert isinstance(df, pd.DataFrame)
        assert df.shape == (n, 6)  # 5 features + label

        expected_cols = {
            "skill_overlap",
            "salary_alignment",
            "location_match",
            "type_match",
            "bias",
            "label",
        }
        assert set(df.columns) == expected_cols

        # Feature values are in expected ranges
        assert df["skill_overlap"].between(0, 1).all()
        assert df["salary_alignment"].between(0, 1).all()
        assert df["location_match"].isin([0, 1]).all()
        assert df["type_match"].isin([0, 1]).all()
        assert (df["bias"] == 1.0).all()
        assert df["label"].isin([0, 1]).all()

        # At least some positive and negative examples
        assert df["label"].sum() > 0, "Expected some positive labels"
        assert df["label"].sum() < n, "Expected some negative labels"

    @pytest.mark.slow
    def test_train_runs(self):
        """Full pipeline runs end-to-end and returns expected keys."""
        pipeline = MatchTrainingPipeline(mlflow_tracking_uri="file:./mlruns_test")
        data = pipeline._create_dummy_data(n_samples=200)
        result = pipeline.train(data)

        assert isinstance(result, dict)
        assert "run_id" in result
        assert "precision" in result
        assert "ndcg" in result
        assert "model_registered" in result
        assert isinstance(result["run_id"], str)
        assert len(result["run_id"]) > 0
        assert 0.0 <= result["precision"] <= 1.0
        assert 0.0 <= result["ndcg"] <= 1.0

    @pytest.mark.slow
    def test_promotion_gate(self):
        """Model is registered when NDCG > 0.3.

        With synthetic data generated from a clean signal we expect
        NDCG well above 0.3.
        """
        pipeline = MatchTrainingPipeline(mlflow_tracking_uri="file:./mlruns_test_gate")
        data = pipeline._create_dummy_data(n_samples=200)
        result = pipeline.train(data)

        # With the strong signal in dummy data, NDCG should exceed the gate
        assert result["ndcg"] > 0.3, (
            f"Expected NDCG > 0.3 for signal-rich dummy data, got {result['ndcg']}"
        )
        assert result["model_registered"] is True, (
            "Model should be registered when NDCG exceeds promotion gate"
        )

    @pytest.mark.slow
    def test_optimize_hyperparams_returns_study(self):
        """Optuna returns a study with best_params populated."""
        pipeline = MatchTrainingPipeline()
        data = pipeline._create_dummy_data(n_samples=300)
        X = data[
            ["skill_overlap", "salary_alignment", "location_match", "type_match", "bias"]
        ].values
        y = data["label"].values

        study = pipeline.optimize_hyperparams(X, y, n_trials=5)
        assert isinstance(study, optuna.Study)
        assert hasattr(study, "best_params")
        assert "max_depth" in study.best_params
        assert "learning_rate" in study.best_params
        assert "n_estimators" in study.best_params
        assert "subsample" in study.best_params
