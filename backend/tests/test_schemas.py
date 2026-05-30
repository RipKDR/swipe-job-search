from __future__ import annotations

from datetime import datetime
from datetime import timezone as tz
from uuid import UUID

import pytest
from pydantic import ValidationError

from src.schemas.jobs import (
    EmploymentType,
    Location,
    NormalizedJob,
    RawJobInput,
    SalaryRange,
    SkillRequirement,
)

utc = tz.utc


# ── RawJobInput tests ─────────────────────────────────────────────────


class TestRawJobInput:
    def test_valid_minimal(self):
        job = RawJobInput(title="Software Engineer")
        assert job.title == "Software Engineer"
        assert job.description_raw == ""
        assert job.source_name == "unknown"

    def test_strips_html_from_description(self):
        html = "<p>Great <b>job</b> opportunity!</p><script>bad</script>"
        job = RawJobInput(title="Engineer", description_raw=html)
        assert "<" not in job.description_raw
        # HTML tag content is kept; only the tags themselves are stripped
        assert "Great job opportunity!bad" == job.description_raw

    def test_strips_html_with_nested_tags(self):
        html = "<div><span>Hello <i>World</i></span></div>"
        job = RawJobInput(title="Dev", description_raw=html)
        assert job.description_raw == "Hello World"

    def test_rejects_empty_title(self):
        with pytest.raises(ValidationError) as exc:
            RawJobInput(title="", description_raw="desc")
        assert "title" in str(exc.value).lower()

    def test_truncates_long_description(self):
        desc = "x" * 12000
        with pytest.raises(ValidationError):
            RawJobInput(title="Job", description_raw=desc)

    def test_default_source_name(self):
        job = RawJobInput(title="Job")
        assert job.source_name == "unknown"

    def test_strips_html_entities_and_whitespace(self):
        html = "  <b>Clean</b> me  "
        job = RawJobInput(title="Test", description_raw=html)
        assert job.description_raw == "Clean me"

    def test_with_all_fields(self):
        job = RawJobInput(
            title="Senior Dev",
            description_raw="Awesome job",
            company_name="ACME",
            location_raw="Sydney NSW 2000",
            salary_raw="$150k",
            employment_type_raw="full-time",
            source_url="https://example.com/job/1",
            source_name="seek",
            posted_at_raw="2026-05-28",
            external_id="EXT-001",
        )
        assert job.company_name == "ACME"
        assert job.source_url == "https://example.com/job/1"


# ── NormalizedJob tests ──────────────────────────────────────────────


class TestNormalizedJob:
    def make_valid_job(self, **kwargs) -> dict:
        base = {
            "title": "Software Engineer",
            "company_name": "Tech Co",
            "location": {"suburb": "Sydney", "state": "NSW", "postcode": "2000"},
            "employment_type": EmploymentType.full_time,
            "expires_at": datetime(2026, 12, 31, tzinfo=utc),
        }
        base.update(kwargs)
        return base

    def test_valid_job_creates_uuid(self):
        data = self.make_valid_job()
        job = NormalizedJob(**data)
        assert isinstance(job.id, UUID)
        assert job.is_active is True

    def test_profanity_blocked_in_title(self):
        data = self.make_valid_job(title="Need sex worker")
        with pytest.raises(ValidationError) as exc:
            NormalizedJob(**data)
        assert "blocked" in str(exc.value).lower()

    def test_profanity_case_insensitive(self):
        data = self.make_valid_job(title="PORN actor needed")
        with pytest.raises(ValidationError):
            NormalizedJob(**data)

    def test_clean_title_allowed(self):
        data = self.make_valid_job(title="Sexual Health Counselor")
        job = NormalizedJob(**data)
        assert job.title == "Sexual Health Counselor"

    def test_expires_at_must_be_after_posted_at(self):
        data = self.make_valid_job(
            posted_at=datetime(2026, 12, 31, tzinfo=utc),
            expires_at=datetime(2026, 1, 1, tzinfo=utc),
        )
        with pytest.raises(ValidationError) as exc:
            NormalizedJob(**data)
        assert "expires_at" in str(exc.value).lower()

    def test_expires_at_equal_to_posted_at_fails(self):
        dt = datetime(2026, 6, 1, tzinfo=utc)
        data = self.make_valid_job(posted_at=dt, expires_at=dt)
        with pytest.raises(ValidationError):
            NormalizedJob(**data)

    def test_default_posted_at_is_now(self):
        data = self.make_valid_job()
        job = NormalizedJob(**data)
        assert job.posted_at > datetime(2025, 1, 1, tzinfo=utc)

    def test_requirements_list(self):
        data = self.make_valid_job(
            requirements=[{"name": "Python", "mandatory": True, "min_years": 3.0}]
        )
        job = NormalizedJob(**data)
        assert len(job.requirements) == 1
        assert job.requirements[0].name == "Python"
        assert job.requirements[0].mandatory is True

    def test_benefits_list(self):
        data = self.make_valid_job(benefits=["Health", "Dental"])
        job = NormalizedJob(**data)
        assert job.benefits == ["Health", "Dental"]

    def test_empty_requirements_defaults(self):
        data = self.make_valid_job()
        job = NormalizedJob(**data)
        assert job.requirements == []
        assert job.benefits == []

    def test_source_defaults(self):
        data = self.make_valid_job()
        job = NormalizedJob(**data)
        assert job.source_name == "unknown"
        assert job.source_url == ""

    def test_salary_optional(self):
        data = self.make_valid_job()
        job = NormalizedJob(**data)
        assert job.salary is None

    def test_with_salary(self):
        data = self.make_valid_job(
            salary={"min": 80000, "max": 120000, "currency": "AUD", "period": "yearly"}
        )
        job = NormalizedJob(**data)
        assert job.salary is not None
        assert job.salary.min == 80000
        assert job.salary.max == 120000


