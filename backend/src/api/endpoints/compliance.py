"""Hi-Hired Backend - Compliance report generation endpoint.

Supports Centrelink/Workforce Australia compliance reporting for
provider partners (Asuria/DES mentors). Providers generate reports
for candidates who have granted bulk_swipe_consent.

Architecture: per-candidate rows are persisted to compliance_report_rows
before the report is marked completed. This ensures partial-failure recovery
(retry-safe per ARCHITECTURE AUDIT HIGH-3).

API design conventions (per api-and-interface-design skill):
- All errors return structured { error: { code, message, details? } }
- List endpoints include pagination metadata
- Response fields are consistent across endpoints
- New fields are additive and optional
"""

from __future__ import annotations

import os
from datetime import date, datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, status
from fastapi.responses import Response
from pydantic import BaseModel, field_validator
from supabase import create_client

from src.api.middleware.auth import AuthClaims, require_role
from src.core.config import get_settings
from src.core.errors import APIException, ErrorCode
from src.services.pdf_generator import generate_compliance_pdf

router = APIRouter(tags=["compliance"])

settings = get_settings()


# ── Request / Response schemas (Contract-first per skill principle) ────────

class GenerateReportRequest(BaseModel):
    """Input: what the caller provides to generate a compliance report.

    Only period_start and period_end are required beyond candidate_id.
    report_type defaults to weekly_summary.
    """
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
    """Output: per-candidate detail row within a compliance report."""
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
    """Output: a single compliance report with its detail rows."""
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
    updated_at: str | None = None


class PaginationMeta(BaseModel):
    """Standard pagination metadata for list endpoints."""
    page: int
    page_size: int
    total_items: int
    total_pages: int
    has_next: bool
    has_previous: bool


class ComplianceReportListResponse(BaseModel):
    """Output: paginated list of compliance reports."""
    data: list[ComplianceReportResponse]
    pagination: PaginationMeta


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


def _build_report_response(
    row: dict,
    rows: list[ComplianceRowResponse],
    run: dict | None,
) -> ComplianceReportResponse:
    """Build a ComplianceReportResponse from Supabase row data."""
    return ComplianceReportResponse(
        id=row["id"],
        candidate_id=row["candidate_id"],
        provider_id=row["provider_id"],
        period_start=row["period_start"],
        period_end=row["period_end"],
        report_type=row["report_type"],
        status=row["status"],
        report_data=row.get("report_data"),
        rows=rows,
        run_status=run["status"] if run else None,
        created_at=row["created_at"],
        updated_at=row.get("updated_at"),
    )


def _build_row_responses(rows_data: list[dict]) -> list[ComplianceRowResponse]:
    """Convert raw row dicts to ComplianceRowResponse objects."""
    return [
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
        for row in (rows_data or [])
    ]


def _fetch_report_with_owner_check(
    supabase,
    report_id: str,
    provider_id: str,
) -> dict:
    """Fetch a compliance report, raising 404 if not found or not owned."""
    resp = (
        supabase.table("compliance_reports")
        .select("*")
        .eq("id", report_id)
        .eq("provider_id", provider_id)
        .maybe_single()
        .execute()
    )
    if not resp.data:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code=ErrorCode.NOT_FOUND,
            message="Report not found or access denied",
        )
    return resp.data


