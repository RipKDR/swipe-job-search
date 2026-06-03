"""Tests for the job normalizer service."""

from __future__ import annotations

from datetime import timezone as tz

import pytest

from src.schemas.jobs import (
    EmploymentType,
    NormalizedJob,
    RawJobInput,
)
from src.services.job_normalizer import (
    normalize_job,
    parse_employment_type,
    parse_location,
    parse_requirements,
    parse_salary,
)

utc = tz.utc


# ── parse_salary ──────────────────────────────────────────────────────────


class TestParseSalary:
    def test_none_empty_returns_none(self):
        assert parse_salary("") is None
        assert parse_salary(None) is None  # type: ignore[arg-type]
        assert parse_salary("   ") is None

    def test_yearly_range_k(self):
        result = parse_salary("$70k-$90k + super")
        assert result is not None
        assert result.min == 70000
        assert result.max == 90000
        assert result.currency == "AUD"
        assert result.period == "yearly"

    def test_hourly_rate(self):
        result = parse_salary("$30-$40/hr")
        assert result is not None
        assert result.min == 30
        assert result.max == 40
        assert result.period == "hourly"

    def test_hourly_single(self):
        result = parse_salary("$35 per hour")
        assert result is not None
        assert result.period == "hourly"
        assert result.min == 35
        assert result.max == 42  # 35 * 1.2

    def test_weekly_rate(self):
        result = parse_salary("$1,000/wk")
        assert result is not None
        assert result.min == 1000
        assert result.max == 1200
        assert result.period == "weekly"

    def test_yearly_with_kpa(self):
        result = parse_salary("$50-$60kpa")
        assert result is not None
        assert result.min == 50000
        assert result.max == 60000
        assert result.period == "yearly"

    def test_full_dollar_range(self):
        result = parse_salary("$80,000 - $100,000 per annum")
        assert result is not None
        assert result.min == 80000
        assert result.max == 100000
        assert result.period == "yearly"

    def test_single_value_with_super(self):
        result = parse_salary("$90,000 + super")
        assert result is not None
        assert result.min == 90000
        assert result.max >= 90000

    def test_package_notation(self):
        result = parse_salary("$120k package")
        assert result is not None
        assert result.min == 120000

    def test_monthly_salary(self):
        result = parse_salary("$5,000 per month")
        assert result is not None
        assert result.period == "monthly"
        assert result.min == 5000

    def test_million_range(self):
        result = parse_salary("$1.2m - $1.5m")
        assert result is not None
        assert result.min == 1200000

    def test_no_numbers_returns_none(self):
        assert parse_salary("Competitive salary") is None

    def test_minimum_wage_text(self):
        result = parse_salary("$23.23/hr")
        assert result is not None
        assert abs(result.min - 23.23) < 0.01
        assert result.period == "hourly"

    def test_large_yearly_not_converted_to_hourly(self):
        result = parse_salary("$80,000/yr")
        assert result is not None
        assert result.period == "yearly"
        assert result.min == 80000


# ── parse_employment_type ─────────────────────────────────────────────────


class TestParseEmploymentType:
    def test_none_defaults_full_time(self):
        assert parse_employment_type(None) == EmploymentType.full_time

    def test_empty_defaults_full_time(self):
        assert parse_employment_type("") == EmploymentType.full_time

    def test_full_time_variants(self):
        for variant in ["full-time", "full_time", "full time", "permanent", "ongoing"]:
            assert parse_employment_type(variant) == EmploymentType.full_time, f"Failed: {variant}"

    def test_part_time_variants(self):
        for variant in ["part-time", "part_time", "part time"]:
            assert parse_employment_type(variant) == EmploymentType.part_time, f"Failed: {variant}"

    def test_casual(self):
        assert parse_employment_type("casual") == EmploymentType.casual

    def test_contract_variants(self):
        for variant in ["contract", "contractor", "fixed term"]:
            assert parse_employment_type(variant) == EmploymentType.contract, f"Failed: {variant}"

    def test_temporary_variants(self):
        for variant in ["temporary", "temp", "seasonal"]:
            assert parse_employment_type(variant) == EmploymentType.temporary, f"Failed: {variant}"

    def test_freelance(self):
        assert parse_employment_type("freelance") == EmploymentType.freelance

    def test_fallback_to_full_time(self):
        assert parse_employment_type("unknown type") == EmploymentType.full_time


# ── parse_location ────────────────────────────────────────────────────────


class TestParseLocation:
    def test_none_returns_none(self):
        assert parse_location(None) is None  # type: ignore[arg-type]

    def test_empty_returns_none(self):
        assert parse_location("") is None

    def test_suburb_state_postcode(self):
        loc = parse_location("Tullamarine, VIC 3043")
        assert loc is not None
        assert loc.suburb == "Tullamarine"
        assert loc.state == "VIC"
        assert loc.postcode == "3043"

    def test_suburb_state_postcode_no_comma(self):
        loc = parse_location("Sydney NSW 2000")
        assert loc is not None
        assert loc.suburb == "Sydney"
        assert loc.state == "NSW"
        assert loc.postcode == "2000"

    def test_suburb_state_postcode_australia_suffix(self):
        loc = parse_location("Melbourne, VIC 3000, Australia")
        assert loc is not None
        assert loc.suburb == "Melbourne"
        assert loc.state == "VIC"
        assert loc.postcode == "3000"

    def test_state_and_postcode_only(self):
        loc = parse_location("VIC 3000")
        assert loc is not None
        assert loc.suburb == "Unknown"
        assert loc.state == "VIC"
        assert loc.postcode == "3000"

    def test_postcode_only_with_suburb(self):
        loc = parse_location("Brisbane 4000")
        assert loc is not None
        # Brisbane is in QLD, postcode 4000 should map to QLD
        assert loc.state == "QLD"
        assert loc.postcode == "4000"

    def test_suburb_with_state_only_fallback_postcode(self):
        loc = parse_location("Parramatta, NSW")
        assert loc is not None
        assert loc.suburb == "Parramatta"
        assert loc.state == "NSW"
        # Falls back to "2000"
        assert loc.postcode == "2000"

    def test_invalid_location_returns_none(self):
        assert parse_location("Some unknown place without state") is None

    def test_act_location(self):
        loc = parse_location("Canberra ACT 2600")
        assert loc is not None
        assert loc.state == "ACT"

    def test_remote_work_returns_none(self):
        assert parse_location("Remote / WFH") is None

    def test_postcode_guessing_wa(self):
        loc = parse_location("Perth 6000")
        assert loc is not None
        assert loc.state == "WA"

    def test_postcode_guessing_sa(self):
        loc = parse_location("Adelaide 5000")
        assert loc is not None
        assert loc.state == "SA"

    def test_postcode_guessing_tas(self):
        loc = parse_location("Hobart 7000")
        assert loc is not None
        assert loc.state == "TAS"

    def test_postcode_guessing_nt(self):
        loc = parse_location("Darwin 8000")
        assert loc is not None
        assert loc.state == "NT"


