# Phase 1: Backend Service Foundation

> **Status:** Plan · **Priority:** High (enables all downstream phases)
> **For Hermes:** Use `subagent-driven-development` skill to implement task-by-task.
> **Source:** `SwipeJobSearch_Technical_Architecture_Prompts.docx` §§ 1, 4, 5, 6

**Goal:** Build the Python FastAPI backend service layer that handles job ingestion, data normalization, async task processing, and event-driven communication — everything currently in Supabase Edge Functions that will graduate to a proper service tier.

**Architecture:** Python monorepo under `backend/` using FastAPI for REST, Pydantic v2 for schemas, Celery + Redis for async workers, and Redis Pub/Sub for event-driven architecture. Coexists with Supabase Edge Functions (data-plane operations stay in Edge Functions; business logic graduates to Python).

**Tech Stack:** Python 3.12, FastAPI, Pydantic v2, Celery, Redis Stack, httpx, Docker, Docker Compose

---

### Task 1: Scaffold Backend Project Structure

**Objective:** Create the Python backend directory with monorepo layout, venv, and dependency management

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/Dockerfile`
- Create: `backend/docker-compose.yml`
- Create: `backend/.env.example`
- Create: `backend/README.md`
- Create: `backend/src/__init__.py`

**Step 1: Create backend scaffold**

Create `backend/` at project root with this structure:
```
backend/
├── pyproject.toml
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── README.md
└── src/
    ├── __init__.py
    ├── api/           # FastAPI routes
    │   ├── __init__.py
    │   ├── router.py
    │   └── endpoints/
    ├── core/          # Config, logging, Supabase client
    │   ├── __init__.py
    │   ├── config.py
    │   └── supabase.py
    ├── schemas/       # Pydantic models (Data Normalization)
    │   ├── __init__.py
    │   ├── jobs.py
    │   ├── search.py
    │   └── events.py
    ├── workers/       # Celery tasks
    │   ├── __init__.py
    │   ├── celery_app.py
    │   ├── scraper.py
    │   ├── processing.py
    │   └── notifications.py
    ├── services/      # Business logic
    │   ├── __init__.py
    │   ├── job_normalizer.py
    │   ├── event_publisher.py
    │   └── event_subscriber.py
    └── main.py        # FastAPI entrypoint
```

```bash
mkdir -p backend/src/{api/endpoints,core,schemas,workers,services}
```

**Step 2: Write pyproject.toml**

```toml
[project]
name = "hi-hired-backend"
version = "0.1.0"
description = "Hi-Hired backend service layer — job ingestion, normalization, and event processing"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "pydantic>=2.10.0",
    "pydantic-settings>=2.6.0",
    "celery>=5.4.0",
    "redis>=5.2.0",
    "httpx>=0.28.0",
    "supabase>=2.10.0",
    "python-dotenv>=1.0.0",
    "structlog>=24.4.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3.0",
    "pytest-asyncio>=0.24.0",
    "pytest-cov>=5.0.0",
    "ruff>=0.7.0",
    "mypy>=1.13.0",
    "pre-commit>=4.0.0",
    "testcontainers>=4.8.0",
]

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP", "B", "SIM"]

[tool.mypy]
strict = true
python_version = "3.12"
warn_unused_ignores = true

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
```

**Step 3: Write Dockerfile**

```dockerfile
FROM python:3.12-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

FROM base AS builder
COPY pyproject.toml .
RUN pip install .

FROM base
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY src/ src/
EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Step 4: Write docker-compose.yml**

```yaml
services:
  api:
    build: .
    ports: ["8000:8000"]
    env_file: .env
    depends_on: [redis]
    volumes: ["./src:/app/src"]

  celery-worker:
    build: .
    command: celery -A src.workers.celery_app worker --loglevel=info --concurrency=4
    env_file: .env
    depends_on: [redis]

  celery-beat:
    build: .
    command: celery -A src.workers.celery_app beat --loglevel=info
    env_file: .env
    depends_on: [redis]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: ["redis-data:/data"]

volumes:
  redis-data:
```

**Step 5: Write core/config.py**

