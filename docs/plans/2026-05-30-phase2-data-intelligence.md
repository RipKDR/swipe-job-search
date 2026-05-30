# Phase 2: Data Intelligence Layer

> **Status:** Plan · **Priority:** High (unlocks semantic search and match scoring)
> **For Hermes:** Use `subagent-driven-development` skill to implement task-by-task.
> **Source:** `SwipeJobSearch_Technical_Architecture_Prompts.docx` §§ 7, 8, 9, 12, 14

**Goal:** Build the semantic search, ML-based match scoring, multi-level caching, and advanced scraping pipeline. This phase turns Hi-Hired from a basic SQL swipe app into an intelligent matching platform.

**Architecture:** Qdrant vector DB for semantic job search, MLflow for model lifecycle, Redis for distributed caching, httpx async for scraping. Runs as services alongside the Phase 1 backend.

**Tech Stack:** Python 3.12, Qdrant, openai (embeddings), XGBoost/LightGBM, MLflow, Optuna, httpx, Redis, asyncio

---

### Task 1: Vector Database Integration (Qdrant)

**Objective:** Integrate Qdrant for semantic job matching using OpenAI embeddings — implementing §7 of the architecture doc

**Files:**
- Create: `backend/src/services/vector_store.py`
- Create: `backend/tests/test_vector_store.py`
- Update: `backend/docker-compose.yml` (add Qdrant service)
- Update: `backend/pyproject.toml` (add qdrant-client, openai)

**Step 1: Add dependencies and Qdrant service**

Add to `backend/pyproject.toml`:
```toml
dependencies = [
    ...existing...,
    "qdrant-client>=1.12.0",
    "openai>=1.50.0",
]
```

Add to `backend/docker-compose.yml`:
```yaml
services:
  ...existing...
  qdrant:
    image: qdrant/qdrant:latest
    ports: ["6333:6333", "6334:6334"]
    volumes: ["qdrant-data:/qdrant/storage"]

volumes:
  ...existing...
  qdrant-data:
```

**Step 2: Write vector_store.py**

```python
from __future__ import annotations
import structlog
from typing import Any
from uuid import UUID
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels
from src.core.config import get_settings
from src.schemas.jobs import NormalizedJob

logger = structlog.get_logger()

COLLECTION_NAME = "hi_hired_jobs"
VECTOR_SIZE = 1536  # text-embedding-3-small


class VectorStore:
    """Qdrant vector store for semantic job search."""

    def __init__(self, location: str | None = None, api_key: str | None = None):
        settings = get_settings()
        self.client = QdrantClient(
            location=location or settings.qdrant_url or ":memory:",
            api_key=api_key or settings.qdrant_api_key,
        )
        self._ensure_collection()

    def _ensure_collection(self):
        collections = self.client.get_collections().collections
        exists = any(c.name == COLLECTION_NAME for c in collections)
        if not exists:
            self.client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=qmodels.VectorParams(
                    size=VECTOR_SIZE,
                    distance=qmodels.Distance.COSINE,
                ),
                optimizers_config=qmodels.OptimizersConfigDiff(
                    indexing_threshold=100,
                ),
            )
            # Create payload indexes for filtered search
            self.client.create_payload_index(
                COLLECTION_NAME, qmodels.PayloadSchemaType.KEYWORD, "employment_type"
            )
            self.client.create_payload_index(
                COLLECTION_NAME, qmodels.PayloadSchemaType.KEYWORD, "location_state"
            )
            self.client.create_payload_index(
                COLLECTION_NAME, qmodels.PayloadSchemaType.FLOAT, "salary_min"
            )
            self.client.create_payload_index(
                COLLECTION_NAME, qmodels.PayloadSchemaType.FLOAT, "salary_max"
            )
            logger.info("qdrant_collection_created", collection=COLLECTION_NAME)
        else:
            logger.info("qdrant_collection_exists", collection=COLLECTION_NAME)

    def _job_to_payload(self, job: NormalizedJob) -> dict:
        return {
            "job_id": str(job.id),
            "title": job.title,
            "company_name": job.company_name,
            "description": job.description[:2000],  # Truncate for payload size
            "location_suburb": job.location.suburb,
            "location_state": job.location.state,
            "employment_type": job.employment_type.value,
            "salary_min": job.salary.min if job.salary else None,
            "salary_max": job.salary.max if job.salary else None,
            "source_url": job.source_url,
            "source_name": job.source_name,
            "posted_at": job.posted_at.isoformat(),
            "expires_at": job.expires_at.isoformat(),
            "is_active": job.is_active,
        }

    def index_job(self, job: NormalizedJob, embedding: list[float]) -> bool:
        """Index a single job with its embedding."""
        self.client.upsert(
            collection_name=COLLECTION_NAME,
            points=[qmodels.PointStruct(
                id=str(job.id),
                vector=embedding,
                payload=self._job_to_payload(job),
            )],
        )
        return True

    def search_similar(
        self,
        query_embedding: list[float],
        filters: dict[str, Any] | None = None,
        limit: int = 20,
    ) -> list[dict]:
        """Search for similar jobs with optional filters."""
        qfilter = None
        if filters:
            conditions = []
            if "employment_type" in filters:
                conditions.append(
                    qmodels.FieldCondition(
                        key="employment_type",
                        match=qmodels.MatchValue(value=filters["employment_type"]),
                    )
                )
            if "location_state" in filters:
                conditions.append(
                    qmodels.FieldCondition(
                        key="location_state",
                        match=qmodels.MatchValue(value=filters["location_state"]),
                    )
                )
            if "salary_min" in filters:
                conditions.append(
                    qmodels.FieldCondition(
                        key="salary_min",
                        range=qmodels.Range(gte=filters["salary_min"]),
                    )
                )
            if conditions:
                qfilter = qmodels.Filter(must=conditions)

        results = self.client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_embedding,
            limit=limit,
            query_filter=qfilter,
            with_payload=True,
        )

        return [
            {
                "score": r.score,
                "payload": r.payload,
            }
            for r in results
        ]

    def delete_job(self, job_id: UUID) -> bool:
        self.client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=qmodels.PointIdsList(
                points=[str(job_id)]
            ),
        )
        return True

    def health(self) -> dict:
        collections = self.client.get_collections().collections
        return {
            "status": "ok",
            "collections": [c.name for c in collections],
            "collection": COLLECTION_NAME,
        }
```