def _fetch_latest_run(
    supabase,
    report_id: str,
) -> dict | None:
    """Fetch the most recent run for a report, if any."""
    run_resp = (
        supabase.table("compliance_report_runs")
        .select("*")
        .eq("report_id", report_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return run_resp.data[0] if run_resp.data else None


def _fetch_rows(
    supabase,
    report_id: str,
) -> list[dict]:
    """Fetch all compliance_report_rows for a report."""
    rows_resp = (
        supabase.table("compliance_report_rows")
        .select("*")
        .eq("report_id", report_id)
        .execute()
    )
    return rows_resp.data or []


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
        raise APIException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code=ErrorCode.UNAUTHORIZED,
            message="Authenticated provider not identified",
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
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code=ErrorCode.NOT_FOUND,
            message="Candidate not found",
        )

    if not candidate.get("bulk_swipe_consent"):
        raise APIException(
            status_code=status.HTTP_403_FORBIDDEN,
            code=ErrorCode.CONSENT_REQUIRED,
            message=(
                "Candidate has not granted bulk swipe consent. "
                "Consent is required before generating compliance reports."
            ),
        )

    periods = {
        "period_start": body.period_start.isoformat(),
        "period_end": body.period_end.isoformat(),
    }
    now = datetime.now(timezone.utc).isoformat()

    # 2. Create the compliance_reports row
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
        raise APIException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code=ErrorCode.INTERNAL_ERROR,
            message="Failed to create compliance report record",
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
        # Mark report as failed
        supabase.table("compliance_reports").update({
            "status": "failed",
            "error_message": "Failed to create run tracking record",
            "updated_at": now,
        }).eq("id", report_id).execute()
        raise APIException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code=ErrorCode.INTERNAL_ERROR,
            message="Failed to create compliance report run record",
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

        # 6. Build aggregate report data
        report_aggregate = _build_report_aggregate([row_data])

        # 7. Update report as completed
        supabase.table("compliance_reports").update({
            "status": "completed",
            "report_data": report_aggregate,
            "updated_at": now,
        }).eq("id", report_id).execute()

    except Exception as exc:
        # Mark row as failed if created
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

        raise APIException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            code=ErrorCode.DEPENDENCY_FAILURE,
            message=f"Report generation failed: {exc}",
        )

    rows_responses = _build_row_responses([row_result]) if row_result else []

    return ComplianceReportResponse(
        id=report_id,
        candidate_id=body.candidate_id,
        provider_id=claims.user_id,
        period_start=body.period_start,
        period_end=body.period_end,
        report_type=body.report_type,
        status="completed",
        report_data=report_aggregate,
        rows=rows_responses,
        run_status="completed",
        created_at=now,
        updated_at=now,
    )


@router.get(
    "/compliance/reports",
    response_model=ComplianceReportListResponse,
    summary="List compliance reports for the authenticated provider",
    description=(
        "Returns a paginated list of compliance reports owned by the "
        "authenticated provider. Each report includes its latest run "
        "status and detail rows."
    ),
)
async def list_compliance_reports(
    claims: AuthClaims = Depends(require_role("provider")),
    page: int = 1,
    page_size: int = 20,
) -> ComplianceReportListResponse:
    """Return paginated compliance reports for the authenticated provider."""
    if not claims.user_id:
        raise APIException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code=ErrorCode.UNAUTHORIZED,
            message="Authenticated provider not identified",
        )

    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    if page_size > 100:
        page_size = 100

    supabase = _get_service_client()

    # Count total for pagination metadata
    count_resp = (
        supabase.table("compliance_reports")
        .select("id", count="exact")
        .eq("provider_id", claims.user_id)
        .execute()
    )
    total_items = count_resp.count if hasattr(count_resp, "count") else 0

    offset = (page - 1) * page_size
    resp = (
        supabase.table("compliance_reports")
        .select("*")
        .eq("provider_id", claims.user_id)
        .order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
        .execute()
    )

    reports_data = resp.data or []
    result: list[ComplianceReportResponse] = []

    for r in reports_data:
        run = _fetch_latest_run(supabase, r["id"])
        rows = _build_row_responses(_fetch_rows(supabase, r["id"]))
        result.append(_build_report_response(r, rows, run))

    total_pages = max(1, (total_items + page_size - 1) // page_size)

    return ComplianceReportListResponse(
        data=result,
        pagination=PaginationMeta(
            page=page,
            page_size=page_size,
            total_items=total_items,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_previous=page > 1,
        ),
    )


@router.get(
    "/compliance/reports/{report_id}",
    response_model=ComplianceReportResponse,
    summary="Get a single compliance report by ID",
    description="Returns a single compliance report with its detail rows and run status.",
)
async def get_compliance_report(
    report_id: str,
    claims: AuthClaims = Depends(require_role("provider")),
) -> ComplianceReportResponse:
    """Return a specific compliance report if the provider owns it."""
    if not claims.user_id:
        raise APIException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code=ErrorCode.UNAUTHORIZED,
            message="Authenticated provider not identified",
        )

    supabase = _get_service_client()
    r = _fetch_report_with_owner_check(supabase, report_id, claims.user_id)
    run = _fetch_latest_run(supabase, report_id)
    rows = _build_row_responses(_fetch_rows(supabase, report_id))

    return _build_report_response(r, rows, run)


