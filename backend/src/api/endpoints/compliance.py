"""Hi-Hired Backend - Compliance report generation endpoint.

Supports Centrelink/Workforce Australia compliance reporting for
provider partners (Asuria/DES mentors). Providers generate reports
for candidates who have granted bulk_swipe_consent.

Architecture: per-candidate rows are persisted to compliance_report_rows
before the report is marked completed. This ensures partial-failure recovery
(retry-safe per ARCHITECTURE AUDIT HIGH-3).
"""

from __future__ import annotations

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from supabase import create_client

from src.api.middleware.auth import AuthClaims, require_role
from src.core.config import get_settings

router = APIRouter(tags=["compliance"])

settings = get_settings()


# ── Request / Response schemas ─────────────────────────────────────────────

class GenerateReportRequest(BaseModel):
    candidate_id: str
    period_start: date
    period_end: date
    report_type: str = "weekly_summary"

    @field_validator("report_type")
    @classmethod
    def validate_report_type(cls, v: str) -> str:
        allowed = {"weekly_summary", "fortnightly", "monthly", "bulk_swipe_audit", "other"}
        if v not in allowed:
            raise ValueError(f"Invalid report_type. Allowed: {allowed}")
        return v

    @field_validator("period_end")
    @classmethod
    def period_end_not_before_start(cls, v: date, info) -> date:
        period_start = info.data.get("period_start")
        if period_start and v < period_start:
            raise ValueError("period_end must not be before period_start")
        return v


class ComplianceRowResponse(BaseModel):
    id: str
    report_id: str
    run_id: str
    candidate_id: str
    status: str
    swipe_count: int
    right_swipe_count: int
    unique_jobs_interacted: int
    match_count: int
    hire_count: int
    total_earnings: float | None = None
    error_message: str | None = None


class ComplianceReportResponse(BaseModel):
    id: str
    candidate_id: str
    provider_id: str
    period_start: date
    period_end: date
    report_type: str
    status: str
    report_data: dict | None = None
    rows: list[ComplianceRowResponse] = []
    run_status: str | None = None
    created_at: str


# ── Helpers ────────────────────────────────────────────────────────────────

def _get_service_client():
    """Return a Supabase client with service_role for backend operations."""
    return create_client(settings.supabase_url, settings.supabase_service_key)


def _query_candidate_data(
    supabase,
    candidate_id: str,
    period_start: str,
    period_end: str,
) -> tuple[list[dict], list[dict], list[dict]]:
    """Query swipes, matches, and hires for a candidate in the given period."""
    swipes_resp = (
        supabase.table("swipes")
        .select("id, job_id, direction, created_at")
        .eq("candidate_id", candidate_id)
        .gte("created_at", period_start)
        .lte("created_at", period_end + "T23:59:59")
        .execute()
    )

    matches_resp = (
        supabase.table("matches")
        .select("id, status, created_at, hired_at")
        .or_(f"candidate_id.eq.{candidate_id}")
        .gte("created_at", period_start)
        .lte("created_at", period_end + "T23:59:59")
        .execute()
    )

    hires_resp = (
        supabase.table("hire_confirmations")
        .select("id, job_id, employer_id, created_at")
        .eq("candidate_id", candidate_id)
        .gte("created_at", period_start)
        .lte("created_at", period_end + "T23:59:59")
        .execute()
    )

    return (
        swipes_resp.data or [],
        matches_resp.data or [],
        hires_resp.data or [],
    )


def _compute_candidate_row(
    candidate: dict,
    swipes: list[dict],
    matches: list[dict],
    hires: list[dict],
) -> dict:
    """Build structured per-candidate row data for compliance_report_rows."""
    employers_set: set[str] = set()
    right_swipe_count = 0
    for s in swipes:
        job_id = s.get("job_id")
        if job_id:
            employers_set.add(job_id)
        if s.get("direction") == "right":
            right_swipe_count += 1

    return {
        "swipe_count": len(swipes),
        "right_swipe_count": right_swipe_count,
        "unique_jobs_interacted": len(employers_set),
        "match_count": len(matches),
        "hire_count": len(hires),
        "swipes_data": swipes,
        "matches_data": matches,
        "hires_data": hires,
    }