**Step 3: Write tests**

```python
import pytest
from src.services.vector_store import VectorStore


class TestVectorStore:
    def test_in_memory_creation(self):
        vs = VectorStore(location=":memory:")
        health = vs.health()
        assert health["status"] == "ok"
        assert COLLECTION_NAME in health["collections"]

    def test_health(self):
        vs = VectorStore(location=":memory:")
        assert vs.health()["status"] == "ok"
```

**Step 4: Verify**

```bash
cd backend && source .venv/bin/activate
pip install -e ".[dev]" qdrant-client openai
python -m pytest tests/test_vector_store.py -v
# Expected: ALL PASS

git add backend/src/services/vector_store.py backend/tests/test_vector_store.py
git commit -m "feat(backend): Qdrant vector store for semantic job search"
```

---

### Task 2: Multi-Level Caching Strategy

**Objective:** Implement a CacheManager with 3 levels (in-memory, Redis, materialized views) — implementing §8 of the architecture doc

**Files:**
- Create: `backend/src/services/cache_manager.py`
- Create: `backend/tests/test_cache_manager.py`

**Step 1: Write cache_manager.py**

```python
from __future__ import annotations
import structlog
import time
import hashlib
import json
from typing import Any, Callable, Awaitable, TypeVar
from functools import wraps
from redis import asyncio as aioredis
from src.core.config import get_settings

logger = structlog.get_logger()
T = TypeVar("T")

# Level 1: In-memory cache (process-local, 30s TTL)
_MEMORY_CACHE: dict[str, tuple[Any, float]] = {}
_DEFAULT_MEMORY_TTL = 30  # seconds


class CacheManager:
    """Multi-level cache with stampede protection."""

    def __init__(self, redis_url: str | None = None):
        settings = get_settings()
        self.redis_url = redis_url or settings.redis_url
        self._redis: aioredis.Redis | None = None

    async def _get_redis(self) -> aioredis.Redis:
        if self._redis is None or not self._redis.is_connected():
            self._redis = aioredis.from_url(self.redis_url, decode_responses=True)
        return self._redis

    async def memory_get(self, key: str) -> Any | None:
        """Level 1: Check in-memory cache."""
        now = time.time()
        if key in _MEMORY_CACHE:
            value, expires = _MEMORY_CACHE[key]
            if now < expires:
                return value
            del _MEMORY_CACHE[key]
        return None

    def memory_set(self, key: str, value: Any, ttl: int = _DEFAULT_MEMORY_TTL):
        """Level 1: Set in-memory cache."""
        _MEMORY_CACHE[key] = (value, time.time() + ttl)

    def memory_invalidate(self, key: str):
        """Level 1: Invalidate in-memory cache entry."""
        _MEMORY_CACHE.pop(key, None)

    async def redis_get(self, key: str) -> Any | None:
        """Level 2: Check Redis cache."""
        r = await self._get_redis()
        val = await r.get(key)
        if val:
            try:
                return json.loads(val)
            except (json.JSONDecodeError, TypeError):
                return None
        return None

    async def redis_set(self, key: str, value: Any, ttl: int = 300):
        """Level 2: Set Redis cache with TTL."""
        r = await self._get_redis()
        await r.setex(key, ttl, json.dumps(value))

    async def redis_invalidate(self, key: str):
        """Level 2: Invalidate Redis cache entry."""
        r = await self._get_redis()
        await r.delete(key)

    async def get_or_compute(
        self,
        key: str,
        compute_fn: Callable[[], Awaitable[T]],
        ttl: int = 300,
        level: str = "redis",
    ) -> T:
        """Generic get-or-compute with cache stampede protection (Redis SET NX pattern).

        Args:
            key: Cache key
            compute_fn: Async function to compute value on cache miss
            ttl: Cache TTL in seconds
            level: 'memory', 'redis', or 'all' (memory first, then redis)
        """
        if level in ("memory", "all"):
            cached = await self.memory_get(key)
            if cached is not None:
                return cached

        if level in ("redis", "all"):
            cached = await self.redis_get(key)
            if cached is not None:
                if level == "all":
                    self.memory_set(key, cached, min(ttl, _DEFAULT_MEMORY_TTL))
                return cached

        # Stampede protection: try to claim the compute lock
        r = await self._get_redis()
        lock_key = f"lock:{key}"
        locked = await r.setnx(lock_key, "1")
        if locked:
            await r.expire(lock_key, 10)  # Lock expires after 10s
            try:
                value = await compute_fn()
                if level in ("redis", "all"):
                    await self.redis_set(key, value, ttl)
                if level == "all":
                    self.memory_set(key, value, min(ttl, _DEFAULT_MEMORY_TTL))
                return value
            finally:
                await r.delete(lock_key)
        else:
            # Another process is computing — wait briefly and retry
            import asyncio
            await asyncio.sleep(0.5)
            return await self.get_or_compute(key, compute_fn, ttl, level)

    async def invalidate(self, key: str):
        """Invalidate across all levels."""
        self.memory_invalidate(key)
        await self.redis_invalidate(key)

    async def close(self):
        if self._redis:
            await self._redis.close()
```

