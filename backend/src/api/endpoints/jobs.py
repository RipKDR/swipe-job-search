"""Hi-Hired Backend - Job ingestion endpoint.

Provides a single endpoint for ingesting raw job listings, normalising
them, and returning structured data.
"""

from __future__ import annotations

from fastapi import APIRouter, status

from src.core.errors import APIException, ErrorCode
from src.schemas.jobs import NormalizedJob, RawJobInput
from src.services.job_normalizer import normalize_job

router = APIRouter(tags=["jobs"])


@router.post(
    "/jobs/ingest",
    response_model=NormalizedJob,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest and normalise a raw job listing",
    description=(
        "Accepts a raw job listing payload, normalises it into the "
        "canonical NormalizedJob schema, and returns the result. "
        "Validation errors return structured 422 responses."
    ),
)
async def ingest_job(raw: RawJobInput) -> NormalizedJob:
    """Ingest a raw job listing, normalise it, and return structured data."""
    try:
        return normalize_job(raw, source_name=raw.source_name)
    except ValueError as e:
        raise APIException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            code=ErrorCode.VALIDATION_ERROR,
            message=f"Job normalisation failed: {e}",
            details=str(e),
        )
    except Exception as e:
        raise APIException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code=ErrorCode.INTERNAL_ERROR,
            message=f"Internal error during job ingestion: {e}",
        )
