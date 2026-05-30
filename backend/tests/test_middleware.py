"""Tests for the API security middleware layer.

Covers:
- Health endpoint bypasses auth / rate limiting
- Token bucket rate limiter mechanics
- RateLimitMiddleware integration with TestClient
- JWT token verification (HS256)
- RBAC role hierarchy and require_role dependency
"""

from __future__ import annotations

import time

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from jose import jwt

from src.api.middleware.auth import (
    ROLE_HIERARCHY,
    AuthClaims,
    get_current_user,
    require_role,
    verify_access_token,
)
from src.api.middleware.rate_limit import (
    ROLE_RATE_LIMITS,
    TokenBucket,
    _rate_limiter,
)
from src.core.config import get_settings
from src.main import app

settings = get_settings()
client = TestClient(app)

# Test JWT secret — not a real production secret
TEST_JWT_SECRET = "test-hs256-secret-for-unit-tests-only"


# ── Health endpoint ────────────────────────────────────────────────────


class TestHealth:
    """Health endpoint should be accessible without authentication
    and should bypass rate limiting entirely."""

    def test_health_returns_ok(self) -> None:
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["version"] == "0.1.0"

    def test_health_bypasses_rate_limiter(self) -> None:
        """Make well over the anonymous limit — health endpoint should
        never return 429."""
        for _ in range(50):
            resp = client.get("/health")
            assert resp.status_code == 200


# ── Token Bucket unit tests ───────────────────────────────────────────


class TestTokenBucket:
    """Direct unit tests for the token bucket algorithm."""

    def test_consume_within_capacity(self) -> None:
        bucket = TokenBucket(capacity=10)
        for _ in range(10):
            assert bucket.consume(), "All 10 requests should be allowed"

    def test_blocked_when_empty(self) -> None:
        bucket = TokenBucket(capacity=3)
        bucket.consume(3)
        assert not bucket.consume(), "Request after capacity exhausted should block"

    def test_refill_over_time(self) -> None:
        """After draining, the bucket should slowly refill."""
        bucket = TokenBucket(capacity=60)  # 1 token per second
        bucket.consume(60)  # drain
        assert not bucket.consume(), "Should be empty immediately after drain"

        time.sleep(1.5)  # refills ~1.5 tokens
        # Should have at least 1 token now (conservative: 0.5s margin)
        assert bucket.consume(), "Should have refilled at least 1 token"

    def test_bulk_consume(self) -> None:
        bucket = TokenBucket(capacity=100)
        assert bucket.consume(100), "Bulk consume should work within capacity"
        assert not bucket.consume(1), "Should be empty after bulk consume"

    def test_capacity_ceiling(self) -> None:
        """Tokens should never exceed capacity, even after long idle."""
        bucket = TokenBucket(capacity=10)
        time.sleep(0.5)
        assert bucket.tokens <= 10.0, "Tokens should not exceed capacity"

    def test_multiple_buckets_independent(self) -> None:
        a = TokenBucket(capacity=5)
        b = TokenBucket(capacity=5)
        a.consume(5)
        assert not a.consume(), "Bucket A should be empty"
        assert b.consume(), "Bucket B should still have tokens"


# ── RateLimitMiddleware integration tests ─────────────────────────────


class TestRateLimitMiddleware:
    """Integration tests through the full middleware stack."""

    def test_anonymous_rate_limited(self) -> None:
        """Anonymous requests to /api/v1/jobs/ingest should be rate limited
        after exceeding the per-role limit (anonymous = 30/min)."""
        # Reset the global rate limiter to get clean state
        _rate_limiter.reset()

        limit = ROLE_RATE_LIMITS["anonymous"]
        # Send limit + 5 requests from anonymous IP
        allowed = 0
        blocked = 0
        for _ in range(limit + 5):
            resp = client.post(
                "/api/v1/jobs/ingest",
                json={"title": "Test", "location_raw": "Sydney NSW 2000"},
            )
            if resp.status_code == 429:
                blocked += 1
                body = resp.json()
                assert body["error"] == "rate_limit_exceeded"
                assert resp.headers.get("Retry-After") == "60"
            else:
                allowed += 1

        # The first `limit` requests should be allowed (some may be 422s
        # due to missing fields — that's fine, they still pass the limiter).
        # Any beyond `limit` should be 429.
        assert allowed >= limit, f"Expected at least {limit} allowed requests, got {allowed}"
        assert blocked > 0, f"Expected some 429 responses, got {blocked} blocked, {allowed} allowed"