**Step 2: Write tests**

```python
import pytest
from src.services.cache_manager import CacheManager


@pytest.mark.asyncio
class TestCacheManager:
    async def test_memory_cache_hit_miss(self):
        cm = CacheManager(redis_url="redis://localhost:6379")
        # Miss
        val = await cm.memory_get("test_key")
        assert val is None

        # Set and hit
        cm.memory_set("test_key", {"hello": "world"}, ttl=30)
        val = await cm.memory_get("test_key")
        assert val == {"hello": "world"}

    async def test_get_or_compute_calls_fn_on_miss(self):
        cm = CacheManager(redis_url="redis://localhost:6379")
        called = False

        async def compute():
            nonlocal called
            called = True
            return "computed_value"

        result = await cm.get_or_compute(
            f"test_compute_{id(self)}",
            compute,
            ttl=10,
            level="memory",
        )
        assert called
        assert result == "computed_value"

    async def test_get_or_compute_uses_cache(self):
        cm = CacheManager(redis_url="redis://localhost:6379")
        called = 0

        async def compute():
            nonlocal called
            called += 1
            return f"value_{called}"

        key = f"test_cache_{id(self)}"
        result1 = await cm.get_or_compute(key, compute, ttl=30, level="memory")
        result2 = await cm.get_or_compute(key, compute, ttl=30, level="memory")
        assert result1 == result2
        assert called == 1  # compute_fn only called once
```

**Step 3: Verify**

```bash
cd backend && source .venv/bin/activate
python -m pytest tests/test_cache_manager.py -v -k "memory"
# Expected: 3 PASS

git add backend/src/services/cache_manager.py backend/tests/test_cache_manager.py
git commit -m "feat(backend): multi-level cache manager with stampede protection"
```

---

### Task 3: Advanced Scraper with Anti-Bot Evasion

**Objective:** Build a resilient scraping pipeline with proxy rotation, fingerprint randomization, and exponential backoff — implementing §9 of the architecture doc

