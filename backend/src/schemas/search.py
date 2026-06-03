from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

from src.schemas.jobs import EmploymentType, NormalizedJob


class JobSearchQuery(BaseModel):
    query: str = Field(default="", max_length=500)
    location_suburb: Optional[str] = Field(default=None, max_length=100)
    location_state: Optional[str] = Field(default=None, pattern=r"^(NSW|ACT|VIC|QLD|SA|WA|TAS|NT)$")
    employment_type: Optional[EmploymentType] = None
    salary_min: Optional[float] = Field(default=None, gt=0)
    salary_max: Optional[float] = Field(default=None, gt=0)
    radius_km: Optional[float] = Field(default=None, gt=0, le=200)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class JobMatchResult(BaseModel):
    job: NormalizedJob
    score: float = Field(..., ge=0.0, le=1.0)
    matching_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