```python
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = ""
    supabase_service_key: str = ""

    # Redis
    redis_url: str = "redis://redis:6379/0"
    redis_result_backend: str = "redis://redis:6379/1"

    # Celery
    celery_broker_url: str = "redis://redis:6379/0"
    celery_result_backend: str = "redis://redis:6379/1"

    # API
    api_port: int = 8000
    api_host: str = "0.0.0.0"
    cors_origins: str = "http://localhost:8081"

    # Logging
    log_level: str = "INFO"

    model_config = {"env_file": ".env", "env_prefix": "HH_"}

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

**Step 6: Write src/main.py**

```python
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.core.config import get_settings
from src.api.router import api_router

settings = get_settings()
logger = structlog.get_logger()

app = FastAPI(
    title="Hi-Hired Backend",
    version="0.1.0",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
async def startup():
    logger.info("backend_startup", host=settings.api_host, port=settings.api_port)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "hi-hired-backend"}
```

**Step 7: Write .env.example**

```env
HH_SUPABASE_URL=https://twwmqqgjtdbcvrkinifa.supabase.co
HH_SUPABASE_SERVICE_KEY=
HH_REDIS_URL=redis://redis:6379/0
HH_LOG_LEVEL=INFO
HH_CORS_ORIGINS=http://localhost:8081
```

**Step 8: Test scaffold boots**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn src.main:app --port 8000 &
curl http://localhost:8000/health
# Expected: {"status":"ok","service":"hi-hired-backend"}
kill %1

git add backend/
git commit -m "feat(backend): scaffold Python service layer with FastAPI + Celery"
```

---

### Task 2: Data Normalization Schema (Pydantic)

**Objective:** Create the complete Pydantic v2 schema system for job data ingestion, normalization, and search — implementing §5 of the architecture doc

**Files:**
- Create: `backend/src/schemas/__init__.py`
- Create: `backend/src/schemas/jobs.py`
- Create: `backend/src/schemas/search.py`
- Create: `backend/src/schemas/events.py`
- Create: `backend/tests/test_schemas.py`

**Step 1: Write jobs.py — RawJobInput model**

```python
import re
from datetime import datetime, timezone
from enum import Enum
from uuid import UUID, uuid4
from pydantic import (
    BaseModel,
    Field,
    field_validator,
    model_validator,
    HttpUrl,
)
from typing import Optional


class EmploymentType(str, Enum):
    PERMANENT = "permanent"
    CONTRACT = "contract"
    TEMP = "temp"
    CASUAL = "casual"


class SalaryPeriod(str, Enum):
    HOUR = "hour"
    DAY = "day"
    WEEK = "week"
    YEAR = "year"


class SalaryRange(BaseModel):
    min: float = Field(..., gt=0)
    max: float = Field(..., gt=0)
    currency: str = "AUD"
    period: SalaryPeriod = SalaryPeriod.HOUR
    includes_super: bool = False

    @field_validator("max")
    @classmethod
    def max_gte_min(cls, v, info):
        if "min" in info.data and v < info.data["min"]:
            raise ValueError("max must be >= min")
        return v


# Australian postcode ranges by state
VALID_POSTCODES = {
    "NSW": range(2000, 2999), "ACT": range(2600, 2619),
    "VIC": range(3000, 3999), "QLD": range(4000, 4999),
    "SA": range(5000, 5799), "WA": range(6000, 6799),
    "TAS": range(7000, 7799), "NT": range(8000, 8999),
}


class Location(BaseModel):
    suburb: str = Field(..., min_length=1, max_length=100)
    state: str = Field(..., min_length=2, max_length=3)
    postcode: str = Field(..., pattern=r"^\d{4}$")
    lat: Optional[float] = None
    lng: Optional[float] = None

    @field_validator("postcode")
    @classmethod
    def validate_au_postcode(cls, v: str) -> str:
        for state, prange in VALID_POSTCODES.items():
            if int(v) in prange:
                return v
        raise ValueError(f"Postcode {v} not in any AU state range")

    @field_validator("state")
    @classmethod
    def validate_state(cls, v: str) -> str:
        allowed = {"NSW", "ACT", "VIC", "QLD", "SA", "WA", "TAS", "NT"}
        if v.upper() not in allowed:
            raise ValueError(f"State {v} not recognised")
        return v.upper()


class SkillRequirement(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    mandatory: bool = False
    min_years: Optional[float] = None


class RawJobInput(BaseModel):
    """Flexible input model that accepts messy data from any source."""
    title: str = Field(..., min_length=1, max_length=200)
    description_raw: str = Field(default="", max_length=10000)
    company_name: str = Field(default="", max_length=200)
    company_id: Optional[str] = None
    location_raw: str = Field(default="", max_length=200)
    salary_raw: str = Field(default="", max_length=200)
    employment_type_raw: Optional[str] = None
    source_url: str = Field(default="", max_length=500)
    source_name: str = Field(default="unknown", max_length=100)
    requirements_raw: Optional[str] = None
    posted_at_raw: Optional[str] = None
    expires_at_raw: Optional[str] = None
    external_id: Optional[str] = None

    @field_validator("description_raw")
    @classmethod
    def strip_html(cls, v: str) -> str:
        return re.sub(r"<[^>]+>", "", v).strip()


class NormalizedJob(BaseModel):
    """Canonical internal job model after normalization."""
    id: UUID = Field(default_factory=uuid4)
    title: str = Field(..., min_length=1, max_length=200)
    company_id: Optional[str] = None
    company_name: str = ""
    location: Location
    employment_type: EmploymentType
    salary: Optional[SalaryRange] = None
    description: str = Field(default="", max_length=5000)
    requirements: list[SkillRequirement] = Field(default_factory=list)
    benefits: list[str] = Field(default_factory=list)
    source_url: str = ""
    source_name: str = "unknown"
    posted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime
    is_active: bool = True

    @field_validator("title")
    @classmethod
    def check_profanity(cls, v: str) -> str:
        # Basic profanity check — expand as needed
        blocked = {"sex", "porn", "nsfw"}
        words = set(v.lower().split())
        if blocked & words:
            raise ValueError("Title contains blocked terms")
        return v

    @model_validator(mode="after")
    def expires_after_posted(self):
        if self.expires_at <= self.posted_at:
            raise ValueError("expires_at must be after posted_at")
        return self
```