**Files:**
- Create: `backend/src/services/scraping_session.py`
- Create: `backend/src/services/scraper_health.py`
- Create: `backend/tests/test_scraping.py`

**Step 1: Write scraping_session.py**

```python
from __future__ import annotations
import random
import structlog
from typing import Optional
import httpx
from httpx import AsyncClient, Limits, Timeout, HTTPError, ConnectError

logger = structlog.get_logger()

# 50 realistic browser user-agent pool (abbreviated — expand in production)
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
    # ... expand to 50 in production
]


class ProxyPool:
    """Rotating proxy pool with health tracking."""

    def __init__(self, proxies: list[dict] | None = None):
        # Each proxy: {"url": "http://user:pass@host:port", "healthy": True}
        self.proxies = proxies or []
        self._health: dict[str, bool] = {}

    def get_proxy(self) -> Optional[str]:
        healthy = [p["url"] for p in self.proxies if self._health.get(p["url"], True)]
        if not healthy:
            return None
        return random.choice(healthy)

    def mark_unhealthy(self, url: str):
        self._health[url] = False
        logger.warning("proxy_marked_unhealthy", proxy=url)

    def mark_healthy(self, url: str):
        self._health[url] = True


class ScrapingSession:
    """HTTP session with anti-bot evasion techniques."""

    def __init__(self, proxy_pool: ProxyPool | None = None):
        self.proxy_pool = proxy_pool or ProxyPool()
        self._client: AsyncClient | None = None

    async def _get_client(self) -> AsyncClient:
        if self._client is None:
            limits = Limits(max_keepalive_connections=5, max_connections=10)
            timeout = Timeout(30.0, connect=15.0, read=20.0)
            self._client = AsyncClient(limits=limits, timeout=timeout, follow_redirects=True)
        return self._client

    def _random_headers(self) -> dict[str, str]:
        """Randomise headers per request to avoid fingerprinting."""
        accept_langs = [
            "en-AU,en;q=0.9,en-GB;q=0.8",
            "en-US,en;q=0.9",
            "en,en-AU;q=0.9,ja;q=0.8",
        ]
        return {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": random.choice(accept_langs),
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }

    async def fetch(self, url: str, retries: int = 5) -> tuple[int, str]:
        """Fetch URL with exponential backoff, jitter, and proxy rotation."""
        client = await self._get_client()
        last_error: Exception | None = None

        for attempt in range(retries):
            try:
                headers = self._random_headers()
                proxy = self.proxy_pool.get_proxy()

                # Human-like delay between requests
                await self._human_delay(attempt)

                response = await client.get(
                    url,
                    headers=headers,
                    proxy=proxy,
                )

                if response.status_code in (429, 503, 504):
                    retry_after = int(response.headers.get("Retry-After", 60))
                    logger.warning(
                        "rate_limited",
                        status=response.status_code,
                        retry_after=retry_after,
                        attempt=attempt + 1,
                    )
                    if proxy:
                        self.proxy_pool.mark_unhealthy(proxy)
                    await self._exponential_backoff(attempt, retry_after)
                    continue

                response.raise_for_status()
                return response.status_code, response.text

            except (ConnectError, HTTPError) as e:
                last_error = e
                logger.warning("fetch_retry", url=url, attempt=attempt + 1, error=str(e))
                if attempt == retries - 1:
                    break
                await self._exponential_backoff(attempt)

        raise RuntimeError(f"Failed to fetch {url} after {retries} retries: {last_error}")

    async def _human_delay(self, attempt: int):
        """Random delay to simulate human browsing."""
        import asyncio
        base = random.uniform(2.0, 5.0)
        if attempt > 0:
            base += random.uniform(10.0, 20.0)  # Occasional longer pause
        await asyncio.sleep(base)

    async def _exponential_backoff(self, attempt: int, base_delay: int = 1):
        """Exponential backoff with jitter."""
        import asyncio
        delay = min(base_delay * (2 ** attempt), 60)
        jitter = random.uniform(0, delay * 0.5)
        await asyncio.sleep(delay + jitter)

    async def close(self):
        if self._client:
            await self._client.aclose()
```

**Step 2: Write scraper_health.py**

