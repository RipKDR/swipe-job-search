from __future__ import annotations
import asyncio
from typing import Any

from fastapi import Depends, status
from fastapi.security.http import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt.exceptions import PyJWTError as JWTError
from pydantic import BaseModel

from src.core.config import get_settings

# pyrefly: ignore [missing-import]
from src.core.errors import APIException, ErrorCode
from supabase import create_client

settings = get_settings()
security = HTTPBearer(auto_error=False)

# Role hierarchy: higher value = more privileges
ROLE_HIERARCHY: dict[str, int] = {
    "anonymous": 0,
    "jobseeker": 1,
    "employer": 2,
    "provider": 2,
    "admin": 3,
}

# Employer/provider are peer roles, not interchangeable privileges.
STRICT_PEER_ROLES = {"employer", "provider"}


class AuthClaims(BaseModel):
    """Security claims extracted from a verified JWT token."""

    user_id: str | None = None
    role: str = "anonymous"
    permissions: list[str] = []


def verify_access_token(token: str) -> AuthClaims | None:
    """Validate a Supabase JWT and extract authenticated claims.

    Attempts HS256 verification using the configured supabase_jwt_secret.
    Returns None when the token is invalid, expired, or the secret is unset.

    Args:
        token: Bearer JWT string from the Authorization header.

    Returns:
        AuthClaims if verification succeeds, None otherwise.
    """
    if not settings.supabase_jwt_secret:
        return None

    payload: dict[str, Any]
    try:
        # HS256 — standard Supabase JWT verification with shared secret
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except JWTError:
        # Attempt RS256 path via unverified header introspection
        try:
            header = jwt.get_unverified_header(token)
        except JWTError:
            return None

        if header.get("alg") == "RS256":
            # RS256 requires a JWKS endpoint; fall back gracefully.
            # In production the JWKS URI would be:
            #   {settings.supabase_url}/auth/v1/.well-known/jwks.json
            return None

        return None

    # Extract application role from trusted custom claims. Supabase's standard
    # payload["role"] is usually the Postgres role ("authenticated"), not the
    # Hi-Hired app role; only use it when it contains a known app role.
    user_id: str | None = payload.get("sub")
    app_metadata: dict[str, Any] = payload.get("app_metadata", {}) or {}
    raw_role: str | None = (
        app_metadata.get("role") or payload.get("user_role") or payload.get("role")
    )
    user_role = raw_role if raw_role in ROLE_HIERARCHY else "jobseeker"

    return AuthClaims(
        user_id=user_id,
        role=user_role,
        permissions=payload.get("permissions", []),
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> AuthClaims:
    """FastAPI dependency that extracts authenticated claims from the Bearer token.

    - No token → returns anonymous AuthClaims (role="anonymous").
    - Invalid/expired token → raises HTTP 401.
    - Valid token → returns fully populated AuthClaims.

    Usage:
        @router.get("/me")
        async def me(claims: AuthClaims = Depends(get_current_user)):
            return {"user_id": claims.user_id, "role": claims.role}
    """
    if credentials is None:
        return AuthClaims(role="anonymous")

    claims = verify_access_token(credentials.credentials)
    if claims is None:
        raise APIException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code=ErrorCode.UNAUTHORIZED,
            message="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return claims


def _get_service_client():
    """Return a Supabase service client for server-side role lookups."""
    return create_client(settings.supabase_url, settings.supabase_service_key)


async def _get_profile_role(user_id: str | None) -> str | None:
    """Fetch the current role from profiles, which reflects onboarding changes.

    JWT app_metadata can be stale until token refresh. For peer app roles
    (employer/provider), the profiles row is the backend source of truth when it
    is available. If Supabase is unavailable or misconfigured, return None so
    callers can fall back to the already-verified JWT claim.

    Runs the Supabase query in a thread pool to avoid blocking the event loop.
    """
    if not user_id:
        return None

    try:
        resp = await asyncio.to_thread(
            lambda: (
                _get_service_client()
                .table("profiles")
                .select("role")
                .eq("id", user_id)
                .maybe_single()
                .execute()
            )
        )
    except Exception:
        return None

    role = (resp.data or {}).get("role")
    # Peer-role lookup only — never promote JWT users via profiles.role=admin.
    return role if role in STRICT_PEER_ROLES else None


def _role_satisfies(role: str, min_role: str, min_level: int) -> bool:
    """Return whether an app role satisfies a role requirement.

    Employer and provider share hierarchy level 2, but they are lateral peer
    roles. A provider-only endpoint must not admit an employer just because the
    hierarchy level matches. Admin remains the only cross-role override.
    """
    if role == "admin":
        return True
    if min_role in STRICT_PEER_ROLES:
        return role == min_role
    return ROLE_HIERARCHY.get(role, -1) >= min_level


def require_role(min_role: str):
    """Factory returning a FastAPI dependency that enforces a minimum role.

    The role hierarchy (low → high): anonymous, jobseeker, employer/provider, admin.
    Employer and provider are peer roles: same level, different privileges.

    Args:
        min_role: Minimum role required to access the endpoint.

    Returns:
        A FastAPI Depends callable that validates the current user's role.

    Raises:
        ValueError: If min_role is not a known role.
        HTTPException 403: If the user's role is below the minimum.

    Usage:
        @router.get("/employer/dashboard")
        async def dashboard(
            _: AuthClaims = Depends(require_role("employer")),
        ):
            return {"dashboard": "employer data"}
    """
    min_level = ROLE_HIERARCHY.get(min_role)
    if min_level is None:
        raise ValueError(f"Unknown role: {min_role!r}. Valid: {list(ROLE_HIERARCHY)}")

    async def _check_role(claims: AuthClaims = Depends(get_current_user)) -> AuthClaims:
        effective_claims = claims
        if (
            min_role in STRICT_PEER_ROLES
            and claims.role != "admin"
            and not _role_satisfies(claims.role, min_role, min_level)
        ):
            profile_role = await _get_profile_role(claims.user_id)
            if profile_role:
                effective_claims = claims.model_copy(update={"role": profile_role})

        if not _role_satisfies(effective_claims.role, min_role, min_level):
            raise APIException(
                status_code=status.HTTP_403_FORBIDDEN,
                code=ErrorCode.ROLE_REQUIRED,
                message=f"Requires role '{min_role}' or higher (current: '{effective_claims.role}')",
            )
        return effective_claims

    return _check_role
