from __future__ import annotations

import re
from datetime import datetime
from datetime import timezone as tz
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, field_validator, model_validator

utc = tz.utc


class EmploymentType(str, Enum):
    full_time = "full_time"
    part_time = "part_time"
    casual = "casual"
    contract = "contract"
    temporary = "temporary"
    freelance = "freelance"


class SalaryRange(BaseModel):
    min: float = Field(..., ge=0)
    max: float = Field(..., ge=0)
    currency: str = Field(default="AUD", pattern=r"^[A-Z]{3}$")
    period: str = Field(default="yearly", pattern=r"^(yearly|monthly|weekly|hourly)$")

    @field_validator("max")
    @classmethod
    def max_gte_min(cls, v, info):
        if "min" in info.data and v < info.data["min"]:
            raise ValueError("max must be >= min")
        return v


class Location(BaseModel):
    suburb: str = Field(..., min_length=1, max_length=100)
    state: str = Field(..., min_length=2, max_length=3)
    postcode: str = Field(..., pattern=r"^\d{4}$")
    lat: Optional[float] = None
    lng: Optional[float] = None

    @field_validator("postcode")
    @classmethod
    def validate_au_postcode(cls, v):
        VALID = {
            "NSW": range(2000, 2999),
            "ACT": range(2600, 2619),
            "VIC": range(3000, 3999),
            "QLD": range(4000, 4999),
            "SA": range(5000, 5799),
            "WA": range(6000, 6799),
            "TAS": range(7000, 7799),
            "NT": range(8000, 8999),
        }
        for state, prange in VALID.items():
            if int(v) in prange:
                return v
        raise ValueError(f"Invalid AU postcode: {v}")

    @field_validator("state")
    @classmethod
    def validate_state(cls, v):
        allowed = {"NSW", "ACT", "VIC", "QLD", "SA", "WA", "TAS", "NT"}
        if v.upper() not in allowed:
            raise ValueError(f"Invalid state: {v}")
        return v.upper()


class SkillRequirement(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    mandatory: bool = False
    min_years: Optional[float] = None


class RawJobInput(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description_raw: str = Field(default="", max_length=10000)
    company_name: str = Field(default="", max_length=200)
    location_raw: str = Field(default="", max_length=200)
    salary_raw: str = Field(default="", max_length=200)
    employment_type_raw: Optional[str] = None
    source_url: str = Field(default="", max_length=500)
    source_name: str = Field(default="unknown", max_length=100)
    posted_at_raw: Optional[str] = None
    external_id: Optional[str] = None

    @field_validator("description_raw")
    @classmethod
    def strip_html(cls, v):
        return re.sub(r"<[^>]+>", "", v).strip()


class NormalizedJob(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    title: str = Field(..., min_length=1, max_length=200)
    company_name: str = ""
    location: Location
    employment_type: EmploymentType
    salary: Optional[SalaryRange] = None
    description: str = Field(default="", max_length=5000)
    requirements: list[SkillRequirement] = Field(default_factory=list)
    benefits: list[str] = Field(default_factory=list)
    source_url: str = ""
    source_name: str = "unknown"
    posted_at: datetime = Field(default_factory=lambda: datetime.now(tz=utc))
    expires_at: datetime
    is_active: bool = True

    @field_validator("title")
    @classmethod
    def check_profanity(cls, v):
        blocked = {"sex", "porn", "nsfw"}
        if set(v.lower().split()) & blocked:
            raise ValueError("Title contains blocked terms")
        return v

    @model_validator(mode="after")
    def expires_after_posted(self):
        if self.expires_at <= self.posted_at:
            raise ValueError("expires_at must be after posted_at")
        return self
