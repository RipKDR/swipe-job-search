"""Tests for the data pruner service.

Uses pytest-asyncio for async test support and mocks httpx for
URL verification tests.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import httpx

from src.services.data_pruner import EXPIRED_INDICATORS, DataPruner


class TestDataPruner:
    """Unit tests for :class:`DataPruner`."""

    # ── Constants ───────────────────────────────────────────────────────

    def test_expired_indicators_defined(self):
        """EXPIRED_INDICATORS constant should be a non-empty list of strings
        covering common 'job closed' phrasing (position filled, no longer
        accepting, job has been closed, no longer accepting applications)."""
        assert isinstance(EXPIRED_INDICATORS, list), "Expected a list"
        assert len(EXPIRED_INDICATORS) >= 4, "Expected at least 4 indicators"
        for indicator in EXPIRED_INDICATORS:
            assert isinstance(indicator, str), f"Expected string, got {type(indicator)}"
            assert len(indicator) > 0, "Expected non-empty indicator string"

    # ── verify_job_url ──────────────────────────────────────────────────

    @patch("src.services.data_pruner.httpx.AsyncClient")
    async def test_verify_job_url_active(self, mock_client_cls: MagicMock) -> None:
        """A 200 response with no expired indicators returns (True, 'active')."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "<html><body><h1>Software Engineer</h1><p>Join us!</p></body></html>"

        mock_client = AsyncMock()
        mock_client.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
        mock_client_cls.return_value = mock_client

        pruner = DataPruner()
        is_active, reason = await pruner.verify_job_url("https://example.com/jobs/1")

        assert is_active is True
        assert reason == "active"

    @patch("src.services.data_pruner.httpx.AsyncClient")
    async def test_verify_job_url_not_found(self, mock_client_cls: MagicMock) -> None:
        """A 404 response returns (False, 'not_found')."""
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.text = ""

        mock_client = AsyncMock()
        mock_client.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
        mock_client_cls.return_value = mock_client

        pruner = DataPruner()
        is_active, reason = await pruner.verify_job_url("https://example.com/jobs/gone")

        assert is_active is False
        assert reason == "not_found"

    @patch("src.services.data_pruner.httpx.AsyncClient")
    async def test_verify_job_url_gone(self, mock_client_cls: MagicMock) -> None:
        """A 410 response returns (False, 'not_found')."""
        mock_response = MagicMock()
        mock_response.status_code = 410
        mock_response.text = ""

        mock_client = AsyncMock()
        mock_client.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
        mock_client_cls.return_value = mock_client

        pruner = DataPruner()
        is_active, reason = await pruner.verify_job_url("https://example.com/jobs/gone410")

        assert is_active is False
        assert reason == "not_found"

    @patch("src.services.data_pruner.httpx.AsyncClient")
    async def test_verify_job_url_expired_content_indicator(
        self, mock_client_cls: MagicMock
    ) -> None:
        """Body containing 'position filled' returns (False, 'content_indicator: …')."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = (
            "<html><body><p>This position filled. Thank you for your interest.</p></body></html>"
        )

        mock_client = AsyncMock()
        mock_client.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
        mock_client_cls.return_value = mock_client

        pruner = DataPruner()
        is_active, reason = await pruner.verify_job_url("https://example.com/jobs/filled")

        assert is_active is False
        assert "content_indicator" in reason
        assert "position filled" in reason

    @patch("src.services.data_pruner.httpx.AsyncClient")
    async def test_verify_job_url_multiple_indicators(self, mock_client_cls: MagicMock) -> None:
        """Each indicator in EXPIRED_INDICATORS triggers a content match."""
        pruner = DataPruner()

        for indicator in EXPIRED_INDICATORS:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.text = f"<html><body>{indicator}.</body></html>"

            mock_client = AsyncMock()
            # Create a fresh AsyncClient mock per iteration
            mock_client.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
            mock_client_cls.return_value = mock_client

            is_active, reason = await pruner.verify_job_url(
                f"https://example.com/jobs/test-{indicator[:10]}"
            )
            assert is_active is False, f"Failed for indicator: {indicator}"
            # The first match in list-order wins. If the body contains
            # an indicator that is a substring of another indicator later
            # in the list, the shorter one matches first.
            assert "content_indicator" in reason, (
                f"Expected content match for indicator: {indicator}"
            )
            # Verify the body text actually triggered a match
            matched_indicator = reason.split("content_indicator: ", 1)[1]
            assert matched_indicator in indicator or indicator in matched_indicator, (
                f"For body with '{indicator}', got reason '{reason}'"
            )

    @patch("src.services.data_pruner.httpx.AsyncClient")
    async def test_verify_job_url_connect_error(self, mock_client_cls: MagicMock) -> None:
        """Connection errors return (True, 'verification_error: ConnectError')
        — jobs are kept active on transient failures."""
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value.get = AsyncMock(
            side_effect=httpx.ConnectError("Connection refused")
        )
        mock_client_cls.return_value = mock_client

        pruner = DataPruner()
        is_active, reason = await pruner.verify_job_url("https://example.com/jobs/down")

        assert is_active is True
        assert reason == "verification_error: ConnectError"

    @patch("src.services.data_pruner.httpx.AsyncClient")
    async def test_verify_job_url_timeout_error(self, mock_client_cls: MagicMock) -> None:
        """Timeouts return (True, 'verification_error: TimeoutException')."""
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value.get = AsyncMock(
            side_effect=httpx.TimeoutException("Timed out")
        )
        mock_client_cls.return_value = mock_client

        pruner = DataPruner()
        is_active, reason = await pruner.verify_job_url("https://example.com/jobs/slow")

        assert is_active is True
        assert reason == "verification_error: TimeoutException"

    @patch("src.services.data_pruner.httpx.AsyncClient")
    async def test_verify_job_url_server_error(self, mock_client_cls: MagicMock) -> None:
        """A 5xx server error returns (True, 'verification_error: http_500')
        — kept active since the server may recover."""
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"

        mock_client = AsyncMock()
        mock_client.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
        mock_client_cls.return_value = mock_client

        pruner = DataPruner()
        is_active, reason = await pruner.verify_job_url("https://example.com/jobs/error")

        assert is_active is True
        assert reason == "verification_error: http_500"

    # ── verify_active_jobs ───────────────────────────────────────────────

    @patch("src.services.data_pruner.httpx.AsyncClient")
    async def test_verify_active_jobs_none_found(self, mock_client_cls: MagicMock) -> None:
        """When no active jobs older than 24h exist, (0, 0) is returned."""
        mock_supabase = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.lt.return_value.execute.return_value = mock_result

        pruner = DataPruner()
        checked, expired = await pruner.verify_active_jobs(mock_supabase)

        assert checked == 0
        assert expired == 0
        # Ensure no HTTP calls were made
        mock_client_cls.assert_not_called()

    @patch("src.services.data_pruner.httpx.AsyncClient")
    async def test_verify_active_jobs_deletes_expired(self, mock_client_cls: MagicMock) -> None:
        """Active jobs older than 24h with dead URLs get soft-deleted."""
        # ── seed job data ────────────────────────────────────────────
        jobs = [
            {
                "id": "job-001",
                "source_url": "https://example.com/jobs/active1",
                "source_name": "seek",
            },
            {
                "id": "job-002",
                "source_url": "https://example.com/jobs/dead1",
                "source_name": "seek",
            },
            {
                "id": "job-003",
                "source_url": "https://example.com/jobs/active2",
                "source_name": "linkedin",
            },
        ]

        mock_result = MagicMock()
        mock_result.data = jobs
        mock_supabase = MagicMock()
        mock_supabase.table.return_value.select.return_value.eq.return_value.lt.return_value.execute.return_value = mock_result

        # ── mock per-URL HTTP responses ──────────────────────────────
        async def mock_get(url: str) -> MagicMock:
            resp = MagicMock()
            if "dead1" in url:
                resp.status_code = 404
                resp.text = ""
            else:
                resp.status_code = 200
                resp.text = "<html><body>Active listing</body></html>"
            return resp

        mock_client = AsyncMock()
        mock_client.__aenter__.return_value.get = mock_get
        mock_client_cls.return_value = mock_client

        # ── run ──────────────────────────────────────────────────────
        pruner = DataPruner()
        checked, expired = await pruner.verify_active_jobs(mock_supabase)

        assert checked == 3
        assert expired == 1  # only job-002 expired

        # ── verify supabase update was called for the dead job ───────
        mock_supabase.table.assert_any_call("jobs")
        update_call = mock_supabase.table.return_value.update
        update_call.assert_called_once_with(
            {
                "is_active": False,
                "expired_reason": "not_found",
                "expired_at": mock_supabase.table.return_value.update.call_args[0][0]["expired_at"],
            }
        )
        # The update should target the expired job by id
        update_call.return_value.eq.assert_called_once_with("id", "job-002")
        update_call.return_value.eq.return_value.execute.assert_called_once()

        # ── health monitor should have recorded both attempts ────────
        health = pruner.health
        assert health.success_rate("seek") < 1.0  # 1 success + 1 failure in window
        assert health.success_rate("linkedin") == 1.0  # all successes
        assert health.is_quarantined("seek") is False  # only 1 failure < max_consecutive