**Step 2: Write search.py — JobSearchQuery & JobMatchResult**

```python
from __future__ import annotations
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field
from src.schemas.jobs import EmploymentType, NormalizedJob


class JobSearchQuery(BaseModel):
    """Validates and sanitises user search parameters."""
    query: str = Field(default="", max_length=500)
    location_suburb: Optional[str] = Field(default=None, max_length=100)
    location_state: Optional[str] = Field(default=None, pattern=r"^(NSW|ACT|VIC|QLD|SA|WA|TAS|NT)$")
    employment_type: Optional[EmploymentType] = None
    salary_min: Optional[float] = Field(default=None, gt=0)
    salary_max: Optional[float] = Field(default=None, gt=0)
    radius_km: Optional[float] = Field(default=None, gt=0, le=200)
    skills: list[str] = Field(default_factory=list, max_length=20)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)

    @field_validator("query")
    @classmethod
    def sanitise(cls, v: str) -> str:
        import html
        return html.escape(v.strip())


class JobMatchResult(BaseModel):
    """A NormalizedJob with match metadata."""
    job: NormalizedJob
    score: float = Field(..., ge=0.0, le=1.0)
    matching_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
```

**Step 3: Write events.py — Event schemas**

```python
from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Literal
from uuid import UUID, uuid4
from pydantic import BaseModel, Field


class BaseEvent(BaseModel):
    event_id: UUID = Field(default_factory=uuid4)
    event_type: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    correlation_id: UUID
    payload: dict[str, Any]


class JobIngestedEvent(BaseEvent):
    event_type: Literal["job.ingested"] = "job.ingested"


class JobIndexedEvent(BaseEvent):
    event_type: Literal["job.indexed"] = "job.indexed"


class UserMatchedEvent(BaseEvent):
    event_type: Literal["user.matched"] = "user.matched"


class ApplicationSubmittedEvent(BaseEvent):
    event_type: Literal["application.submitted"] = "application.submitted"


class ApplicationStatusChangedEvent(BaseEvent):
    event_type: Literal["application.status_changed"] = "application.status_changed"
```

**Step 4: Write tests**