# ── Location tests ───────────────────────────────────────────────────


class TestLocation:
    def test_valid_sydney(self):
        loc = Location(suburb="Sydney", state="NSW", postcode="2000")
        assert loc.state == "NSW"
        assert loc.postcode == "2000"

    def test_invalid_postcode_fails(self):
        with pytest.raises(ValidationError):
            Location(suburb="Test", state="NSW", postcode="9999")

    def test_empty_postcode_fails(self):
        with pytest.raises(ValidationError):
            Location(suburb="Test", state="NSW", postcode="")

    def test_non_numeric_postcode_fails(self):
        with pytest.raises(ValidationError):
            Location(suburb="Test", state="NSW", postcode="ABCD")

    def test_valid_vic_postcode(self):
        loc = Location(suburb="Melbourne", state="VIC", postcode="3000")
        assert loc.state == "VIC"
        assert loc.postcode == "3000"

    def test_valid_qld_postcode(self):
        loc = Location(suburb="Brisbane", state="QLD", postcode="4000")
        assert loc.state == "QLD"

    def test_state_autoupper(self):
        loc = Location(suburb="Sydney", state="nsw", postcode="2000")
        assert loc.state == "NSW"

    def test_invalid_state_fails(self):
        with pytest.raises(ValidationError):
            Location(suburb="Test", state="XX", postcode="2000")

    def test_valid_act_postcode(self):
        loc = Location(suburb="Canberra", state="ACT", postcode="2600")
        assert loc.state == "ACT"

    def test_location_with_coords(self):
        loc = Location(suburb="Sydney", state="NSW", postcode="2000", lat=-33.86, lng=151.20)
        assert loc.lat == -33.86
        assert loc.lng == 151.20

    def test_all_states_accept_top_ranges(self):
        cases = [
            ("NSW", "2998"),
            ("ACT", "2618"),
            ("VIC", "3998"),
            ("QLD", "4998"),
            ("SA", "5798"),
            ("WA", "6798"),
            ("TAS", "7798"),
            ("NT", "8998"),
        ]
        for state, pc in cases:
            loc = Location(suburb="City", state=state, postcode=pc)
            assert loc.state == state

    def test_melbourne_postcode_2000_passes_validation(self):
        """2000 is in NSW range; the validator does not cross-reference state with postcode."""
        loc = Location(suburb="Melbourne", state="VIC", postcode="2000")
        assert loc.postcode == "2000"
        assert loc.state == "VIC"


# ── SalaryRange tests ────────────────────────────────────────────────


class TestSalaryRange:
    def test_valid_salary(self):
        sr = SalaryRange(min=50000, max=100000)
        assert sr.min == 50000
        assert sr.max == 100000
        assert sr.currency == "AUD"
        assert sr.period == "yearly"

    def test_max_lt_min_fails(self):
        with pytest.raises(ValidationError) as exc:
            SalaryRange(min=100000, max=50000)
        assert "max must be >= min" in str(exc.value).lower()

    def test_max_equal_to_min_ok(self):
        sr = SalaryRange(min=80000, max=80000)
        assert sr.min == sr.max

    def test_negative_min_fails(self):
        with pytest.raises(ValidationError):
            SalaryRange(min=-1, max=100)

    def test_invalid_currency_fails(self):
        with pytest.raises(ValidationError):
            SalaryRange(min=50000, max=100000, currency="USDD")

    def test_custom_currency_with_aud_ok(self):
        sr = SalaryRange(min=50000, max=100000, currency="AUD")
        assert sr.currency == "AUD"

    def test_invalid_period_fails(self):
        with pytest.raises(ValidationError):
            SalaryRange(min=50000, max=100000, period="biweekly")

    def test_hourly_period_ok(self):
        sr = SalaryRange(min=30, max=50, period="hourly")
        assert sr.period == "hourly"


# ── SkillRequirement tests ───────────────────────────────────────────


class TestSkillRequirement:
    def test_valid_skill(self):
        sr = SkillRequirement(name="Python")
        assert sr.name == "Python"
        assert sr.mandatory is False
        assert sr.min_years is None

    def test_mandatory_skill(self):
        sr = SkillRequirement(name="Docker", mandatory=True)
        assert sr.mandatory is True

    def test_with_min_years(self):
        sr = SkillRequirement(name="Go", min_years=3.5)
        assert sr.min_years == 3.5

    def test_empty_name_fails(self):
        with pytest.raises(ValidationError):
            SkillRequirement(name="")

    def test_name_too_long_fails(self):
        with pytest.raises(ValidationError):
            SkillRequirement(name="x" * 101)

    def test_negative_min_years_allowed(self):
        """Pydantic doesn't enforce gt=0 on min_years, it's Optional[float]"""
        sr = SkillRequirement(name="Test", min_years=-1.0)
        assert sr.min_years == -1.0