```python
from __future__ import annotations
import structlog
import time
from collections import defaultdict
from typing import Optional

logger = structlog.get_logger()


class ScraperHealthMonitor:
    """Tracks success rates per source and auto-quarantines failing scrapers."""

    def __init__(self, threshold: float = 0.9, window_minutes: int = 60, max_consecutive_failures: int = 5):
        self.threshold = threshold
        self.window_minutes = window_minutes
        self.max_consecutive_failures = max_consecutive_failures
        self._attempts: dict[str, list[tuple[float, bool]]] = defaultdict(list)
        self._consecutive_failures: dict[str, int] = defaultdict(int)
        self._quarantined: dict[str, float] = {}

    def record_attempt(self, source: str, success: bool):
        now = time.time()
        self._attempts[source].append((now, success))
        if success:
            self._consecutive_failures[source] = 0
        else:
            self._consecutive_failures[source] += 1
            if self._consecutive_failures[source] >= self.max_consecutive_failures:
                self._quarantine(source)

        # Prune old entries
        cutoff = now - (self.window_minutes * 60)
        self._attempts[source] = [
            (t, s) for t, s in self._attempts[source] if t > cutoff
        ]

    def success_rate(self, source: str) -> float:
        attempts = self._attempts.get(source, [])
        if not attempts:
            return 1.0
        successes = sum(1 for _, s in attempts if s)
        return successes / len(attempts)

    def _quarantine(self, source: str):
        if source not in self._quarantined:
            self._quarantined[source] = time.time()
            logger.warning("source_quarantined", source=source, reason="5 consecutive failures")

    def is_quarantined(self, source: str) -> bool:
        return source in self._quarantined

    def unquarantine(self, source: str):
        self._quarantined.pop(source, None)
        self._consecutive_failures[source] = 0
        logger.info("source_unquarantined", source=source)

    def get_health_summary(self) -> dict:
        return {
            source: {
                "success_rate": self.success_rate(source),
                "quarantined": self.is_quarantined(source),
                "total_attempts": len(attempts),
            }
            for source, attempts in self._attempts.items()
        }
```

**Step 3: Write tests**

```python
from src.services.scraper_health import ScraperHealthMonitor


class TestScraperHealth:
    def test_initial_health_is_good(self):
        mon = ScraperHealthMonitor()
        assert mon.success_rate("seek") == 1.0

    def test_records_success(self):
        mon = ScraperHealthMonitor(max_consecutive_failures=3)
        for _ in range(5):
            mon.record_attempt("seek", True)
        assert mon.success_rate("seek") == 1.0
        assert not mon.is_quarantined("seek")

    def test_quarantine_after_consecutive_failures(self):
        mon = ScraperHealthMonitor(max_consecutive_failures=3)
        for _ in range(3):
            mon.record_attempt("seek", False)
        assert mon.is_quarantined("seek")

    def test_threshold_below_90(self):
        mon = ScraperHealthMonitor(threshold=0.9)  # noqa — threshold stored for alerting
        for _ in range(8):
            mon.record_attempt("seek", True)
        for _ in range(2):
            mon.record_attempt("seek", False)
        assert mon.success_rate("seek") == 0.8
```

**Step 4: Verify**

```bash
cd backend && source .venv/bin/activate
python -m pytest tests/test_scraping.py -v
# Expected: ALL PASS

git add backend/src/services/scraping_session.py backend/src/services/scraper_health.py backend/tests/test_scraping.py
git commit -m "feat(backend): anti-bot scaper with proxy rotation and health monitor"
```

---

### Task 4: ML Pipeline (MLflow + XGBoost)

**Objective:** Build the job-candidate match scoring ML pipeline with MLflow tracking, XGBoost model, and Optuna hyperparameter tuning — implementing §12 of the architecture doc

**Files:**
- Create: `backend/src/services/__init__.py` — update
- Create: `backend/src/services/match_scorer.py`
- Create: `backend/src/services/ml_pipeline.py`
- Create: `backend/tests/test_ml_pipeline.py`

**Step 1: Add ML dependencies**

Add to `backend/pyproject.toml`:
```toml
dependencies = [
    ...existing...,
    "mlflow>=2.17.0",
    "xgboost>=2.1.0",
    "optuna>=4.1.0",
    "scikit-learn>=1.5.0",
    "numpy>=1.26.0",
    "pandas>=2.2.0",
]
```

**Step 2: Write match_scorer.py**