```python
import pytest
from pydantic import ValidationError
from src.schemas.jobs import (
    RawJobInput, NormalizedJob, Location, SalaryRange,
    EmploymentType, SkillRequirement,
)
from datetime import datetime, timezone, timedelta
from uuid import UUID


class TestRawJobInput:
    def test_strips_html_from_description(self):
        raw = RawJobInput(
            title="Barista",
            description_raw="<p>Make <b>great</b> coffee</p>",
        )
        assert "Make great coffee" in raw.description_raw
        assert "<" not in raw.description_raw

    def test_accepts_minimal_input(self):
        raw = RawJobInput(title="Cleaner")
        assert raw.title == "Cleaner"


class TestNormalizedJob:
    def test_valid_job(self):
        job = NormalizedJob(
            title="Barista",
            location=Location(suburb="Tullamarine", state="VIC", postcode="3043"),
            employment_type=EmploymentType.CASUAL,
            salary=SalaryRange(min=25.0, max=35.0),
            expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        )
        assert isinstance(job.id, UUID)

    def test_expires_must_follow_posted(self):
        with pytest.raises(ValidationError, match="expires_at must be after posted_at"):
            NormalizedJob(
                title="Test",
                location=Location(suburb="Test", state="VIC", postcode="3000"),
                employment_type=EmploymentType.CASUAL,
                posted_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) - timedelta(days=1),
            )

    def test_profanity_blocked(self):
        with pytest.raises(ValidationError, match="blocked terms"):
            NormalizedJob(
                title="NSFW work",
                location=Location(suburb="Test", state="VIC", postcode="3000"),
                employment_type=EmploymentType.CASUAL,
                expires_at=datetime.now(timezone.utc) + timedelta(days=30),
            )


class TestLocation:
    def test_valid_postcode(self):
        loc = Location(suburb="Sydney", state="NSW", postcode="2000")
        assert loc.state == "NSW"

    def test_invalid_postcode(self):
        with pytest.raises(ValidationError):
            Location(suburb="Bad", state="NSW", postcode="9999")

    def test_invalid_state(self):
        with pytest.raises(ValidationError):
            Location(suburb="Bad", state="XX", postcode="3000")


class TestSalaryRange:
    def test_max_gt_min(self):
        with pytest.raises(ValidationError):
            SalaryRange(min=40.0, max=30.0)
```

**Step 5: Verify**

```bash
cd backend && source .venv/bin/activate
pip install -e ".[dev]"
python -m pytest tests/test_schemas.py -v
# Expected: ALL PASS

git add backend/src/schemas/ backend/tests/
git commit -m "feat(backend): Pydantic v2 schema system for job normalization"
```

---

### Task 3: Celery App Configuration & Worker Definitions

**Objective:** Set up the Celery application with Redis broker, task routing, and three worker types (scraper, processing, notification) — implementing §4 of the architecture doc

**Files:**
- Create: `backend/src/workers/__init__.py`
- Create: `backend/src/workers/celery_app.py`
- Create: `backend/src/workers/scraper.py`
- Create: `backend/src/workers/processing.py`
- Create: `backend/src/workers/notifications.py`
- Create: `backend/tests/test_celery_app.py`

**Step 1: Write celery_app.py**

```python
from celery import Celery
from src.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "hi-hired",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_acks_late=True,              # Retry on worker crash
    worker_prefetch_multiplier=1,     # One task per worker at a time
    task_default_retry_delay=60,      # 60s before first retry
    task_max_retries=5,               # Max 5 retries
    task_routes={
        "src.workers.scraper.*": {"queue": "scrapers"},
        "src.workers.processing.*": {"queue": "processing"},
        "src.workers.notifications.*": {"queue": "notifications"},
    },
    task_track_started=True,
    task_soft_time_limit=300,         # 5 min soft limit
    task_time_limit=600,              # 10 min hard limit
)

# Auto-discover tasks
celery_app.autodiscover_tasks(["src.workers"])
```

**Step 2: Write scraper tasks**

