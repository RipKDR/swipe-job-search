"""Hi-Hired Backend - Compliance report generation endpoint.

Supports Centrelink/Workforce Australia compliance reporting for
provider partners (Asuria/DES mentors). Providers generate reports
for candidates who have granted bulk_swipe_consent.
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


class ComplianceReportResponse(BaseModel):
    id: str
    candidate_id: str
    provider_id: str
    period_start: date
    period_end: date
    report_type: str
    status: str
    report_data: dict | None = None
    created_at: str


# ── Helpers ────────────────────────────────────────────────────────────────

def _get_service_client():
    """Return a Supabase client with service_role for backend operations."""
    return create_client(settings.supabase_url, settings.supabase_service_key)


def _build_compliance_report_data(
    *,
    profile: dict,
    swipes: list[dict],
    matches: list[dict],
    hires: list[dict],
    period_start: date,
    period_end: date,
) -> dict:
    """Assemble structured compliance data for DES/Workforce Australia reporting."""
    # Count distinct employer interactions
    employers_swiped: set[str] = set()
    swipe_count = 0
    for s in swipes:
        job_id = s.get("job_id")
        if job_id:
            employers_swiped.add(job_id)
        if s.get("direction") == "right":
            swipe_count += 1

    return {
        "candidate": {
            "id": profile["id"],
            "full_name": profile.get("full_name"),
            "suburb": profile.get("suburb"),
            "skills": profile.get("skills", []),
            "work_rights": profile.get("work_rights"),
            "availability": profile.get("availability_text"),
        },
        "period": {
            "start": period_start.isoformat(),
            "end": period_end.isoformat(),
        },
        "activity_summary": {
            "total_swipes": len(swipes),
            "right_swipes": swipe_count,
            "unique_jobs_interacted": len(employers_swiped),
            "total_matches": len(matches),
            "total_hires": len(hires),
        },
        "matches": [
            {
                "match_id": m["id"],
                "status": m.get("status"),
                "created_at": m.get("created_at"),
                "hired_at": m.get("hired_at"),
            }
            for m in matches
        ],
        "hires": [
            {
                "hire_id": h.get("hire_confirmation_id") or h.get("id"),
                "job_id": h.get("job_id"),
                "employer_id": h.get("employer_id"),
                "created_at": h.get("created_at"),
            }
            for h in hires
        ],
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
        "bulk_swipe_consent. Returns the stored report metadata."
    ),
)
async def generate_compliance_report(
    body: GenerateReportRequest,
    claims: AuthClaims = Depends(require_role("provider")),
) -> ComplianceReportResponse:
    """Generate a compliance report for the given candidate and period."""
    if not claims.user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated provider not identified",
        )

    supabase = _get_service_client()

    # 1. Verify candidate exists and has granted bulk swipe consent
    candidate_resp = supabase.table("profiles").select(
        "id, full_name, suburb, skills, work_rights, availability_text, "
        "bulk_swipe_consent, consent_granted_at"
    ).eq("id", body.candidate_id).maybe_single().execute()

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

    # 2. Upsert a compliance_reports row (pending)
    period_start = body.period_start.isoformat()
    period_end = body.period_end.isoformat()
    now = datetime.now(timezone.utc).isoformat()

    report_insert = (
        supabase.table("compliance_reports")
        .insert({
            "candidate_id": body.candidate_id,
            "provider_id": claims.user_id,
            "period_start": period_start,
            "period_end": period_end,
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

    try:
        # 3. Query activity data for the period
        swipes_resp = supabase.table("swipes").select(
            "id, job_id, direction, created_at"
        ).eq("candidate_id", body.candidate_id).gte(
            "created_at", period_start
        ).lte(
            "created_at", period_end + "T23:59:59"
        ).execute()

        matches_resp = supabase.table("matches").select(
            "id, status, created_at, hired_at"
        ).or_(
            f"candidate_id.eq.{body.candidate_id}"
        ).gte(
            "created_at", period_start
        ).lte(
            "created_at", period_end + "T23:59:59"
        ).execute()

        hires_resp = supabase.table("hire_confirmations").select(
            "id, job_id, employer_id, created_at"
        ).eq("candidate_id", body.candidate_id).gte(
            "created_at", period_start
        ).lte(
            "created_at", period_end + "T23:59:59"
        ).execute()

        # 4. Build structured report data
        report_data = _build_compliance_report_data(
            profile=candidate,
            swipes=swipes_resp.data or [],
            matches=matches_resp.data or [],
            hires=hires_resp.data or [],
            period_start=body.period_start,
            period_end=body.period_end,
        )

        # 5. Update report with completed data
        supabase.table("compliance_reports").update({
            "status": "completed",
            "report_data": report_data,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", report_id).execute()

    except Exception as exc:
        supabase.table("compliance_reports").update({
            "status": "failed",
            "error_message": str(exc),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", report_id).execute()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report generation failed: {exc}",
        )

    return ComplianceReportResponse(
        id=report_id,
        candidate_id=body.candidate_id,
        provider_id=claims.user_id,
        period_start=body.period_start,
        period_end=body.period_end,
        report_type=body.report_type,
        status="completed",
        report_data=report_data,
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

    return [
        ComplianceReportResponse(
            id=r["id"],
            candidate_id=r["candidate_id"],
            provider_id=r["provider_id"],
            period_start=r["period_start"],
            period_end=r["period_end"],
            report_type=r["report_type"],
            status=r["status"],
            report_data=r.get("report_data"),
            created_at=r["created_at"],
        )
        for r in resp.data
    ]


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
    return ComplianceReportResponse(
        id=r["id"],
        candidate_id=r["candidate_id"],
        provider_id=r["provider_id"],
        period_start=r["period_start"],
        period_end=r["period_end"],
        report_type=r["report_type"],
        status=r["status"],
        report_data=r.get("report_data"),
        created_at=r["created_at"],
    )
