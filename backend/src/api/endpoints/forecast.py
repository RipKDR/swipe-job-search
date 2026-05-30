"""Hi-Hired Backend — Offer-potential forecasting endpoints.

Provides match-score predictions powered by the LogisticMatchScorer
ML pipeline, with an in-memory LRU cache for deterministic results.
"""

from __future__ import annotations

import time
from collections import OrderedDict
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.schemas.jobs import NormalizedJob
from src.schemas.profile import UserProfile
from src.services.match_scorer import LogisticMatchScorer

logger = __import__("structlog").get_logger()

router = APIRouter(tags=["forecast"])

# ---------------------------------------------------------------------------
# In-memory LRU cache for deterministic score results
# ---------------------------------------------------------------------------

_ScoreKey = tuple[str, str]  # (user_id, job_id)


class _LRUCache:
    """Simple thread-safe-ish LRU with TTL expiry."""

    def __init__(self, capacity: int = 1000, ttl: int = 300) -> None:
        self._store: OrderedDict[_ScoreKey, tuple[Any, float]] = OrderedDict()
        self._capacity = capacity
        self._ttl = ttl

    def get(self, key: _ScoreKey) -> Any | None:
        if key not in self._store:
            return None
        value, expiry = self._store[key]
        if time.monotonic() > expiry:
            del self._store[key]
            return None
        self._store.move_to_end(key)
        return value

    def set(self, key: _ScoreKey, value: Any) -> None:
        self._store[key] = (value, time.monotonic() + self._ttl)
        self._store.move_to_end(key)
        if len(self._store) > self._capacity:
            self._store.popitem(last=False)

    def invalidate(self, user_id: str, job_id: str) -> None:
        self._store.pop((user_id, job_id), None)

    def clear(self) -> None:
        self._store.clear()


_cache = _LRUCache()

# Shared scorer instance (model loading happens once)
_scorer = LogisticMatchScorer()

# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------


class ScoreRequest(BaseModel):
    """Request body for POST /api/v1/forecast/score."""

    job_id: str = Field(..., description="UUID of the job to score")
    user_profile: UserProfile
    job: NormalizedJob = Field(..., description="Full job details for scoring")


class ScoredJobItem(BaseModel):
    """A single job with its computed match score."""

    job: NormalizedJob
    score: float
    matching_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)


class ScoreResponse(BaseModel):
    """Response for a single score request."""

    score: float
    matching_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    confidence: str
    reasoning: str


class BatchScoreRequest(BaseModel):
    """Request body for GET /api/v1/forecast/batch."""

    user_profile: UserProfile
    jobs: list[NormalizedJob] = Field(..., min_length=1, max_length=100)


class BatchScoreResponse(BaseModel):
    """Response for a batch score request."""

    results: list[ScoredJobItem] = Field(default_factory=list)
    total: int = 0


# ---------------------------------------------------------------------------
# Scoring helpers
# ---------------------------------------------------------------------------


def _compute_skills_match(
    user_profile: UserProfile,
    job: NormalizedJob,
) -> tuple[list[str], list[str]]:
    """Return (matching_skills, missing_skills) between profile and job."""
    user_skills = {s.strip().lower() for s in user_profile.skills if s}
    job_skills = {r.name.strip().lower() for r in job.requirements if r.name.strip()}

    matching = sorted(user_skills & job_skills)
    missing = sorted(job_skills - user_skills)
    return matching, missing


def _compute_confidence(score: float) -> str:
    """Qualitative confidence label from a numeric score.

    Uses the same feature-space reasoning the scorer does internally,
    expressed as a human-readable label.
    """
    if score >= 0.85:
        return "high"
    if score >= 0.6:
        return "medium"
    return "low"


def _compute_reasoning(
    score: float,
    matching: list[str],
    missing: list[str],
) -> str:
    """Generate a one-line human-readable reasoning string."""
    parts: list[str] = []
    if matching:
        parts.append(f"matches {len(matching)} skill{'s' if len(matching) != 1 else ''}")
    if missing:
        parts.append(f"missing {len(missing)} skill{'s' if len(missing) != 1 else ''}")
    if not matching and not missing:
        parts.append("no skill data to evaluate")

    confidence = _compute_confidence(score)
    if score >= 0.7:
        verdict = "Strong match"
    elif score >= 0.4:
        verdict = "Moderate match"
    else:
        verdict = "Weak match"

    return f"{verdict} ({confidence} confidence) — {'; '.join(parts)}."


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/forecast/score", response_model=ScoreResponse)
async def score_job(req: ScoreRequest) -> ScoreResponse:
    """Score a single job against a user profile.

    Returns the match score (0–1), matching and missing skills,
    a confidence label, and a human-readable reasoning string.
    Results are cached by ``(user_id, job_id)`` for 5 minutes.
    """
    user_id = req.user_profile.user_id
    job_id = req.job_id

    # --- Check cache ---
    cache_key: _ScoreKey = (user_id, job_id)
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    # --- Validate ---
    if not job_id.strip():
        raise HTTPException(status_code=422, detail="job_id must not be empty")

    # --- Score ---
    try:
        profile_dict = req.user_profile.model_dump()
        score = _scorer.score(profile_dict, req.job)
    except Exception as exc:
        logger.exception("score_job_failed", job_id=job_id, user_id=user_id)
        raise HTTPException(
            status_code=500,
            detail=f"Scoring failed: {exc}",
        )

    # --- Skills match ---
    matching, missing = _compute_skills_match(req.user_profile, req.job)

    # --- Build response ---
    confidence = _compute_confidence(score)
    reasoning = _compute_reasoning(score, matching, missing)

    response = ScoreResponse(
        score=round(score, 4),
        matching_skills=matching,
        missing_skills=missing,
        confidence=confidence,
        reasoning=reasoning,
    )

    # --- Cache ---
    _cache.set(cache_key, response)

    return response


@router.post("/forecast/batch", response_model=BatchScoreResponse)
async def batch_score_post(req: BatchScoreRequest) -> BatchScoreResponse:
    """Score multiple jobs against a user profile in one call (POST variant).

    Accepts a ``user_profile`` and a list of ``jobs`` (max 100),
    returns each job with its computed score, matching skills, and
    missing skills, sorted by descending score.
    """
    profile_dict = req.user_profile.model_dump()
    results: list[ScoredJobItem] = []

    for job in req.jobs:
        try:
            score = _scorer.score(profile_dict, job)
            matching, missing = _compute_skills_match(req.user_profile, job)
            results.append(
                ScoredJobItem(
                    job=job,
                    score=round(score, 4),
                    matching_skills=matching,
                    missing_skills=missing,
                )
            )
        except Exception as exc:
            logger.warning(
                "batch_score_job_failed",
                job_id=str(job.id),
                error=str(exc),
            )
            results.append(ScoredJobItem(job=job, score=0.0, matching_skills=[], missing_skills=[]))

    results.sort(key=lambda r: r.score, reverse=True)

    return BatchScoreResponse(results=results, total=len(results))