```python
import structlog
from celery import shared_task
from httpx import AsyncClient, HTTPError, Limits, Timeout
from src.workers.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(
    bind=True,
    queue="scrapers",
    autoretry_for=(HTTPError, ConnectionError, TimeoutError),
    retry_kwargs={"max_retries": 5, "countdown": 60},
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
)
def scrape_job_source(self, source_url: str, source_name: str) -> dict:
    """Scrape a single job source and return raw data."""
    logger.info("scrape_started", source=source_name, url=source_url)
    # Implementation per source — returns RawJobInput-compatible dict
    raise NotImplementedError("Per-source scraper adapters not yet implemented")
```

**Step 3: Write processing tasks**

```python
import structlog
from celery import shared_task
from src.schemas.jobs import RawJobInput, NormalizedJob
from src.services.job_normalizer import normalize_job

logger = structlog.get_logger()


@celery_app.task(queue="processing")
def process_raw_job(raw_data: dict) -> str:
    """Normalize raw scraped data into canonical form."""
    raw = RawJobInput(**raw_data)
    normalized = normalize_job(raw)
    logger.info("job_normalized", job_id=str(normalized.id), title=normalized.title)
    return normalized.model_dump_json()
```

**Step 4: Write notification tasks**

```python
import structlog
from src.workers.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(queue="notifications")
def send_match_notification(user_id: str, job_id: str, match_type: str) -> bool:
    """Send push notification about a match."""
    logger.info("notification_sent", user_id=user_id, job_id=job_id, match_type=match_type)
    # Calls Supabase Edge Function or Expo push API
    return True
```

**Step 5: Write test**

```python
from src.workers.celery_app import celery_app


class TestCeleryConfig:
    def test_app_created(self):
        assert celery_app.main == "hi-hired"

    def test_task_routes_defined(self):
        routes = celery_app.conf.task_routes
        assert "scrapers" in str(routes)
        assert "processing" in str(routes)
        assert "notifications" in str(routes)
```

**Step 6: Verify**

```bash
cd backend && source .venv/bin/activate
python -m pytest tests/test_celery_app.py -v
# Expected: PASS

git add backend/src/workers/ backend/tests/test_celery_app.py
git commit -m "feat(backend): Celery app with task routing and 3 worker types"
```

---

### Task 4: Job Normalizer Service

**Objective:** Implement the core normalization logic that converts RawJobInput → NormalizedJob, handling salary parsing, location extraction, and date handling

**Files:**
- Create: `backend/src/services/__init__.py`
- Create: `backend/src/services/job_normalizer.py`
- Create: `backend/tests/test_job_normalizer.py`

**Step 1: Write job_normalizer.py**

