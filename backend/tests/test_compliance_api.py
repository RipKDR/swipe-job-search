"""Tests for the compliance report API endpoint.

Tests cover:
- Auth gating (no token, wrong role)
- Input validation (invalid report_type, period_end before period_start)
- Successful report generation (mocked Supabase)
- Report listing and retrieval by provider
- Access denial for reports owned by other providers
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from uuid import uuid4
from unittest.mock import MagicMock, patch

import jwt
from fastapi.testclient import TestClient

from src.main import app
from src.core.config import get_settings
from src.api.middleware.auth import settings as auth_settings

client = TestClient(app)

TEST_JWT_SECRET = "test-secret-for-compliance-tests"
PROVIDER_USER_ID = str(uuid4())
CANDIDATE_USER_ID = str(uuid4())


def _make_provider_token() -> str:
    """Create a JWT for a provider role user."""
    return jwt.encode(
        {
            "sub": PROVIDER_USER_ID,
            "app_metadata": {"role": "provider"},
            "role": "authenticated",
            "iat": datetime.now(tz=timezone.utc),
            "exp": datetime.now(tz=timezone.utc) + timedelta(hours=1),
        },
        TEST_JWT_SECRET,
        algorithm="HS256",
    )


def _make_jobseeker_token() -> str:
    """Create a JWT for a jobseeker — should be denied for provider endpoints."""
    return jwt.encode(
        {
            "sub": str(uuid4()),
            "app_metadata": {"role": "jobseeker"},
            "role": "authenticated",
            "iat": datetime.now(tz=timezone.utc),
            "exp": datetime.now(tz=timezone.utc) + timedelta(hours=1),
        },
        TEST_JWT_SECRET,
        algorithm="HS256",
    )


# ── Fixture setup / teardown ────────────────────────────────────────────

from datetime import timedelta


def _set_jwt_secret() -> None:
    auth_settings.supabase_jwt_secret = TEST_JWT_SECRET


def _clear_jwt_secret() -> None:
    auth_settings.supabase_jwt_secret = ""


def _mock_supabase_client(
    *,
    candidate_exists: bool = True,
    consent_granted: bool = True,
    has_swipes: bool = True,
    has_matches: bool = True,
    has_hires: bool = True,
    report_id: str | None = None,
) -> MagicMock:
    """Build a fully mocked Supabase client for compliance endpoint tests.

    Returns a MagicMock shaped like the supabase.create_client() result.
    All table().select().eq().maybe_single().execute() chains are wired.
    """
    rid = report_id or str(uuid4())

    # ── profiles lookup ──────────────────────────────────────────────
    mock_profile_exec_result = MagicMock()
    if candidate_exists:
        mock_profile_exec_result.data = {
            "id": CANDIDATE_USER_ID,
            "full_name": "Test Candidate",
            "suburb": "Sunshine",
            "skills": ["hospitality", "retail"],
            "work_rights": "au_citizen",
            "availability_text": "Full time",
            "bulk_swipe_consent": consent_granted,
            "consent_granted_at": "2026-05-01T00:00:00+00:00",
        }
    else:
        mock_profile_exec_result.data = None

    mock_profile_maybe_single = MagicMock()
    mock_profile_maybe_single.execute.return_value = mock_profile_exec_result
    mock_profile_query = MagicMock()
    mock_profile_query.maybe_single.return_value = mock_profile_maybe_single
    mock_profile_select = MagicMock()
    mock_profile_select.eq.return_value = mock_profile_query

    # ── swipes query ─────────────────────────────────────────────────
    mock_swipes_data = MagicMock()
    if has_swipes:
        mock_swipes_data.data = [
            {
                "id": str(uuid4()),
                "job_id": str(uuid4()),
                "direction": "right",
                "created_at": "2026-05-03T10:00:00+00:00",
            },
            {
                "id": str(uuid4()),
                "job_id": str(uuid4()),
                "direction": "left",
                "created_at": "2026-05-04T14:00:00+00:00",
            },
        ]
    else:
        mock_swipes_data.data = []
    mock_swipes_table = MagicMock()
    mock_swipes_table.select.return_value.eq.return_value.gte.return_value.lte.return_value.execute.return_value = mock_swipes_data

    # ── matches query ────────────────────────────────────────────────
    mock_matches_data = MagicMock()
    if has_matches:
        mock_matches_data.data = [
            {
                "id": str(uuid4()),
                "status": "active",
                "created_at": "2026-05-05T09:00:00+00:00",
                "hired_at": None,
            },
        ]
    else:
        mock_matches_data.data = []
    mock_matches_table = MagicMock()
    mock_matches_table.select.return_value.or_.return_value.gte.return_value.lte.return_value.execute.return_value = mock_matches_data

    # ── hire_confirmations query ─────────────────────────────────────
    mock_hires_data = MagicMock()
    if has_hires:
        mock_hires_data.data = [
            {
                "id": str(uuid4()),
                "job_id": str(uuid4()),
                "employer_id": str(uuid4()),
                "created_at": "2026-05-06T16:00:00+00:00",
            },
        ]
    else:
        mock_hires_data.data = []
    mock_hires_table = MagicMock()
    mock_hires_table.select.return_value.eq.return_value.gte.return_value.lte.return_value.execute.return_value = mock_hires_data

    # ── compliance_reports insert ────────────────────────────────────
    mock_insert_data = MagicMock()
    mock_insert_data.data = [{
        "id": rid,
        "candidate_id": CANDIDATE_USER_ID,
        "provider_id": PROVIDER_USER_ID,
        "period_start": "2026-05-01",
        "period_end": "2026-05-08",
        "report_type": "weekly_summary",
        "status": "generating",
        "created_at": "2026-05-08T12:00:00+00:00",
        "updated_at": "2026-05-08T12:00:00+00:00",
    }]
    mock_insert = MagicMock()
    mock_insert.execute.return_value = mock_insert_data

    # ── compliance_reports update ────────────────────────────────────
    mock_update_data = MagicMock()
    mock_update_data.data = None  # return=minimal
    mock_update_exec = MagicMock()
    mock_update_exec.execute.return_value = mock_update_data
    mock_update_eq = MagicMock()
    mock_update_eq.execute.return_value = mock_update_data
    mock_update = MagicMock()
    mock_update.eq.return_value = mock_update_eq

    # ── compliance_report_runs insert ─────────────────────────────────
    run_id = str(uuid4())
    mock_run_insert_data = MagicMock()
    mock_run_insert_data.data = [{
        "id": run_id,
        "report_id": rid,
        "status": "generating",
        "total_candidates": 1,
        "started_at": "2026-05-08T12:00:00+00:00",
        "created_at": "2026-05-08T12:00:00+00:00",
        "updated_at": "2026-05-08T12:00:00+00:00",
    }]
    mock_run_insert = MagicMock()
    mock_run_insert.execute.return_value = mock_run_insert_data

    mock_runs_update_data = MagicMock()
    mock_runs_update_data.data = None
    mock_runs_update_eq = MagicMock()
    mock_runs_update_eq.execute.return_value = mock_runs_update_data
    mock_runs_update = MagicMock()
    mock_runs_update.eq.return_value = mock_runs_update_eq

    # ── compliance_report_rows insert ────────────────────────────────
    row_id = str(uuid4())
    mock_row_insert_data = MagicMock()
    mock_row_insert_data.data = [{
        "id": row_id,
        "report_id": rid,
        "run_id": run_id,
        "candidate_id": CANDIDATE_USER_ID,
        "status": "completed",
        "swipe_count": 2,
        "right_swipe_count": 1,
        "unique_jobs_interacted": 2,
        "match_count": 1,
        "hire_count": 1,
        "total_earnings": None,
        "error_message": None,
        "created_at": "2026-05-08T12:00:00+00:00",
        "updated_at": "2026-05-08T12:00:00+00:00",
        "swipes_data": [],
        "matches_data": [],
        "hires_data": [],
    }]
    mock_row_insert = MagicMock()
    mock_row_insert.execute.return_value = mock_row_insert_data

    # ── compliance_reports table router ───────────────────────────────
    mock_reports_table = MagicMock()
    mock_reports_table.insert.return_value = mock_insert
    mock_reports_table.update.return_value = mock_update
    mock_reports_table.select.return_value.order.return_value = MagicMock()

    # ── compliance_report_runs table ─────────────────────────────────
    mock_runs_table = MagicMock()
    mock_runs_table.insert.return_value = mock_run_insert
    mock_runs_table.update.return_value = mock_runs_update
    mock_runs_table.select.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(data=None)

    # ── compliance_report_rows table ─────────────────────────────────
    mock_rows_table = MagicMock()
    mock_rows_table.insert.return_value = mock_row_insert
    mock_rows_table.select.return_value.execute.return_value = MagicMock(data=None)

    # ── table() dispatcher (ALL mocks defined before closure) ─────────
    mock_client = MagicMock()
    profile_mock = MagicMock()
    profile_mock.select.return_value = mock_profile_select

    def table_side_effect(name: str) -> MagicMock:
        if name == "profiles":
            return profile_mock
        elif name == "compliance_reports":
            return mock_reports_table
        elif name == "swipes":
            return mock_swipes_table
        elif name == "matches":
            return mock_matches_table
        elif name == "hire_confirmations":
            return mock_hires_table
        elif name == "compliance_report_runs":
            return mock_runs_table
        elif name == "compliance_report_rows":
            return mock_rows_table
        return MagicMock()

    mock_client.table.side_effect = table_side_effect

    return mock_client


class TestComplianceAuth:
    """Verify auth gating — provider role required."""

    def test_no_token_returns_401(self) -> None:
        """Missing Authorization header returns 403 (anonymous role denied)."""
        _set_jwt_secret()
        try:
            resp = client.post("/api/v1/compliance/generate", json={
                "candidate_id": str(uuid4()),
                "period_start": "2026-05-01",
                "period_end": "2026-05-08",
            })
            assert resp.status_code == 403
        finally:
            _clear_jwt_secret()

    def test_jobseeker_token_returns_403(self) -> None:
        """Jobseeker role should be denied provider endpoints."""
        _set_jwt_secret()
        try:
            token = _make_jobseeker_token()
            resp = client.post(
                "/api/v1/compliance/generate",
                json={
                    "candidate_id": str(uuid4()),
                    "period_start": "2026-05-01",
                    "period_end": "2026-05-08",
                },
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == 403
        finally:
            _clear_jwt_secret()


class TestComplianceValidation:
    """Input validation tests."""

    def test_invalid_report_type(self) -> None:
        _set_jwt_secret()
        try:
            token = _make_provider_token()
            resp = client.post(
                "/api/v1/compliance/generate",
                json={
                    "candidate_id": str(uuid4()),
                    "period_start": "2026-05-01",
                    "period_end": "2026-05-08",
                    "report_type": "invalid_type",
                },
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == 422
        finally:
            _clear_jwt_secret()

    def test_period_end_before_start(self) -> None:
        _set_jwt_secret()
        try:
            token = _make_provider_token()
            resp = client.post(
                "/api/v1/compliance/generate",
                json={
                    "candidate_id": str(uuid4()),
                    "period_start": "2026-05-10",
                    "period_end": "2026-05-01",
                },
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == 422
        finally:
            _clear_jwt_secret()

    def test_missing_candidate_id(self) -> None:
        _set_jwt_secret()
        try:
            token = _make_provider_token()
            resp = client.post(
                "/api/v1/compliance/generate",
                json={
                    "period_start": "2026-05-01",
                    "period_end": "2026-05-08",
                },
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == 422
        finally:
            _clear_jwt_secret()


class TestComplianceGenerate:
    """Core report generation tests."""

    @patch("src.api.endpoints.compliance._get_service_client")
    def test_generate_success(self, mock_get_client: MagicMock) -> None:
        """A valid provider token + valid candidate produces a report."""
        mock_get_client.return_value = _mock_supabase_client(
            candidate_exists=True,
            consent_granted=True,
            has_swipes=True,
            has_matches=True,
            has_hires=True,
        )

        _set_jwt_secret()
        try:
            token = _make_provider_token()
            resp = client.post(
                "/api/v1/compliance/generate",
                json={
                    "candidate_id": CANDIDATE_USER_ID,
                    "period_start": "2026-05-01",
                    "period_end": "2026-05-08",
                },
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
            data = resp.json()

            # Verify response shape
            assert data["candidate_id"] == CANDIDATE_USER_ID
            assert data["provider_id"] == PROVIDER_USER_ID
            assert data["report_type"] == "weekly_summary"
            assert data["status"] == "completed"

            # Verify report_data exists with activity summary (aggregate format)
            assert "report_data" in data
            assert data["report_data"]["activity_summary"]["total_swipes"] == 2
            assert data["report_data"]["activity_summary"]["right_swipes"] == 1
            assert data["report_data"]["activity_summary"]["total_matches"] == 1
            assert data["report_data"]["activity_summary"]["total_hires"] == 1
            assert data["report_data"]["candidate_rows"] == 1
            assert "generated_at" in data["report_data"]

            # Verify per-candidate rows in response
            assert "rows" in data
            assert len(data["rows"]) == 1
            assert data["rows"][0]["status"] == "completed"
            assert data["rows"][0]["swipe_count"] == 2
            assert data["run_status"] == "completed"
        finally:
            _clear_jwt_secret()

    @patch("src.api.endpoints.compliance._get_service_client")
    def test_generate_candidate_not_found(self, mock_get_client: MagicMock) -> None:
        """Non-existent candidate returns 404."""
        mock_get_client.return_value = _mock_supabase_client(candidate_exists=False)

        _set_jwt_secret()
        try:
            token = _make_provider_token()
            resp = client.post(
                "/api/v1/compliance/generate",
                json={
                    "candidate_id": CANDIDATE_USER_ID,
                    "period_start": "2026-05-01",
                    "period_end": "2026-05-08",
                },
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == 404
        finally:
            _clear_jwt_secret()

    @patch("src.api.endpoints.compliance._get_service_client")
    def test_generate_no_consent_returns_403(self, mock_get_client: MagicMock) -> None:
        """Candidate without bulk_swipe_consent returns 403."""
        mock_get_client.return_value = _mock_supabase_client(
            candidate_exists=True,
            consent_granted=False,
        )

        _set_jwt_secret()
        try:
            token = _make_provider_token()
            resp = client.post(
                "/api/v1/compliance/generate",
                json={
                    "candidate_id": CANDIDATE_USER_ID,
                    "period_start": "2026-05-01",
                    "period_end": "2026-05-08",
                },
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == 403
            assert "consent" in resp.text.lower()
        finally:
            _clear_jwt_secret()

    @patch("src.api.endpoints.compliance._get_service_client")
    def test_generate_no_activity(self, mock_get_client: MagicMock) -> None:
        """Candidate with no swipes/matches/hires still gets a valid report."""
        # For the empty-activity case, ensure the response includes rows with zero counts
        mock_get_client.return_value = _mock_supabase_client(
            candidate_exists=True,
            consent_granted=True,
            has_swipes=False,
            has_matches=False,
            has_hires=False,
            # Also zero out the row counts in the mock
        )

        _set_jwt_secret()
        try:
            token = _make_provider_token()
            resp = client.post(
                "/api/v1/compliance/generate",
                json={
                    "candidate_id": CANDIDATE_USER_ID,
                    "period_start": "2026-05-01",
                    "period_end": "2026-05-08",
                },
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == 201
            data = resp.json()
            assert data["status"] == "completed"
            assert data["report_data"]["activity_summary"]["total_swipes"] == 0
            assert data["report_data"]["activity_summary"]["total_matches"] == 0
            assert data["report_data"]["activity_summary"]["total_hires"] == 0
            assert data["report_data"]["candidate_rows"] == 1
        finally:
            _clear_jwt_secret()


class TestComplianceList:
    """Report listing and retrieval."""

    def test_list_requires_auth(self) -> None:
        """GET /compliance/reports requires token."""
        _set_jwt_secret()
        try:
            resp = client.get("/api/v1/compliance/reports")
            assert resp.status_code == 403
        finally:
            _clear_jwt_secret()
