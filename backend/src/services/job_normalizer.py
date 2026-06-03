"""Hi-Hired Backend - Job normalizer service.

Parses raw job input (text) into structured NormalizedJob models.
Handles Australian salary strings, employment types, locations, and requirements.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone as tz
from typing import Optional
from uuid import uuid4

from src.schemas.jobs import (
    EmploymentType,
    Location,
    NormalizedJob,
    RawJobInput,
    SalaryRange,
    SkillRequirement,
)

utc = tz.utc

# ── helpers ───────────────────────────────────────────────────────────────


def _clean(s: str) -> str:
    """Strip whitespace and collapse multiple spaces."""
    return re.sub(r"\s+", " ", s).strip()


def _extract_numbers(text: str) -> list[float]:
    """Extract all positive float/int values from a string.

    Commas used as thousands separators (followed by exactly 3 digits)
    are removed before conversion. Dots are treated as decimal separators.
    """
    # First, normalize commas: if comma followed by exactly 3 digits, it's a
    # thousands separator -> remove it. Otherwise it might be a decimal -> replace with dot.
    text = re.sub(r",(?=\d{3}\b)", "", text)
    text = re.sub(r",", ".", text)
    return [float(x) for x in re.findall(r"\d+(?:\.\d+)*", text)]


# ── public API ────────────────────────────────────────────────────────────


def parse_salary(raw: str) -> Optional[SalaryRange]:
    """Parse Australian salary strings into a SalaryRange.

    Handles formats like:
      - "$70k-$90k + super"
      - "$30/hr"
      - "$1,000/wk"
      - "$50-$60kpa"
      - "$80,000 - $100,000 per annum"
      - "$35 per hour"
      - "$120k package"
      - "$90,000 + super"
    """
    if not raw or not raw.strip():
        return None

    text = _clean(raw).lower()

    # Strip currency symbols only (keep commas for now)
    text = re.sub(r"[\$€£¥]", "", text)

    # Determine period from keywords (check BEFORE normalizing k/m)
    period = "yearly"
    if any(w in text for w in ("/hr", "/hour", "per hour", " hourly")):
        period = "hourly"
    elif any(w in text for w in ("/wk", "/week", "per week", " weekly")):
        period = "weekly"
    elif any(w in text for w in ("/mo", "/month", "per month", " monthly")):
        period = "monthly"
    elif any(w in text for w in ("pa", "/annum", "per annum", "per year", "/year", " yearly")):
        period = "yearly"

    # Normalize k/m notation (e.g. "70k" -> "70000")
    # Must handle "kpa", "k" before word boundary, etc.
    text = re.sub(
        r"(\d+(?:[.,]\d+)?)\s*k(?:pa)?\b",
        lambda m: str(int(float(m.group(1).replace(",", ".")) * 1000)),
        text,
    )
    text = re.sub(
        r"(\d+(?:[.,]\d+)?)\s*m\b",
        lambda m: str(int(float(m.group(1).replace(",", ".")) * 1_000_000)),
        text,
    )

    # Normalize commas: if comma followed by exactly 3 digits at word boundary,
    # it's a thousands separator -> remove it (so numbers parse correctly)
    text = re.sub(r",(?=\d{3}\b)", "", text)

    # Clean up any remaining non-numeric content
    text = re.sub(r"\s+", " ", text).strip()

    # Extract all numbers
    numbers = _extract_numbers(text)
    if not numbers:
        return None

    # Try to detect a range: two numbers with 'to', '-', or '–' between them
    range_match = re.search(
        r"(\d+(?:\.\d+)?)\s*(?:to|-|–)\s*(\d+(?:\.\d+)?)",
        text,
    )
    if range_match and len(numbers) >= 2:
        min_val = float(range_match.group(1))
        max_val = float(range_match.group(2))
        # Handle implicit k: if second number has 'k' but first doesn't
        # (e.g., "$50-$60kpa" -> 50 vs 60000), scale first by 1000
        if max_val >= min_val * 10 and min_val < 10000:
            # Check if the original text had 'k' after the second number
            second_part = range_match.group(0).split(range_match.group(2))[0]
            if not re.search(r"k", second_part, re.IGNORECASE):
                # The 'k' was only after the second value; scale first value too
                min_val *= 1000
    elif len(numbers) >= 1:
        min_val = numbers[0]
        max_val = round(min_val * 1.2, 2)
    else:
        return None

    if min_val <= 0 or max_val <= 0:
        return None

    # Sanity: if period is not yearly but values look yearly, fix period
    if period != "yearly" and min_val > 5000:
        period = "yearly"

    return SalaryRange(
        min=min_val,
        max=max_val,
        currency="AUD",
        period=period,
    )


def parse_employment_type(raw: Optional[str]) -> EmploymentType:
    """Map raw employment type strings to EmploymentType enum."""
    if not raw:
        return EmploymentType.full_time

    text = _clean(raw).lower()

    if text in ("full-time", "full_time", "full time", "permanent", "ongoing"):
        return EmploymentType.full_time
    elif text in ("part-time", "part_time", "part time"):
        return EmploymentType.part_time
    elif text in ("casual",):
        return EmploymentType.casual
    elif text in ("contract", "contractor", "fixed term"):
        return EmploymentType.contract
    elif text in ("temporary", "temp", "seasonal"):
        return EmploymentType.temporary
    elif text in ("freelance", "freelancer", "freelance/contract"):
        return EmploymentType.freelance

    # Try substring matching for compound terms
    if "full" in text or "permanent" in text:
        return EmploymentType.full_time
    if "part" in text:
        return EmploymentType.part_time
    if "casual" in text:
        return EmploymentType.casual
    if "contract" in text or "fixed" in text:
        return EmploymentType.contract
    if "temp" in text or "seasonal" in text:
        return EmploymentType.temporary
    if "freelance" in text:
        return EmploymentType.freelance

    return EmploymentType.full_time


def parse_location(raw: str) -> Optional[Location]:
    """Parse Australian location strings like 'Suburb, STATE 1234'.

    Also handles:
      - "Suburb STATE 1234"
      - "Suburb, STATE 1234, Australia"
      - "STATE 1234" (suburb defaults to "")
      - City-only with no postcode: returns None
    """
    if not raw or not raw.strip():
        return None

    text = _clean(raw)
    # Remove trailing ", Australia"
    text = re.sub(r",?\s*australia$", "", text, flags=re.IGNORECASE)

    # Try to match "Suburb, STATE 1234" or "Suburb STATE 1234"
    m = re.match(
        r"^(?P<suburb>.+?)[,\s]+(?P<state>NSW|ACT|VIC|QLD|SA|WA|TAS|NT)\s*(?P<postcode>\d{4})\s*$",
        text,
        re.IGNORECASE,
    )
    if m:
        return Location(
            suburb=_clean(m.group("suburb")),
            state=m.group("state").upper(),
            postcode=m.group("postcode"),
        )

    # Try "STATE 1234" (no suburb) - must be exactly STATE + optional space + 4 digits
    m = re.match(
        r"^(?P<state>NSW|ACT|VIC|QLD|SA|WA|TAS|NT)\s*(?P<postcode>\d{4})\s*$",
        text,
        re.IGNORECASE,
    )
    if m:
        return Location(
            suburb="Unknown",
            state=m.group("state").upper(),
            postcode=m.group("postcode"),
        )

    # Try just a 4-digit postcode with possible suburb before it
    m = re.match(
        r"^(?P<suburb>.+?)[,\s]*(?P<postcode>\d{4})\s*$",
        text,
    )
    if m:
        suburb = _clean(m.group("suburb"))
        postcode = m.group("postcode")
        # Try to guess state from postcode range
        state = _guess_state_from_postcode(postcode)
        if state:
            return Location(suburb=suburb, state=state, postcode=postcode)

    # Just a suburb name with state abbreviation
    m = re.match(
        r"^(?P<suburb>.+?)[,\s]+(?P<state>NSW|ACT|VIC|QLD|SA|WA|TAS|NT)\s*$",
        text,
        re.IGNORECASE,
    )
    if m:
        suburb = _clean(m.group("suburb"))
        if suburb:
            return Location(
                suburb=suburb,
                state=m.group("state").upper(),
                postcode="2000",  # default fallback
            )

    return None


def _guess_state_from_postcode(postcode: str) -> Optional[str]:
    """Guess Australian state from 4-digit postcode."""
    pc = int(postcode)
    if 2000 <= pc <= 2599 or 2619 <= pc <= 2899 or 2921 <= pc <= 2999:
        return "NSW"
    elif 2600 <= pc <= 2618 or 2900 <= pc <= 2920:
        return "ACT"
    elif 3000 <= pc <= 3999:
        return "VIC"
    elif 4000 <= pc <= 4999:
        return "QLD"
    elif 5000 <= pc <= 5799:
        return "SA"
    elif 6000 <= pc <= 6799:
        return "WA"
    elif 7000 <= pc <= 7799:
        return "TAS"
    elif 8000 <= pc <= 8999:
        return "NT"
    return None


def parse_requirements(raw: Optional[str]) -> list[SkillRequirement]:
    """Parse a bullet/ numbered list of requirements into SkillRequirement objects."""
    if not raw or not raw.strip():
        return []

    # Split on bullet characters, numbers, or newlines FIRST (before cleaning)
    items = re.split(r"[\n•\-*]+|(?:\d+[\.\)]\s*)", raw)
    skills = []
    for item in items:
        item = _clean(item)
        if not item:
            continue
        # Remove common prefixes
        item = re.sub(
            r"^(experience in|knowledge of|ability to|proficiency in|skills? in)\s+",
            "",
            item,
            flags=re.IGNORECASE,
        )
        # Detect mandatory keywords
        mandatory = any(
            kw in item.lower()
            for kw in ("required", "must have", "essential", "mandatory", "prerequisite")
        )
        # Try to extract min years
        years_m = re.search(r"(\d+[+]?)\s*(?:\+?\s*years?|yrs?)", item, re.IGNORECASE)
        min_years = None
        if years_m:
            min_years = float(years_m.group(1).rstrip("+"))

        # Use the first meaningful segment as the skill name
        name = item.rstrip(".")
        # Clean up common patterns
        name = re.sub(r"\s*\(.*?\)\s*", " ", name).strip()
        # Remove trailing fluff
        name = re.sub(r"\s+-\s+.*$", "", name).strip()
        if name and len(name) <= 100:
            skills.append(SkillRequirement(name=name, mandatory=mandatory, min_years=min_years))

    return skills


def normalize_job(raw: RawJobInput, source_name: str = "unknown") -> NormalizedJob:
    """Convert a RawJobInput into a fully structured NormalizedJob."""
    now = datetime.now(tz=utc)

    location = parse_location(raw.location_raw) or Location(
        suburb="Unknown", state="NSW", postcode="2000"
    )
    salary = parse_salary(raw.salary_raw)
    employment_type = parse_employment_type(raw.employment_type_raw)
    requirements = parse_requirements(raw.description_raw)

    return NormalizedJob(
        id=uuid4(),
        title=raw.title,
        company_name=raw.company_name,
        location=location,
        employment_type=employment_type,
        salary=salary,
        description=raw.description_raw[:5000],
        requirements=requirements,
        benefits=[],
        source_url=raw.source_url,
        source_name=source_name,
        posted_at=now,
        expires_at=now + timedelta(days=30),
        is_active=True,
    )