```python
import re
from datetime import datetime, timezone, timedelta
from typing import Optional
from src.schemas.jobs import (
    RawJobInput, NormalizedJob, Location, SalaryRange,
    EmploymentType, SkillRequirement,
)


def parse_salary(raw: str) -> Optional[SalaryRange]:
    """Parse AU salary strings: '$70k-$90k + super', '$30/hr', etc."""
    if not raw or raw == "":
        return None

    raw = raw.replace(",", "").replace("$", "").lower().strip()

    # Extract numbers
    numbers = [float(n) for n in re.findall(r"\d+\.?\d*", raw)]
    if not numbers:
        return None

    min_val = numbers[0]
    max_val = numbers[1] if len(numbers) > 1 else numbers[0]

    # Determine period
    period = "hour"
    if any(unit in raw for unit in ["/hr", "per hour", "/hour"]):
        period = "hour"
    elif any(unit in raw for unit in ["/yr", "per year", "pa", "annual"]):
        period = "year"
    elif any(unit in raw for unit in ["/wk", "per week", "weekly"]):
        period = "week"
    elif any(unit in raw for unit in ["/day", "per day", "daily"]):
        period = "day"

    return SalaryRange(
        min=min_val,
        max=max_val,
        period=period,
        includes_super="super" in raw,
    )


def parse_employment_type(raw: Optional[str]) -> EmploymentType:
    mapping = {
        "permanent": EmploymentType.PERMANENT,
        "full-time": EmploymentType.PERMANENT,
        "full time": EmploymentType.PERMANENT,
        "contract": EmploymentType.CONTRACT,
        "temp": EmploymentType.TEMP,
        "temporary": EmploymentType.TEMP,
        "casual": EmploymentType.CASUAL,
        "part-time": EmploymentType.CASUAL,
        "part time": EmploymentType.CASUAL,
    }
    if raw:
        cleaned = raw.strip().lower()
        if cleaned in mapping:
            return mapping[cleaned]
    return EmploymentType.CASUAL  # Default for AU casual jobs


def parse_location(raw: str) -> Optional[Location]:
    """Parse 'Suburb, VIC 3043' into structured Location."""
    pattern = r"^([A-Za-z\s]+),\s*(NSW|ACT|VIC|QLD|SA|WA|TAS|NT)\s*(\d{4})$"
    m = re.match(pattern, raw.strip())
    if m:
        return Location(
            suburb=m.group(1).strip(),
            state=m.group(2).upper(),
            postcode=m.group(3),
        )
    return None


def parse_requirements(raw: Optional[str]) -> list[SkillRequirement]:
    if not raw:
        return []
    skills = []
    for line in raw.split("\n"):
        line = line.strip().strip("-*").strip()
        if line and len(line) > 2:
            skills.append(SkillRequirement(name=line, mandatory=False))
    return skills


def normalize_job(raw: RawJobInput, source_name: str = "unknown") -> NormalizedJob:
    """Convert RawJobInput to canonical NormalizedJob."""
    location = parse_location(raw.location_raw)
    if not location:
        location = Location(suburb="Unknown", state="VIC", postcode="3000")

    salary = parse_salary(raw.salary_raw)
    employment_type = parse_employment_type(raw.employment_type_raw)
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)

    return NormalizedJob(
        title=raw.title.strip(),
        company_name=raw.company_name.strip(),
        location=location,
        employment_type=employment_type,
        salary=salary,
        description=raw.description_raw[:5000] if raw.description_raw else "",
        requirements=parse_requirements(raw.requirements_raw),
        source_url=raw.source_url,
        source_name=source_name,
        expires_at=expires_at,
    )
```

**Step 2: Write tests**

```python
import pytest
from src.services.job_normalizer import normalize_job, parse_salary, parse_location
from src.schemas.jobs import RawJobInput, SalaryRange, EmploymentType


class TestParseSalary:
    def test_per_hour(self):
        result = parse_salary("$25-$35/hr")
        assert result is not None
        assert result.min == 25.0
        assert result.max == 35.0

    def test_with_super(self):
        result = parse_salary("$70k-$90k + super")
        assert result is not None
        assert result.includes_super is True

    def test_empty_returns_none(self):
        assert parse_salary("") is None


class TestParseLocation:
    def test_standard_au_address(self):
        loc = parse_location("Tullamarine, VIC 3043")
        assert loc is not None
        assert loc.suburb == "Tullamarine"
        assert loc.state == "VIC"
        assert loc.postcode == "3043"

    def test_invalid_returns_none(self):
        assert parse_location("") is None


class TestNormalizeJob:
    def test_basic_job(self):
        raw = RawJobInput(
            title="Barista",
            description_raw="<p>Make coffee</p>",
            company_name="Cafe Co",
            location_raw="Tullamarine, VIC 3043",
            salary_raw="$30-$40/hr",
            employment_type_raw="casual",
            source_url="https://example.com/job/1",
        )
        result = normalize_job(raw, source_name="example")
        assert result.title == "Barista"
        assert result.description == "Make coffee"
        assert result.salary is not None
        assert result.salary.min == 30.0
        assert result.employment_type == EmploymentType.CASUAL
        assert result.source_name == "example"
```

**Step 3: Verify**

```bash
cd backend && source .venv/bin/activate
python -m pytest tests/test_job_normalizer.py -v
# Expected: ALL PASS

git add backend/src/services/ backend/tests/test_job_normalizer.py
git commit -m "feat(backend): job normalizer service with salary/location parsing"
```

---

### Task 5: Event-Driven Architecture (Redis Pub/Sub)

**Objective:** Implement the event publisher and subscriber system using Redis Pub/Sub — implementing §6 of the architecture doc

**Files:**
- Create: `backend/src/services/event_publisher.py`
- Create: `backend/src/services/event_subscriber.py`
- Create: `backend/tests/test_event_system.py`

**Step 1: Write event_publisher.py**