# ── JWT Auth unit tests ───────────────────────────────────────────────


class TestAuthTokenVerification:
    """Tests for verify_access_token."""

    def _save_secret(self) -> str:
        return settings.supabase_jwt_secret

    def _restore_secret(self, original: str) -> None:
        settings.supabase_jwt_secret = original

    def test_no_secret_configured(self) -> None:
        original = self._save_secret()
        try:
            settings.supabase_jwt_secret = ""
            assert verify_access_token("any-token") is None
        finally:
            self._restore_secret(original)

    def test_invalid_token(self) -> None:
        original = self._save_secret()
        try:
            settings.supabase_jwt_secret = TEST_JWT_SECRET
            assert verify_access_token("not-a-valid-jwt") is None
        finally:
            self._restore_secret(original)

    def test_expired_token(self) -> None:
        original = self._save_secret()
        try:
            settings.supabase_jwt_secret = TEST_JWT_SECRET
            token = jwt.encode(
                {
                    "sub": "user-1",
                    "role": "jobseeker",
                    "exp": 1_000_000,  # far in the past
                },
                TEST_JWT_SECRET,
                algorithm="HS256",
            )
            assert verify_access_token(token) is None
        finally:
            self._restore_secret(original)

    def test_valid_token_jobseeker(self) -> None:
        original = self._save_secret()
        try:
            settings.supabase_jwt_secret = TEST_JWT_SECRET
            token = jwt.encode(
                {"sub": "user-abc", "role": "jobseeker"},
                TEST_JWT_SECRET,
                algorithm="HS256",
            )
            claims = verify_access_token(token)
            assert claims is not None
            assert claims.user_id == "user-abc"
            assert claims.role == "jobseeker"
            assert isinstance(claims.permissions, list)
        finally:
            self._restore_secret(original)

    def test_valid_token_employer(self) -> None:
        original = self._save_secret()
        try:
            settings.supabase_jwt_secret = TEST_JWT_SECRET
            token = jwt.encode(
                {"sub": "employer-42", "role": "employer"},
                TEST_JWT_SECRET,
                algorithm="HS256",
            )
            claims = verify_access_token(token)
            assert claims is not None
            assert claims.user_id == "employer-42"
            assert claims.role == "employer"
        finally:
            self._restore_secret(original)

    def test_valid_token_admin(self) -> None:
        original = self._save_secret()
        try:
            settings.supabase_jwt_secret = TEST_JWT_SECRET
            token = jwt.encode(
                {"sub": "admin-1", "role": "admin"},
                TEST_JWT_SECRET,
                algorithm="HS256",
            )
            claims = verify_access_token(token)
            assert claims is not None
            assert claims.user_id == "admin-1"
            assert claims.role == "admin"
        finally:
            self._restore_secret(original)

    def test_role_from_app_metadata(self) -> None:
        """Supabase often stores the custom role in app_metadata."""
        original = self._save_secret()
        try:
            settings.supabase_jwt_secret = TEST_JWT_SECRET
            token = jwt.encode(
                {
                    "sub": "user-xyz",
                    "app_metadata": {"role": "employer"},
                    "role": "authenticated",  # Supabase default role
                },
                TEST_JWT_SECRET,
                algorithm="HS256",
            )
            claims = verify_access_token(token)
            assert claims is not None
            # app_metadata.role should take precedence
            assert claims.role == "employer", (
                f"Expected employer from app_metadata, got {claims.role}"
            )
        finally:
            self._restore_secret(original)

    def test_unknown_role_falls_back_to_jobseeker(self) -> None:
        original = self._save_secret()
        try:
            settings.supabase_jwt_secret = TEST_JWT_SECRET
            token = jwt.encode(
                {"sub": "user-1", "role": "super-admin"},
                TEST_JWT_SECRET,
                algorithm="HS256",
            )
            claims = verify_access_token(token)
            assert claims is not None
            assert claims.role == "jobseeker", f"Expected jobseeker fallback, got {claims.role}"
        finally:
            self._restore_secret(original)

    def test_no_sub_in_token(self) -> None:
        original = self._save_secret()
        try:
            settings.supabase_jwt_secret = TEST_JWT_SECRET
            token = jwt.encode(
                {"role": "jobseeker"},  # no 'sub'
                TEST_JWT_SECRET,
                algorithm="HS256",
            )
            claims = verify_access_token(token)
            assert claims is not None
            assert claims.user_id is None
        finally:
            self._restore_secret(original)

    def test_rs256_token_fails_gracefully(self) -> None:
        """RS256 tokens should return None (graceful fallback)."""
        original = self._save_secret()
        try:
            settings.supabase_jwt_secret = TEST_JWT_SECRET
            # python-jose will raise JWTError on algo mismatch
            # Just ensure we don't crash
            result = verify_access_token("header.payload.sig")
            assert result is None
        finally:
            self._restore_secret(original)


