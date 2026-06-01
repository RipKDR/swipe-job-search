"""Standardised API error model and exception handler for Hi-Hired.

Provides:
- `APIError` — structured error response model with machine-readable codes
- `APIException` — raise this instead of `HTTPException` for consistent errors
- `add_api_error_handler` — FastAPI exception handler that converts both
  `APIException` and standard `HTTPException` to the same JSON shape

Usage:
    from src.core.errors import APIException, ErrorCode

    raise APIException(
        status_code=403,
        code=ErrorCode.CONSENT_REQUIRED,
        message="Candidate has not granted bulk swipe consent.",
    )
"""

from __future__ import annotations

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse


class ErrorCode:
    """Machine-readable error codes. Add new codes here as needed."""

    # Authentication / Authorisation
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    CONSENT_REQUIRED = "CONSENT_REQUIRED"
    ROLE_REQUIRED = "ROLE_REQUIRED"

    # Resource errors
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    DUPLICATE = "DUPLICATE"

    # Validation
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_INPUT = "INVALID_INPUT"
    INVALID_STATE = "INVALID_STATE"

    # Rate limiting
    RATE_LIMITED = "RATE_LIMITED"

    # Server / downstream
    INTERNAL_ERROR = "INTERNAL_ERROR"
    DEPENDENCY_FAILURE = "DEPENDENCY_FAILURE"
    PDF_GENERATION_FAILED = "PDF_GENERATION_FAILED"


class APIException(Exception):
    """Raise for structured API errors with machine-readable code.

    Args:
        status_code: HTTP response status code.
        code: Machine-readable error code string (use ErrorCode constants).
        message: Human-readable description.
        details: Optional additional context (validation errors, etc.).
        headers: Optional additional response headers.
    """

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: object = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details
        self.headers = headers
        super().__init__(message)

    def to_dict(self) -> dict:
        """Return the JSON-serialisable error body."""
        body: dict = {
            "error": {
                "code": self.code,
                "message": self.message,
            },
        }
        if self.details is not None:
            body["error"]["details"] = self.details
        return body


def _http_exception_to_dict(exc: HTTPException) -> dict:
    """Convert a standard FastAPI HTTPException to our error format."""
    detail = exc.detail
    code = ErrorCode.INTERNAL_ERROR

    # Map status codes to reasonable defaults
    status_map: dict[int, str] = {
        400: ErrorCode.INVALID_INPUT,
        401: ErrorCode.UNAUTHORIZED,
        403: ErrorCode.FORBIDDEN,
        404: ErrorCode.NOT_FOUND,
        409: ErrorCode.CONFLICT,
        422: ErrorCode.VALIDATION_ERROR,
        429: ErrorCode.RATE_LIMITED,
        500: ErrorCode.INTERNAL_ERROR,
        502: ErrorCode.DEPENDENCY_FAILURE,
        503: ErrorCode.DEPENDENCY_FAILURE,
    }

    if isinstance(detail, dict):
        body = dict(detail)
        if "error" not in body:
            body = {"error": body}
        return body

    code = status_map.get(exc.status_code, ErrorCode.INTERNAL_ERROR)

    return {
        "error": {
            "code": code,
            "message": str(detail) if detail else "An error occurred",
        },
    }


async def api_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """FastAPI exception handler for APIException and HTTPException.

    Register on the app:
        app.add_exception_handler(APIException, api_error_handler)
        app.add_exception_handler(HTTPException, api_error_handler)
    """
    if isinstance(exc, APIException):
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.to_dict(),
            headers=exc.headers,
        )

    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content=_http_exception_to_dict(exc),
            headers=exc.headers,
        )

    # Fallback for unhandled exceptions
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": ErrorCode.INTERNAL_ERROR,
                "message": "An unexpected error occurred",
            },
        },
    )