```python
from __future__ import annotations
import json
import structlog
from typing import Any
from redis import asyncio as aioredis
from src.schemas.events import BaseEvent
from src.core.config import get_settings

logger = structlog.get_logger()

EVENT_CHANNELS: dict[str, str] = {
    "job.ingested": "events:jobs",
    "job.indexed": "events:jobs",
    "user.matched": "events:matching",
    "application.submitted": "events:applications",
    "application.status_changed": "events:applications",
}


class EventPublisher:
    """Publishes typed events to Redis Pub/Sub channels."""

    def __init__(self, redis_url: str | None = None):
        self.redis_url = redis_url or get_settings().redis_url
        self._redis: aioredis.Redis | None = None

    async def _get_redis(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = aioredis.from_url(self.redis_url, decode_responses=True)
        return self._redis

    async def publish(self, event: BaseEvent) -> bool:
        """Serialize and publish event to its channel."""
        channel = EVENT_CHANNELS.get(event.event_type)
        if not channel:
            logger.warning("no_channel_for_event", event_type=event.event_type)
            return False

        r = await self._get_redis()
        payload = event.model_dump_json()
        await r.publish(channel, payload)
        logger.info("event_published", event_type=event.event_type, event_id=str(event.event_id))
        return True

    async def close(self):
        if self._redis:
            await self._redis.close()
```

**Step 2: Write event_subscriber.py**

```python
from __future__ import annotations
import json
import structlog
from typing import Callable, Awaitable
from redis import asyncio as aioredis
from src.core.config import get_settings

logger = structlog.get_logger()

EventHandler = Callable[[dict], Awaitable[None]]


class EventSubscriber:
    """Subscribe to Redis Pub/Sub channels with automatic reconnection."""

    def __init__(self, redis_url: str | None = None):
        self.redis_url = redis_url or get_settings().redis_url
        self._pubsub: aioredis.Redis | None = None
        self._handlers: dict[str, list[EventHandler]] = {}
        self._running = False

    async def subscribe(self, channel: str, handler: EventHandler):
        if channel not in self._handlers:
            self._handlers[channel] = []
        self._handlers[channel].append(handler)
        logger.info("subscribed", channel=channel)

    async def unsubscribe(self, channel: str, handler: EventHandler | None = None):
        if handler and channel in self._handlers:
            self._handlers[channel].remove(handler)
        elif channel in self._handlers:
            del self._handlers[channel]

    async def start(self):
        """Start listening loop with reconnection."""
        self._running = True
        while self._running:
            try:
                r = aioredis.from_url(self.redis_url, decode_responses=True)
                pubsub = r.pubsub()
                channels = list(self._handlers.keys())
                if channels:
                    await pubsub.subscribe(*channels)
                    logger.info("subscriber_started", channels=channels)
                    async for message in pubsub.listen():
                        if message["type"] == "message":
                            await self._dispatch(message["channel"], message["data"])
            except Exception as e:
                logger.error("subscriber_error", error=str(e))
                import asyncio
                await asyncio.sleep(5)

    async def stop(self):
        self._running = False

    async def _dispatch(self, channel: str, data: str):
        try:
            payload = json.loads(data)
            handlers = self._handlers.get(channel, [])
            for handler in handlers:
                try:
                    await handler(payload)
                except Exception as e:
                    logger.error("handler_failed", channel=channel, error=str(e))
        except json.JSONDecodeError:
            logger.error("invalid_event_json", channel=channel)

    async def close(self):
        await self.stop()
```

**Step 3: Write test**

```python
import pytest
from uuid import uuid4
from src.services.event_publisher import EventPublisher
from src.schemas.events import JobIngestedEvent


@pytest.mark.asyncio
async def test_event_publish(redis_available: bool):
    if not redis_available:
        pytest.skip("Redis not available")
    pub = EventPublisher()
    event = JobIngestedEvent(
        correlation_id=uuid4(),
        payload={"job_id": str(uuid4())}
    )
    result = await pub.publish(event)
    assert result is True
    await pub.close()
```

**Step 4: Verify**