def _build_report_aggregate(rows: list[dict]) -> dict:
    """Aggregate multiple compliance_report_rows into a report_data payload."""
    total_swipes = sum(r["swipe_count"] for r in rows)
    total_right = sum(r["right_swipe_count"] for r in rows)
    total_unique = sum(r["unique_jobs_interacted"] for r in rows)
    total_matches = sum(r["match_count"] for r in rows)
    total_hires = sum(r["hire_count"] for r in rows)

    return {
        "activity_summary": {
            "total_swipes": total_swipes,
            "right_swipes": total_right,
            "unique_jobs_interacted": total_unique,
            "total_matches": total_matches,
            "total_hires": total_hires,
        },
        "candidate_rows": len(rows),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ── Endpoints ──────────────────────────────────────────────────────────────


@router.post(
    "/compliance/generate",
    response_model=ComplianceReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a compliance report for a candidate",
    description=(
        "Generates a Workforce Australia / DES compliance report for a "
        "provider's candidate. The candidate must have granted "
        "bulk_swipe_consent. Per-candidate data is persisted to "
        "compliance_report_rows before completion (retry-safe)."
    ),
)
async def generate_compliance_report(
    body: GenerateReportRequest,
    claims: AuthClaims = Depends(require_role("provider")),
) -> ComplianceReportResponse:
    """Generate a compliance report with per-candidate row persistence."""
    if not claims.user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated provider not identified",
        )

    supabase = _get_service_client()

    # 1. Verify candidate exists and has granted bulk swipe consent
    candidate_resp = (
        supabase.table("profiles")
        .select(
            "id, full_name, suburb, skills, work_rights, availability_text, "
            "bulk_swipe_consent, consent_granted_at"
        )
        .eq("id", body.candidate_id)
        .maybe_single()
        .execute()
    )

    candidate = candidate_resp.data if candidate_resp.data else None
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found",
        )

    if not candidate.get("bulk_swipe_consent"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Candidate has not granted bulk swipe consent. "
                "Consent is required before generating compliance reports."
            ),
        )

    periods = {
        "period_start": body.period_start.isoformat(),
        "period_end": body.period_end.isoformat(),
    }
    now = datetime.now(timezone.utc).isoformat()

    # 2. Create the compliance_reports row (pending)
    report_insert = (
        supabase.table("compliance_reports")
        .insert({
            "candidate_id": body.candidate_id,
            "provider_id": claims.user_id,
            **periods,
            "report_type": body.report_type,
            "status": "generating",
            "created_at": now,
            "updated_at": now,
        })
        .execute()
    )

    if not report_insert.data or len(report_insert.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create compliance report record",
        )

    report_row = report_insert.data[0]
    report_id = report_row["id"]

    # 3. Create a compliance_report_runs row
    run_insert = (
        supabase.table("compliance_report_runs")
        .insert({
            "report_id": report_id,
            "status": "generating",
            "total_candidates": 1,
            "started_at": now,
            "created_at": now,
            "updated_at": now,
        })
        .execute()
    )

    if not run_insert.data or len(run_insert.data) == 0:
        # Clean up: mark report failed if run creation fails
        supabase.table("compliance_reports").update({
            "status": "failed",
            "error_message": "Failed to create run tracking record",
            "updated_at": now,
        }).eq("id", report_id).execute()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create compliance report run record",
        )

    run_row = run_insert.data[0]
    run_id = run_row["id"]
    row_result: dict | None = None

    try:
        # 4. Query and persist per-candidate row
        swipes, matches, hires = _query_candidate_data(
            supabase, body.candidate_id, periods["period_start"], periods["period_end"]
        )

        row_data = _compute_candidate_row(candidate, swipes, matches, hires)

        row_insert = (
            supabase.table("compliance_report_rows")
            .insert({
                "report_id": report_id,
                "run_id": run_id,
                "candidate_id": body.candidate_id,
                "status": "completed",
                **row_data,
                "created_at": now,
                "updated_at": now,
            })
            .execute()
        )

        if row_insert.data and len(row_insert.data) > 0:
            row_result = row_insert.data[0]

        # 5. Mark run as completed
        supabase.table("compliance_report_runs").update({
            "status": "completed",
            "completed_candidates": 1,
            "completed_at": now,
            "updated_at": now,
        }).eq("id", run_id).execute()

        # 6. Build aggregate report data from rows
        report_aggregate = _build_report_aggregate([row_data])

        # 7. Update report as completed
        supabase.table("compliance_reports").update({
            "status": "completed",
            "report_data": report_aggregate,
            "updated_at": now,
        }).eq("id", report_id).execute()

    except Exception as exc:
        # Mark row as failed if it was created
        if row_result:
            supabase.table("compliance_report_rows").update({
                "status": "failed",
                "error_message": str(exc),
                "updated_at": now,
            }).eq("id", row_result["id"]).execute()

        # Mark run as failed
        supabase.table("compliance_report_runs").update({
            "status": "failed",
            "error_message": str(exc),
            "completed_at": now,
            "updated_at": now,
        }).eq("id", run_id).execute()

        # Mark report as failed
        supabase.table("compliance_reports").update({
            "status": "failed",
            "error_message": str(exc),
            "updated_at": now,
        }).eq("id", report_id).execute()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report generation failed: {exc}",
        )

    # Build the response
    rows = []
    if row_result:
        rows.append(ComplianceRowResponse(
            id=row_result["id"],
            report_id=report_id,
            run_id=run_id,
            candidate_id=body.candidate_id,
            status=row_result["status"],
            swipe_count=row_result["swipe_count"],
            right_swipe_count=row_result["right_swipe_count"],
            unique_jobs_interacted=row_result["unique_jobs_interacted"],
            match_count=row_result["match_count"],
            hire_count=row_result["hire_count"],
            total_earnings=row_result.get("total_earnings"),
            error_message=row_result.get("error_message"),
        ))

    return ComplianceReportResponse(
        id=report_id,
        candidate_id=body.candidate_id,
        provider_id=claims.user_id,
        period_start=body.period_start,
        period_end=body.period_end,
        report_type=body.report_type,
        status="completed",
        report_data=report_aggregate,
        rows=rows,
        run_status="completed",
        created_at=now,
    )


