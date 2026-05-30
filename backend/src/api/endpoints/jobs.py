"""Hi-Hired Backend - Job ingestion endpoint."""

from fastapi import APIRouter, HTTPException

from src.schemas.jobs import NormalizedJob, RawJobInput
from src.services.job_normalizer import normalize_job

router = APIRouter(tags=["jobs"])


@router.post("/jobs/ingest", response_model=NormalizedJob)
async def ingest_job(raw: RawJobInput) -> NormalizedJob:
    """Ingest a raw job listing, normalize it, and return structured data."""
    try:
        return normalize_job(raw, source_name=raw.source_name)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")
