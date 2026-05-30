"""Tests for the forecast (offer-potential) API endpoint."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi.testclient import TestClient

from src.main import app
from src.schemas.jobs import (
    EmploymentType,
    Location,
    NormalizedJob,
    SalaryRange,
    SkillRequirement,
)

client = TestClient(app)


def _make_job(
    title: str = "Barista",
    skills: list[str] | None = None,
    suburb: str = "Tullamarine",
    salary_max: float = 45_000,
    employment_type: str = "full_time",
) -> NormalizedJob:
    return NormalizedJob(
        id=uuid4(),
        title=title,
        company_name="Test Co",
        location=Location(suburb=suburb, state="VIC", postcode="3043"),
        employment_type=EmploymentType(employment_type),
        salary=SalaryRange(min=30_000, max=salary_max),
        description="A test job for scoring.",
        requirements=(
            [SkillRequirement(name=s, mandatory=False) for s in (skills or ["hospitality"])]
        ),
        benefits=[],
        posted_at=datetime.now(tz=timezone.utc),
        expires_at=datetime.now(tz=timezone.utc) + timedelta(days=30),
    )


_USER_PROFILE = {
    "user_id": "test-user-001",
    "skills": ["hospitality", "customer service", "cash handling"],
    "suburb": "Tullamarine",
    "expected_salary": 40_000,
    "preferred_type": "full_time",
    "industry_preferences": ["hospitality", "retail"],
}


class TestForecastEndpoint:
    """Test the POST /api/v1/forecast/score endpoint."""

    def test_score_valid(self):
        """Score a job with a matching profile — returns 200 with score data."""
        job = _make_job()
        resp = client.post(
            "/api/v1/forecast/score",
            json={
                "job_id": str(job.id),
                "user_profile": _USER_PROFILE,
                "job": job.model_dump(mode="json"),
            },
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert isinstance(data["score"], float)
        assert 0.0 <= data["score"] <= 1.0
        assert isinstance(data["matching_skills"], list)
        assert isinstance(data["missing_skills"], list)
        assert data["confidence"] in ("high", "medium", "low")
        assert isinstance(data["reasoning"], str)
        assert len(data["reasoning"]) > 0

    def test_score_strong_match(self):
        """Profile matching job well should yield a high score."""
        job = _make_job(
            skills=["hospitality", "customer service", "cash handling"],
        )
        resp = client.post(
            "/api/v1/forecast/score",
            json={
                "job_id": str(job.id),
                "user_profile": _USER_PROFILE,
                "job": job.model_dump(mode="json"),
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["score"] >= 0.5, f"Expected high score, got {data['score']}"
        assert "hospitality" in data["matching_skills"]

    def test_score_missing_skills(self):
        """Skills absent from profile should appear in missing_skills."""
        job = _make_job(
            skills=["python", "react", "docker"],
        )
        resp = client.post(
            "/api/v1/forecast/score",
            json={
                "job_id": str(job.id),
                "user_profile": _USER_PROFILE,
                "job": job.model_dump(mode="json"),
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["missing_skills"]) > 0
        for s in ("python", "react", "docker"):
            assert s in data["missing_skills"]

    def test_score_invalid_job(self):
        """An empty job_id should return 422."""
        resp = client.post(
            "/api/v1/forecast/score",
            json={
                "job_id": "",
                "user_profile": _USER_PROFILE,
                "job": _make_job().model_dump(mode="json"),
            },
        )
        assert resp.status_code == 422

    def test_score_caching(self):
        """Requesting the same (user_id, job_id) twice should return the cached result."""
        job = _make_job()
        body = {
            "job_id": str(job.id),
            "user_profile": _USER_PROFILE,
            "job": job.model_dump(mode="json"),
        }
        resp1 = client.post("/api/v1/forecast/score", json=body)
        resp2 = client.post("/api/v1/forecast/score", json=body)
        assert resp1.status_code == 200
        assert resp2.status_code == 200
        assert resp1.json() == resp2.json()

    def test_score_different_users_different_results(self):
        """Two different user profiles should produce different scores for the same job."""
        job = _make_job()
        profile_b = dict(_USER_PROFILE)
        profile_b["user_id"] = "test-user-002"
        profile_b["skills"] = []

        body_a = {
            "job_id": str(job.id),
            "user_profile": _USER_PROFILE,
            "job": job.model_dump(mode="json"),
        }
        body_b = {
            "job_id": str(job.id),
            "user_profile": profile_b,
            "job": job.model_dump(mode="json"),
        }
        resp_a = client.post("/api/v1/forecast/score", json=body_a)
        resp_b = client.post("/api/v1/forecast/score", json=body_b)
        assert resp_a.status_code == 200
        assert resp_b.status_code == 200
        assert resp_a.json()["score"] > resp_b.json()["score"]


class TestForecastBatchEndpoint:
    """Test the POST /api/v1/forecast/batch endpoint."""

    def test_batch_valid(self):
        """Score multiple jobs in one call."""
        jobs = [
            _make_job(title="Barista", skills=["hospitality"]),
            _make_job(title="Chef", skills=["cookery", "hospitality"], suburb="Sydney"),
        ]
        payload = {
            "user_profile": _USER_PROFILE,
            "jobs": [j.model_dump(mode="json") for j in jobs],
        }
        resp = client.post("/api/v1/forecast/batch", json=payload)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["total"] == 2
        assert len(data["results"]) == 2
        # Results should be sorted descending by score
        scores = [r["score"] for r in data["results"]]
        assert scores == sorted(scores, reverse=True)

    def test_batch_empty_profile(self):
        """An empty profile should still yield scores (low ones)."""
        profile = {
            "user_id": "test-user-empty",
            "skills": [],
            "suburb": "",
            "expected_salary": None,
            "preferred_type": None,
            "industry_preferences": [],
        }
        jobs = [
            _make_job(title="Engineer", skills=["python"]),
        ]
        payload = {
            "user_profile": profile,
            "jobs": [j.model_dump(mode="json") for j in jobs],
        }
        resp = client.post("/api/v1/forecast/batch", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["results"][0]["score"] >= 0.0

    def test_batch_missing_jobs_field(self):
        """Request without jobs should return 422."""
        payload = {"user_profile": _USER_PROFILE}
        resp = client.post("/api/v1/forecast/batch", json=payload)
        assert resp.status_code == 422

    def test_batch_empty_jobs(self):
        """Request with empty jobs list should return 422."""
        payload = {
            "user_profile": _USER_PROFILE,
            "jobs": [],
        }
        resp = client.post("/api/v1/forecast/batch", json=payload)
        assert resp.status_code == 422

    def test_batch_max_jobs_exceeded(self):
        """Request with more than 100 jobs should return 422."""
        jobs = [_make_job(title=f"Job {i}") for i in range(101)]
        payload = {
            "user_profile": _USER_PROFILE,
            "jobs": [j.model_dump(mode="json") for j in jobs],
        }
        resp = client.post("/api/v1/forecast/batch", json=payload)
        assert resp.status_code == 422