```python
from __future__ import annotations
import structlog
from typing import Optional
import numpy as np
from src.schemas.jobs import NormalizedJob
from src.schemas import UserProfile

logger = structlog.get_logger()


class LogisticMatchScorer:
    """ML-based scorer that predicts probability of positive interaction.

    Uses XGBoost model (loaded from MLflow Model Registry).
    Falls back to heuristic scoring if model is unavailable.
    """

    def __init__(self, model_uri: str | None = None):
        self.model_uri = model_uri
        self._model = None
        self._loaded = False

    def _load_model(self):
        if self.model_uri and not self._loaded:
            try:
                import mlflow
                self._model = mlflow.pyfunc.load_model(self.model_uri)
                self._loaded = True
                logger.info("model_loaded", uri=self.model_uri)
            except Exception as e:
                logger.warning("model_load_failed", error=str(e), fallback="heuristic")

    def _compute_features(
        self, user_profile: dict, job: NormalizedJob
    ) -> np.ndarray:
        """Compute feature vector for user-job pair.

        Features:
        - Skill overlap ratio
        - Salary alignment (how close job salary is to user expectation)
        - Location proximity (1 if same suburb, 0.5 if same state, 0 otherwise)
        - Employment type match
        - Hours alignment
        """
        # Skill overlap
        user_skills = set(user_profile.get("skills", []))
        job_skills = set(r.name for r in job.requirements)
        skill_overlap = len(user_skills & job_skills) / max(len(job_skills), 1)

        # Salary alignment
        salary_align = 0.5
        if job.salary and user_profile.get("expected_salary"):
            user_sal = user_profile["expected_salary"]
            job_mid = (job.salary.min + job.salary.max) / 2
            if job_sal_min <= user_sal <= job_sal_max or abs(job_mid - user_sal) < 10:
                salary_align = 1.0
            elif job_mid < user_sal * 0.7 or job_mid > user_sal * 1.5:
                salary_align = 0.2

        # Location proximity
        user_suburb = user_profile.get("suburb", "")
        location_match = 1.0 if user_suburb.lower() == job.location.suburb.lower() else 0.3

        # Employment type match
        type_match = 1.0 if user_profile.get("preferred_type") == job.employment_type.value else 0.5

        return np.array([
            skill_overlap,
            salary_align,
            location_match,
            type_match,
            1.0,  # bias term
        ]).reshape(1, -1)

    def score(self, user_profile: dict, job: NormalizedJob) -> float:
        """Return match probability score between 0 and 1."""
        self._load_model()

        if self._model:
            features = self._compute_features(user_profile, job)
            try:
                score = float(self._model.predict(features)[0])
                return max(0.0, min(1.0, score))
            except Exception as e:
                logger.warning("model_inference_failed", error=str(e))

        # Fallback: heuristic score
        return self._heuristic_score(user_profile, job)

    def _heuristic_score(self, user_profile: dict, job: NormalizedJob) -> float:
        """Simple heuristic when ML model is unavailable."""
        score = 0.5  # base

        user_skills = set(user_profile.get("skills", []))
        job_skills = set(r.name for r in job.requirements)
        if job_skills:
            overlap = len(user_skills & job_skills) / len(job_skills)
            score += overlap * 0.3

        if user_profile.get("suburb", "").lower() == job.location.suburb.lower():
            score += 0.1

        return max(0.0, min(1.0, score))
```

**Step 3: Write ml_pipeline.py**

