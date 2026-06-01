"""Hi-Hired Backend — Offer-potential forecasting endpoints.

Provides match-score predictions powered by the LogisticMatchScorer
ML pipeline, with an in-memory LRU cache for deterministic results.
"""

from __future__ import annotations

import time
from collections import OrderedDict
from typing import Any

from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from src.core.errors import APIException, ErrorCode
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
_scorer = LogisticMatchScorer()

# ---------------------------------------------------------------------------
# Request / response schemas (Contract-first per api-and-interface-design)
# ---------------------------------------------------------------------------


class ScoreRequest(BaseModel):
    """Input: a job and user profile to score."""
    job_id: str = Field(..., description="UUID of the job to score")
    user_profile: UserProfile
    job: NormalizedJob = Field(..., description="Full job details for scoring")


class ScoredJobItem(BaseModel):
    """Output: a single job with its computed match score."""
    job: NormalizedJob
    score: float
    matching_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)


class ScoreResponse(BaseModel):
    """Output: match score result with skill analysis."""
    score: float
    matching_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    confidence: str
    reasoning: str


class BatchScoreRequest(BaseModel):
    """Input: a user profile and list of jobs to score (max 100)."""
    user_profile: UserProfile
    jobs: list[NormalizedJob] = Field(..., min_length=1, max_length=100)


class BatchScoreResponse(BaseModel):
    """Output: scored jobs sorted by descending match score."""
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
    """Qualitative confidence label from a numeric score."""
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


@router.post(
    "/forecast/score",
    response_model=ScoreResponse,
    summary="Score a single job against a user profile",
    description=(
        "Returns a match score (0–1), matching and missing skills, "
        "confidence label, and reasoning. Results are cached by "
        "(user_id, job_id) for 5 minutes."
    ),
)
async def score_job(req: ScoreRequest) -> ScoreResponse:
    """Score a single job against a user profile."""
    user_id = req.user_profile.user_id
    job_id = req.job_id

    # Validate
    if not job_id.strip():
        raise APIException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            code=ErrorCode.VALIDATION_ERROR,
            message="job_id must not be empty",
        )

    # Check cache
    cache_key: _ScoreKey = (user_id, job_id)
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    # Score
    try:
        profile_dict = req.user_profile.model_dump()
        score = _scorer.score(profile_dict, req.job)
    except Exception as exc:
        logger.exception("score_job_failed", job_id=job_id, user_id=user_id)
        raise APIException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code=ErrorCode.DEPENDENCY_FAILURE,
            message=f"Scoring failed: {exc}",
        )

    matching, missing = _compute_skills_match(req.user_profile, req.job)
    confidence = _compute_confidence(score)
    reasoning = _compute_reasoning(score, matching, missing)

    response = ScoreResponse(
        score=round(score, 4),
        matching_skills=matching,
        missing_skills=missing,
        confidence=confidence,
        reasoning=reasoning,
    )

    _cache.set(cache_key, response)
    return response


@router.post(
    "/forecast/batch",
    response_model=BatchScoreResponse,
    summary="Score multiple jobs against a user profile in one call",
    description=(
        "Accepts a user_profile and up to 100 jobs. Returns each job "
        "with its computed score, matching skills, and missing skills, "
        "sorted by descending score."
    ),
)
async def batch_score_post(req: BatchScoreRequest) -> BatchScoreResponse:
    """Score multiple jobs against a user profile."""
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
            results.append(
                ScoredJobItem(job=job, score=0.0, matching_skills=[], missing_skills=[])
            )

    results.sort(key=lambda r: r.score, reverse=True)
    return BatchScoreResponse(results=results, total=len(results))