# ── RBAC / require_role tests ─────────────────────────────────────────


class TestRoleHierarchy:
    """Tests for role hierarchy and require_role dependency."""

    def test_role_hierarchy_values(self) -> None:
        assert ROLE_HIERARCHY["anonymous"] == 0
        assert ROLE_HIERARCHY["jobseeker"] == 1
        assert ROLE_HIERARCHY["employer"] == 2
        assert ROLE_HIERARCHY["admin"] == 3

    def test_require_role_unknown_raises(self) -> None:
        with __import__("pytest").raises(ValueError, match="Unknown role"):
            require_role("non-existent")

    def test_require_role_admin_returns_callable(self) -> None:
        dep = require_role("admin")
        assert callable(dep), "require_role should return a callable"


class TestRequireRoleIntegration:
    """End-to-end tests verifying require_role via a test app."""

    @staticmethod
    def _make_test_app_no_rate_limit() -> FastAPI:
        """Test app without the rate limiter, for auth-specific tests."""
        test_app = FastAPI()

        @test_app.get("/public")
        async def public_endpoint(
            claims: AuthClaims = Depends(get_current_user),
        ) -> dict:
            return {"role": claims.role, "user_id": claims.user_id}

        @test_app.get("/jobseeker")
        async def jobseeker_endpoint(
            _: AuthClaims = Depends(require_role("jobseeker")),
        ) -> dict:
            return {"ok": True}

        @test_app.get("/employer")
        async def employer_endpoint(
            _: AuthClaims = Depends(require_role("employer")),
        ) -> dict:
            return {"ok": True}

        @test_app.get("/admin")
        async def admin_endpoint(
            _: AuthClaims = Depends(require_role("admin")),
        ) -> dict:
            return {"ok": True}

        return test_app

    def test_no_token_returns_anonymous(self) -> None:
        test_app = self._make_test_app_no_rate_limit()
        tc = TestClient(test_app)
        resp = tc.get("/public")
        assert resp.status_code == 200
        assert resp.json()["role"] == "anonymous"

    def test_anonymous_blocked_from_jobseeker(self) -> None:
        test_app = self._make_test_app_no_rate_limit()
        tc = TestClient(test_app)
        resp = tc.get("/jobseeker")
        assert resp.status_code == 403

    def test_valid_token_granted_jobseeker_access(self) -> None:
        original = settings.supabase_jwt_secret
        settings.supabase_jwt_secret = TEST_JWT_SECRET
        try:
            test_app = self._make_test_app_no_rate_limit()
            tc = TestClient(test_app)
            token = jwt.encode(
                {"sub": "user-1", "role": "jobseeker"},
                TEST_JWT_SECRET,
                algorithm="HS256",
            )
            resp = tc.get("/jobseeker", headers={"Authorization": f"Bearer {token}"})
            assert resp.status_code == 200
        finally:
            settings.supabase_jwt_secret = original

    def test_jobseeker_blocked_from_employer(self) -> None:
        original = settings.supabase_jwt_secret
        settings.supabase_jwt_secret = TEST_JWT_SECRET
        try:
            test_app = self._make_test_app_no_rate_limit()
            tc = TestClient(test_app)
            token = jwt.encode(
                {"sub": "user-1", "role": "jobseeker"},
                TEST_JWT_SECRET,
                algorithm="HS256",
            )
            resp = tc.get("/employer", headers={"Authorization": f"Bearer {token}"})
            assert resp.status_code == 403
        finally:
            settings.supabase_jwt_secret = original

    def test_employer_has_jobseeker_and_employer_access(self) -> None:
        original = settings.supabase_jwt_secret
        settings.supabase_jwt_secret = TEST_JWT_SECRET
        try:
            test_app = self._make_test_app_no_rate_limit()
            tc = TestClient(test_app)
            token = jwt.encode(
                {"sub": "emp-1", "role": "employer"},
                TEST_JWT_SECRET,
                algorithm="HS256",
            )
            # Employer should pass jobseeker-gated endpoint
            resp = tc.get("/jobseeker", headers={"Authorization": f"Bearer {token}"})
            assert resp.status_code == 200, "Employer should access jobseeker routes"
            # Employer should pass own-gated endpoint
            resp = tc.get("/employer", headers={"Authorization": f"Bearer {token}"})
            assert resp.status_code == 200, "Employer should access employer routes"
            # Employer should be blocked from admin
            resp = tc.get("/admin", headers={"Authorization": f"Bearer {token}"})
            assert resp.status_code == 403, "Employer should NOT access admin routes"
        finally:
            settings.supabase_jwt_secret = original

    def test_admin_has_full_access(self) -> None:
        original = settings.supabase_jwt_secret
        settings.supabase_jwt_secret = TEST_JWT_SECRET
        try:
            test_app = self._make_test_app_no_rate_limit()
            tc = TestClient(test_app)
            token = jwt.encode(
                {"sub": "adm-1", "role": "admin"},
                TEST_JWT_SECRET,
                algorithm="HS256",
            )
            for path in ("/jobseeker", "/employer", "/admin"):
                resp = tc.get(path, headers={"Authorization": f"Bearer {token}"})
                assert resp.status_code == 200, (
                    f"Admin should access {path}, got {resp.status_code}"
                )
        finally:
            settings.supabase_jwt_secret = original

    def test_invalid_token_returns_401(self) -> None:
        test_app = self._make_test_app_no_rate_limit()
        tc = TestClient(test_app)
        resp = tc.get("/public", headers={"Authorization": "Bearer invalidtoken"})
        assert resp.status_code == 401


# ── Rate limit configuration ──────────────────────────────────────────


class TestRateLimitConfig:
    """Sanity-checks for the rate limit configuration constants."""

    def test_all_roles_have_limits(self) -> None:
        for role in ROLE_HIERARCHY:
            assert role in ROLE_RATE_LIMITS, f"Role {role!r} missing from rate limit config"

    def test_anonymous_limit_lowest(self) -> None:
        assert ROLE_RATE_LIMITS["anonymous"] < ROLE_RATE_LIMITS["jobseeker"]
        assert ROLE_RATE_LIMITS["anonymous"] < ROLE_RATE_LIMITS["admin"]

    def test_admin_limit_highest(self) -> None:
        assert ROLE_RATE_LIMITS["admin"] > ROLE_RATE_LIMITS["employer"]
        assert ROLE_RATE_LIMITS["admin"] > ROLE_RATE_LIMITS["anonymous"]