```python
from __future__ import annotations
import structlog
import mlflow
import optuna
import xgboost as xgb
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import ndcg_score, precision_score
from typing import Optional

logger = structlog.get_logger()


class MatchTrainingPipeline:
    """ML training pipeline with MLflow tracking and Optuna tuning."""

    def __init__(self, mlflow_tracking_uri: str = "http://mlflow:***"

    def _create_dummy_data(self, n_samples: int = 1000) -> pd.DataFrame:
        """Create synthetic training data for pipeline testing."""
        np.random.seed(42)
        data = {
            "skill_overlap": np.random.beta(2, 5, n_samples),
            "salary_alignment": np.random.beta(3, 3, n_samples),
            "location_match": np.random.beta(1, 2, n_samples),
            "type_match": np.random.randint(0, 2, n_samples).astype(float),
            "bias": np.ones(n_samples),
        }
        df = pd.DataFrame(data)
        # Generate labels: positive if weighted sum > threshold
        weights = np.array([0.4, 0.3, 0.2, 0.1, 0.0])
        score = df[["skill_overlap", "salary_alignment", "location_match",
                     "type_match", "bias"]].values @ weights
        df["label"] = (score > 0.5 + np.random.normal(0, 0.1, n_samples)).astype(int)
        return df

    def optimize_hyperparams(
        self, X_train: pd.DataFrame, y_train: pd.DataFrame, n_trials: int = 20
    ) -> dict:
        """Use Optuna to find best hyperparameters."""
        def objective(trial):
            params = {
                "max_depth": trial.suggest_int("max_depth", 3, 10),
                "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3),
                "n_estimators": trial.suggest_int("n_estimators", 50, 300),
                "subsample": trial.suggest_float("subsample", 0.6, 1.0),
                "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
                "min_child_weight": trial.suggest_int("min_child_weight", 1, 7),
                "gamma": trial.suggest_float("gamma", 0, 5),
                "random_state": 42,
                "use_label_encoder": False,
                "eval_metric": "logloss",
            }
            model = xgb.XGBClassifier(**params)
            model.fit(X_train, y_train)
            preds = model.predict_proba(X_train)[:, 1]
            return float(ndcg_score([y_train.values], [preds]))

        study = optuna.create_study(direction="maximize")
        study.optimize(objective, n_trials=n_trials)
        logger.info("optuna_complete", best_score=study.best_value)
        return study.best_params

    def train(self, data: pd.DataFrame | None = None):
        """Run a full training cycle with MLflow tracking."""
        if data is None:
            data = self._create_dummy_data()

        feature_cols = ["skill_overlap", "salary_alignment", "location_match",
                        "type_match", "bias"]
        X = data[feature_cols]
        y = data["label"]

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        with mlflow.start_run(run_name="match_scorer_training") as run:
            # Log dataset info
            mlflow.log_param("train_samples", len(X_train))
            mlflow.log_param("test_samples", len(X_test))

            # Optimize hyperparams
            best_params = self.optimize_hyperparams(X_train, y_train)
            mlflow.log_params(best_params)

            # Train final model
            model = xgb.XGBClassifier(**best_params, random_state=42)
            model.fit(X_train, y_train)

            # Evaluate
            preds = model.predict(X_test)
            proba = model.predict_proba(X_test)[:, 1]

            precision = precision_score(y_test, preds)
            ndcg = float(ndcg_score([y_test.values], [proba]))

            mlflow.log_metrics({
                "precision": precision,
                "ndcg": ndcg,
                "train_ndcg": float(ndcg_score([y_train.values],
                    [model.predict_proba(X_train)[:, 1]])),
            })

            # Register model (only if NDCG > 0.3 promotion gate)
            if ndcg > 0.3:
                mlflow.xgboost.log_model(
                    model, "model",
                    registered_model_name="match_scorer",
                )
                logger.info("model_registered", ndcg=ndcg)
            else:
                logger.warning("model_below_gate", ndcg=ndcg, gate=0.3)

            logger.info("training_complete", run_id=run.info.run_id)
            return {
                "run_id": run.info.run_id,
                "precision": precision,
                "ndcg": ndcg,
                "model_registered": ndcg > 0.3,
            }
```

**Step 4: Write tests**

```python
from src.services.match_scorer import LogisticMatchScorer
from src.schemas.jobs import NormalizedJob, Location, EmploymentType, SalaryRange
from datetime import datetime, timezone, timedelta


class TestMatchScorer:
    def test_heuristic_score(self):
        scorer = LogisticMatchScorer()
        job = NormalizedJob(
            title="Barista",
            location=Location(suburb="Tullamarine", state="VIC", postcode="3043"),
            employment_type=EmploymentType.CASUAL,
            expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        )
        profile = {
            "skills": ["coffee", "customer_service"],
            "suburb": "Tullamarine",
            "expected_salary": 30.0,
            "preferred_type": "casual",
        }
        score = scorer.score(profile, job)
        assert 0 <= score <= 1
```

**Step 5: Verify**

```bash
cd backend && source .venv/bin/activate
pip install -e ".[dev]" xgboost optuna mlflow scikit-learn
python -m pytest tests/test_ml_pipeline.py -v
# Expected: ALL PASS

git add backend/src/services/match_scorer.py backend/src/services/ml_pipeline.py backend/tests/test_ml_pipeline.py
git commit -m "feat(backend): ML match scoring pipeline with MLflow + XGBoost"
```

---

### Task 5: Automated Data Pruning & Verifier

**Objective:** Build the Celery beat task that verifies job listings, expires stale ones, and tracks scraper health — implementing §14 of the architecture doc

**Files:**
- Create: `backend/src/services/data_pruner.py`
- Create: `backend/tests/test_data_pruner.py`
- Update: `backend/src/workers/celery_app.py` (add beat schedule)

**Step 1: Write data_pruner.py**