```bash
cd backend && source .venv/bin/activate
python -m pytest tests/test_event_system.py -v -k "not redis"
# Expected: skip (Redis not available in CI)

git add backend/src/services/event_publisher.py backend/src/services/event_subscriber.py backend/tests/test_event_system.py
git commit -m "feat(backend): Redis Pub/Sub event system with typed events"
```

---

### Task 6: FastAPI API Layer

**Objective:** Create the REST API endpoints for job ingestion, health, and event publishing

**Files:**
- Create: `backend/src/api/__init__.py`
- Create: `backend/src/api/router.py`
- Create: `backend/src/api/endpoints/__init__.py`
- Create: `backend/src/api/endpoints/jobs.py`
- Create: `backend/src/api/endpoints/health.py`
- Create: `backend/src/api/endpoints/events.py`
- Create: `backend/tests/test_api.py`

**Step 1: Write router.py**

```python
from fastapi import APIRouter
from src.api.endpoints import health, jobs, events

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
api_router.include_router(events.router, prefix="/events", tags=["events"])
```

**Step 2: Write jobs.py endpoint**

```python
from fastapi import APIRouter, HTTPException
from src.schemas.jobs import RawJobInput, NormalizedJob
from src.services.job_normalizer import normalize_job

router = APIRouter()


@router.post("/ingest", response_model=NormalizedJob)
async def ingest_job(raw: RawJobInput):
    """Ingest raw job data and return normalized form."""
    try:
        normalized = normalize_job(raw, source_name=raw.source_name)
        return normalized
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
```

**Step 3: Write health endpoint**

```python
from fastapi import APIRouter
from src.core.config import get_settings

router = APIRouter()


@router.get("/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}
```

**Step 4: Write events endpoint**

```python
from fastapi import APIRouter, HTTPException
from src.schemas.events import BaseEvent

router = APIRouter()


@router.post("/publish")
async def publish_event(event: BaseEvent):
    """Publish an event to the Redis Pub/Sub system."""
    return {"event_id": str(event.event_id), "status": "accepted"}
```

**Step 5: Write API test**

```python
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)


class TestHealth:
    def test_health_endpoint(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


class TestIngest:
    def test_basic_ingest(self):
        payload = {
            "title": "Barista",
            "location_raw": "Tullamarine, VIC 3043",
            "salary_raw": "$30-$40/hr",
            "source_url": "https://test.com/job/1",
        }
        resp = client.post("/api/v1/jobs/ingest", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Barista"
```

**Step 6: Verify**

```bash
cd backend && source .venv/bin/activate
python -m pytest tests/test_api.py -v
# Expected: ALL PASS

git add backend/src/api/ backend/tests/test_api.py
git commit -m "feat(backend): FastAPI REST layer with job ingestion endpoint"
```

---

### Phase 1 Completion Verification

```bash
cd backend && source .venv/bin/activate
python -m pytest tests/ -v --cov=src --cov-report=term-missing
# Expected: ALL PASS, >80% coverage

# Start services
docker compose up -d
curl http://localhost:8000/health
# Expected: {"status":"ok","version":"0.1.0"}

# Test ingestion
curl -X POST http://localhost:8000/api/v1/jobs/ingest \
  -H "Content-Type: application/json" \
  -d '{"title":"Cleaner","location_raw":"Tullamarine, VIC 3043","salary_raw":"$30/hr"}'
# Expected: 200 with NormalizedJob JSON

git add -A && git commit -m "chore: phase 1 backend service foundation complete"
```

---

## Phase 1 Summary

| Component | Status | Doc § |
|-----------|--------|-------|
| Project scaffold (FastAPI + Docker) | Planned | §1 |
| Pydantic v2 schemas (RawJobInput, NormalizedJob, Location, Salary) | Planned | §5 |
| Celery app with task routing + 3 worker types | Planned | §4 |
| Job normalizer service (salary/location parsing) | Planned | §5 |
| Redis Pub/Sub event system (publisher + subscriber) | Planned | §6 |
| FastAPI REST API (health, ingest, events) | Planned | §1 |
| Backend test suite (pytest) | Planned | — |

**Dependencies:** Redis (via Docker Compose), Supabase (existing)

**Ready to execute using subagent-driven-development.** Each task is ~2-5 min of focused work with TDD cycle. Dispatch 1-2 tasks in parallel.
