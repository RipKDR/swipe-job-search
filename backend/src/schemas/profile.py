from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class UserProfile(BaseModel):
    """A candidate's profile for job matching."""

    user_id: str
    skills: list[str] = Field(default_factory=list)
    suburb: str = ""
    expected_salary: Optional[float] = None
    preferred_type: Optional[str] = None
    industry_preferences: list[str] = Field(default_factory=list)