# ── parse_requirements ────────────────────────────────────────────────────


class TestParseRequirements:
    def test_none_returns_empty(self):
        assert parse_requirements(None) == []

    def test_empty_returns_empty(self):
        assert parse_requirements("") == []

    def test_bullet_list(self):
        desc = """Requirements:
• 5+ years Python experience
• Experience in AWS
• Knowledge of Docker
• Must have valid work rights"""
        skills = parse_requirements(desc)
        assert len(skills) >= 4
        names = [s.name for s in skills]
        assert any("Python" in n for n in names)
        assert any("AWS" in n for n in names)
        assert any("Docker" in n for n in names)

    def test_numbered_list(self):
        desc = "1. 3 years React experience\n2. TypeScript knowledge\n3. Required: GraphQL"
        skills = parse_requirements(desc)
        assert len(skills) >= 3

    def test_mandatory_detection(self):
        desc = "Must have valid work rights\nEssential: communication skills\nPython required"
        skills = parse_requirements(desc)
        mandatory_skills = [s for s in skills if s.mandatory]
        assert len(mandatory_skills) >= 2

    def test_min_years_extraction(self):
        desc = "5+ years experience in Python"
        skills = parse_requirements(desc)
        assert len(skills) >= 1
        assert skills[0].min_years == 5.0

    def test_long_name_truncated(self):
        # Names over 100 chars are excluded
        desc = "x" * 200
        skills = parse_requirements(desc)
        # Should either be empty or have a truncated name
        for s in skills:
            assert len(s.name) <= 100


# ── normalize_job integration ─────────────────────────────────────────────


class TestNormalizeJob:
    def test_basic_normalization(self):
        raw = RawJobInput(
            title="Barista",
            location_raw="Tullamarine, VIC 3043",
            salary_raw="$30-$40/hr",
            source_url="https://test.com/job/1",
        )
        result = normalize_job(raw, source_name="seek")
        assert isinstance(result, NormalizedJob)
        assert result.title == "Barista"
        assert result.location.suburb == "Tullamarine"
        assert result.location.state == "VIC"
        assert result.location.postcode == "3043"
        assert result.employment_type == EmploymentType.full_time
        assert result.salary is not None
        assert result.salary.period == "hourly"
        assert result.salary.min == 30
        assert result.salary.max == 40
        assert result.source_name == "seek"
        assert result.is_active is True
        assert result.expires_at > result.posted_at
        assert result.benefits == []

    def test_full_time_contract_detected(self):
        raw = RawJobInput(
            title="Developer",
            location_raw="Sydney NSW 2000",
            salary_raw="$150k",
            employment_type_raw="contract",
        )
        result = normalize_job(raw)
        assert result.employment_type == EmploymentType.contract

    def test_part_time_detected(self):
        raw = RawJobInput(
            title="Sales Assistant",
            location_raw="Melbourne VIC 3000",
            employment_type_raw="part-time",
        )
        result = normalize_job(raw)
        assert result.employment_type == EmploymentType.part_time

    def test_casual_detected(self):
        raw = RawJobInput(
            title="Hospitality Worker",
            location_raw="Brisbane QLD 4000",
            employment_type_raw="casual",
        )
        result = normalize_job(raw)
        assert result.employment_type == EmploymentType.casual

    def test_description_based_requirements(self):
        raw = RawJobInput(
            title="Senior Python Dev",
            location_raw="Sydney NSW 2000",
            description_raw="Requirements:\n• 5+ years Python\n• AWS experience required",
        )
        result = normalize_job(raw)
        assert len(result.requirements) > 0

    def test_minimal_input(self):
        raw = RawJobInput(title="Cleaner")
        result = normalize_job(raw)
        assert result.title == "Cleaner"
        # Falls back to default location
        assert result.location.suburb == "Unknown"
        assert result.location.state == "NSW"
        assert result.location.postcode == "2000"
        assert result.salary is None
        assert result.employment_type == EmploymentType.full_time

    def test_profanity_blocked(self):
        raw = RawJobInput(title="Need sex worker")
        with pytest.raises(ValueError, match="blocked"):
            normalize_job(raw)

    def test_generates_uuid(self):
        raw = RawJobInput(title="Engineer")
        result = normalize_job(raw)
        assert result.id is not None

    def test_description_truncated(self):
        long_desc = "x" * 10000
        raw = RawJobInput(title="Job", description_raw=long_desc)
        result = normalize_job(raw)
        assert len(result.description) <= 5000
