"""Tests for the FastAPI API layer."""

from __future__ import annotations

from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


class TestHealth:
    def test_health_returns_ok(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["version"] == "0.1.0"


class TestIngestJob:
    def test_ingest_valid_job(self):
        resp = client.post(
            "/api/v1/jobs/ingest",
            json={
                "title": "Barista",
                "location_raw": "Tullamarine, VIC 3043",
                "salary_raw": "$30-$40/hr",
                "source_url": "https://test.com/job/1",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Barista"
        assert data["location"]["suburb"] == "Tullamarine"
        assert data["location"]["state"] == "VIC"
        assert data["location"]["postcode"] == "3043"
        assert data["salary"]["period"] == "hourly"
        assert data["salary"]["min"] == 30
        assert data["salary"]["max"] == 40
        assert data["employment_type"] == "full_time"
        assert data["is_active"] is True
        assert "id" in data
        assert "posted_at" in data
        assert "expires_at" in data

    def test_ingest_with_company(self):
        resp = client.post(
            "/api/v1/jobs/ingest",
            json={
                "title": "Senior Developer",
                "company_name": "Tech Co",
                "location_raw": "Sydney NSW 2000",
                "salary_raw": "$150k-$180k",
                "employment_type_raw": "contract",
                "source_url": "https://test.com/job/2",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["company_name"] == "Tech Co"
        assert data["employment_type"] == "contract"
        assert data["salary"]["min"] == 150000
        assert data["salary"]["max"] == 180000

    def test_ingest_invalid_empty_title(self):
        resp = client.post(
            "/api/v1/jobs/ingest",
            json={"title": ""},
        )
        assert resp.status_code == 422

    def test_ingest_profanity_blocked(self):
        resp = client.post(
            "/api/v1/jobs/ingest",
            json={
                "title": "Need porn actor",
                "location_raw": "Sydney NSW 2000",
            },
        )
        assert resp.status_code == 422
        assert "blocked" in resp.json()["detail"].lower()

    def test_ingest_part_time(self):
        resp = client.post(
            "/api/v1/jobs/ingest",
            json={
                "title": "Sales Assistant",
                "location_raw": "Melbourne VIC 3000",
                "employment_type_raw": "part-time",
                "salary_raw": "Competitive",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["employment_type"] == "part_time"
        assert data["salary"] is None

    def test_ingest_with_requirements(self):
        resp = client.post(
            "/api/v1/jobs/ingest",
            json={
                "title": "Python Developer",
                "location_raw": "Brisbane QLD 4000",
                "description_raw": "Requirements:\n• 3+ years Python\n• AWS experience required",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["requirements"]) > 0
        # At least one requirement should mention Python or AWS
        all_names = [r["name"] for r in data["requirements"]]
        assert any("Python" in n for n in all_names) or any("AWS" in n for n in all_names)

    def test_ingest_casual_employment(self):
        resp = client.post(
            "/api/v1/jobs/ingest",
            json={
                "title": "Hospitality Worker",
                "employment_type_raw": "casual",
                "location_raw": "Adelaide SA 5000",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["employment_type"] == "casual"
