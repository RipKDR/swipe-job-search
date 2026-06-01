"""JWT authentication and RBAC middleware for Hi-Hired.

Provides:
- AuthClaims: Pydantic model for authenticated user claims
- verify_access_token: Validate Supabase JWT tokens
- get_current_user: FastAPI dependency for extracting auth from requests
- require_role: Factory for role-based access control
"""

from __future__ import annotations

from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from src.core.config import get_settings

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

    # Extract claims from the verified payload
    user_id: str | None = payload.get("sub")
    app_metadata: dict[str, Any] = payload.get("app_metadata", {}) or {}
    user_role: str = (
        app_metadata.get("role") or payload.get("user_role") or payload.get("role", "jobseeker")
    )

    # Validate role against known hierarchy; fall back to jobseeker
    if user_role not in ROLE_HIERARCHY:
        user_role = "jobseeker"

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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return claims


def require_role(min_role: str):
    """Factory returning a FastAPI dependency that enforces a minimum role.

    The role hierarchy (low → high): anonymous, jobseeker, employer, admin.

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

    def _check_role(claims: AuthClaims = Depends(get_current_user)) -> AuthClaims:
        user_level = ROLE_HIERARCHY.get(claims.role, -1)
        if user_level < min_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(f"Requires role '{min_role}' or higher (current: '{claims.role}')"),
            )
        return claims

    return _check_role