@router.get(
    "/compliance/reports/{report_id}/pdf",
    summary="Download a compliance report as PDF",
    description=(
        "Generates and returns a Workforce Australia-style compliance report "
        "PDF from the persisted report data. The PDF is generated on-demand "
        "and returned as application/pdf."
    ),
    responses={
        200: {
            "description": "PDF file",
            "content": {"application/pdf": {}},
        },
        400: {
            "description": "Report not in completed state",
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": "INVALID_STATE",
                            "message": "Report is not completed (status: generating). Cannot generate PDF.",
                        },
                    },
                },
            },
        },
        404: {
            "description": "Report not found",
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": "NOT_FOUND",
                            "message": "Report not found or access denied",
                        },
                    },
                },
            },
        },
    },
)
async def get_compliance_report_pdf(
    report_id: str,
    claims: AuthClaims = Depends(require_role("provider")),
) -> Response:
    """Generate and download a PDF for a compliance report."""
    if not claims.user_id:
        raise APIException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code=ErrorCode.UNAUTHORIZED,
            message="Authenticated provider not identified",
        )

    supabase = _get_service_client()
    r = _fetch_report_with_owner_check(supabase, report_id, claims.user_id)

    if r["status"] != "completed":
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code=ErrorCode.INVALID_STATE,
            message=(
                f"Report is not completed (status: {r['status']}). "
                "Cannot generate PDF."
            ),
        )

    # Fetch candidate name
    candidate_name: str | None = None
    profile_resp = (
        supabase.table("profiles")
        .select("full_name")
        .eq("id", r["candidate_id"])
        .maybe_single()
        .execute()
    )
    if profile_resp.data:
        candidate_name = profile_resp.data.get("full_name")

    # Fetch provider display name
    provider_name: str | None = None
    provider_profile = (
        supabase.table("profiles")
        .select("company_name, full_name")
        .eq("id", claims.user_id)
        .maybe_single()
        .execute()
    )
    if provider_profile.data:
        provider_name = (
            provider_profile.data.get("company_name")
            or provider_profile.data.get("full_name")
        )

    # Fetch detail rows
    detail_rows = _fetch_rows(supabase, report_id)

    # Activity summary from report_data
    report_data = r.get("report_data") or {}
    activity_summary = report_data.get("activity_summary")

    # Generate PDF
    try:
        pdf_bytes = generate_compliance_pdf(
            report_id=r["id"],
            provider_name=provider_name,
            candidate_name=candidate_name,
            period_start=r["period_start"],
            period_end=r["period_end"],
            report_type=r["report_type"],
            generated_at=r.get("created_at"),
            rows=detail_rows,
            activity_summary=activity_summary,
        )
    except Exception as exc:
        raise APIException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code=ErrorCode.PDF_GENERATION_FAILED,
            message=f"PDF generation failed: {exc}",
        )

    # Persist storage path (non-blocking)
    pdf_dir = os.path.join(os.path.dirname(__file__), "..", "..", "..", "pdfs")
    os.makedirs(pdf_dir, exist_ok=True)
    pdf_path = os.path.join(pdf_dir, f"compliance-{report_id}.pdf")
    try:
        with open(pdf_path, "wb") as f:
            f.write(pdf_bytes)
        supabase.table("compliance_reports").update({
            "storage_path": pdf_path,
        }).eq("id", report_id).execute()
    except Exception:
        pass

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="compliance-{report_id}.pdf"',
        },
    )