```python
from __future__ import annotations
import structlog
from datetime import datetime, timezone, timedelta
from typing import Optional
import httpx

logger = structlog.get_logger()

# Indicators of job no longer available
_EXPIRED_INDICATORS = [
    "position filled",
    "no longer accepting",
    "this position has been filled",
    "job has been closed",
    "we are no longer accepting applications",
]


class DataPruner:
    """Verifies and expires stale job listings."""

    def __init__(self, supabase_client=None):
        self._supabase = supabase_client

    async def verify_job_url(self, url: str) -> tuple[bool, str]:
        """Check if a job listing URL is still live."""
        try:
            async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
                resp = await client.get(url)

                if resp.status_code in (404, 410):
                    return False, "not_found"

                if resp.status_code >= 400:
                    return True, "server_error"

                # Check page content for expired indicators
                text = resp.text.lower()
                for indicator in _EXPIRED_INDICATORS:
                    if indicator in text:
                        return False, f"content_indicator: {indicator}"

                return True, "active"

        except (httpx.ConnectError, httpx.TimeoutException) as e:
            return True, f"verification_error: {str(e)}"  # Keep active on transient error

    async def verify_active_jobs(self, supabase) -> tuple[int, int]:
        """Fetch all active jobs older than 24h and verify them."""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

        result = await supabase.table("jobs") \
            .select("id, source_url") \
            .eq("is_active", True) \
            .lt("created_at", cutoff.isoformat()) \
            .execute()

        jobs = result.data or []
        expired_count = 0
        verified_count = 0

        for job in jobs:
            if not job.get("source_url"):
                continue
            verified_count += 1
            is_active, reason = await self.verify_job_url(job["source_url"])
            if not is_active:
                # Soft-delete: set is_active=False
                await supabase.table("jobs") \
                    .update({"is_active": False, "expired_reason": reason}) \
                    .eq("id", job["id"]) \
                    .execute()
                expired_count += 1
                logger.info("job_expired", job_id=job["id"], reason=reason)

        logger.info("verification_cycle_complete", checked=verified_count, expired=expired_count)
        return verified_count, expired_count
```

**Step 2: Add beat schedule to celery_app.py**

Add to `celery_app.conf`:
```python
celery_app.conf.beat_schedule = {
    "verify-active-jobs": {
        "task": "src.workers.processing.verify_and_prune_jobs",
        "schedule": 21600.0,  # Every 6 hours
    },
}
```

And add the task to `processing.py`:
```python
@celery_app.task(queue="processing")
def verify_and_prune_jobs():
    """Celery beat task to verify and prune expired jobs."""
    import asyncio
    from src.services.data_pruner import DataPruner
    pruner = DataPruner()
    # asyncio.run(pruner.verify_active_jobs(...))
    logger.info("verification_task_started")
```

**Step 3: Write tests**

```python
import pytest
from src.services.data_pruner import DataPruner


class TestDataPruner:
    def test_expired_indicators_detected(self):
        # Indicators are class-level constants
        assert "position filled" in DataPruner._EXPIRED_INDICATORS  # noqa
        assert "no longer accepting" in DataPruner._EXPIRED_INDICATORS  # noqa
```

**Step 4: Verify**

```bash
cd backend && source .venv/bin/activate
python -m pytest tests/test_data_pruner.py -v
# Expected: PASS

git add backend/src/services/data_pruner.py backend/tests/test_data_pruner.py
git commit -m "feat(backend): job verification pruner with Celery beat schedule"
```

---

### Phase 2 Completion Verification

```bash
cd backend && source .venv/bin/activate
python -m pytest tests/ -v --cov=src --cov-report=term-missing
# Expected: ALL PASS

# Start all services
docker compose up -d

# Verify Qdrant
curl http://localhost:6333/collections
# Expected: JSON with hi_hired_jobs collection

git add -A && git commit -m "chore: phase 2 data intelligence layer complete"
```

---

## Phase 2 Summary

| Component | Status | Doc § |
|-----------|--------|-------|
| Qdrant vector store with payload indexes | Planned | §7 |
| OpenAI embedding integration | Planned | §7 |
| Multi-level cache (memory + Redis + stampede protection) | Planned | §8 |
| Anti-bot scraper with proxy rotation + exponential backoff | Planned | §9 |
| Scraper health monitor with auto-quarantine | Planned | §9, §14 |
| ML match scorer (XGBoost + heuristic fallback) | Planned | §12 |
| MLflow training pipeline with Optuna tuning + NDCG gate | Planned | §12 |
| Data pruner (URL verification + soft-delete) | Planned | §14 |

**Dependencies:** Phase 1, Qdrant (Docker), OpenAI API key, Redis (Docker)