@router.get(
    "/compliance/reports",
    response_model=list[ComplianceReportResponse],
    summary="List compliance reports for the authenticated provider",
)
async def list_compliance_reports(
    claims: AuthClaims = Depends(require_role("provider")),
    limit: int = 20,
    offset: int = 0,
) -> list[ComplianceReportResponse]:
    """Return compliance reports generated by the authenticated provider."""
    if not claims.user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated provider not identified",
        )

    supabase = _get_service_client()

    resp = (
        supabase.table("compliance_reports")
        .select("*")
        .eq("provider_id", claims.user_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    if not resp.data:
        return []

    # Fetch latest run + rows for each report
    result: list[ComplianceReportResponse] = []
    for r in resp.data:
        # Latest run for this report
        run_resp = (
            supabase.table("compliance_report_runs")
            .select("*")
            .eq("report_id", r["id"])
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        run = run_resp.data[0] if run_resp.data else None

        # Rows for this report
        rows_resp = (
            supabase.table("compliance_report_rows")
            .select("*")
            .eq("report_id", r["id"])
            .execute()
        )

        rows = [
            ComplianceRowResponse(
                id=row["id"],
                report_id=row["report_id"],
                run_id=row["run_id"],
                candidate_id=row["candidate_id"],
                status=row["status"],
                swipe_count=row["swipe_count"],
                right_swipe_count=row["right_swipe_count"],
                unique_jobs_interacted=row["unique_jobs_interacted"],
                match_count=row["match_count"],
                hire_count=row["hire_count"],
                total_earnings=row.get("total_earnings"),
                error_message=row.get("error_message"),
            )
            for row in (rows_resp.data or [])
        ]

        result.append(ComplianceReportResponse(
            id=r["id"],
            candidate_id=r["candidate_id"],
            provider_id=r["provider_id"],
            period_start=r["period_start"],
            period_end=r["period_end"],
            report_type=r["report_type"],
            status=r["status"],
            report_data=r.get("report_data"),
            rows=rows,
            run_status=run["status"] if run else None,
            created_at=r["created_at"],
        ))

    return result


@router.get(
    "/compliance/reports/{report_id}",
    response_model=ComplianceReportResponse,
    summary="Get a single compliance report by ID",
)
async def get_compliance_report(
    report_id: str,
    claims: AuthClaims = Depends(require_role("provider")),
) -> ComplianceReportResponse:
    """Return a specific compliance report if the provider owns it."""
    if not claims.user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated provider not identified",
        )

    supabase = _get_service_client()

    resp = (
        supabase.table("compliance_reports")
        .select("*")
        .eq("id", report_id)
        .eq("provider_id", claims.user_id)
        .maybe_single()
        .execute()
    )

    if not resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found or access denied",
        )

    r = resp.data

    # Latest run
    run_resp = (
        supabase.table("compliance_report_runs")
        .select("*")
        .eq("report_id", r["id"])
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    run = run_resp.data[0] if run_resp.data else None

    # Rows
    rows_resp = (
        supabase.table("compliance_report_rows")
        .select("*")
        .eq("report_id", r["id"])
        .execute()
    )

    rows = [
        ComplianceRowResponse(
            id=row["id"],
            report_id=row["report_id"],
            run_id=row["run_id"],
            candidate_id=row["candidate_id"],
            status=row["status"],
            swipe_count=row["swipe_count"],
            right_swipe_count=row["right_swipe_count"],
            unique_jobs_interacted=row["unique_jobs_interacted"],
            match_count=row["match_count"],
            hire_count=row["hire_count"],
            total_earnings=row.get("total_earnings"),
            error_message=row.get("error_message"),
        )
        for row in (rows_resp.data or [])
    ]

    return ComplianceReportResponse(
        id=r["id"],
        candidate_id=r["candidate_id"],
        provider_id=r["provider_id"],
        period_start=r["period_start"],
        period_end=r["period_end"],
        report_type=r["report_type"],
        status=r["status"],
        report_data=r.get("report_data"),
        rows=rows,
        run_status=run["status"] if run else None,
        created_at=r["created_at"],
    )
