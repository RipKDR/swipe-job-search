# Backend Data Plane, Security, and Worker Topology Implementation Plan

> **For Hermes:** Use `software-development/subagent-driven-development` to execute this plan task-by-task.

**Goal:** Productionize the backend data plane, make the worker topology explicit, and harden the security and caching boundaries.

**Architecture:** The backend already contains the important primitives: canonical schemas, normalization, vector search, cache manager, scraping session/health/pruning, auth/rate-limit middleware, telemetry, and Celery worker scaffolding. The right move is to freeze contracts, add durable side-effect handling, and harden the operational edges. Do not collapse the whole backend into a different architecture when the missing work is mostly wiring and policy.

**Tech Stack:** FastAPI, Pydantic v2, Celery, Redis, Qdrant, PostgreSQL, Vault, OpenTelemetry, Supabase migrations, Docker Compose, pytest, ruff, mypy.

---

## Blueprint

- **Intent:** make the backend safe to scale and easy to reason about under real ingestion, search, scraping, and auth load.
- **Constraints:** keep shared files single-owner, avoid duplicate contract definitions, keep event consumers idempotent, and preserve the existing API surface where possible.
- **Data Contract:** normalized jobs, profile data, event payloads, vector payloads, cache keys, queue messages, token/role claims, and secret lease behavior.
- **Success Criteria:** every side effect has a durable owner, every hot path has a test, and the queue/event/cache/security layers are explicit enough that a new engineer can follow them without guessing.

## Technical Schema

- **Data Flow:** scrape/ingest -> normalize -> persist -> publish event -> index vector -> invalidate cache -> schedule downstream work -> prune/notify.
- **Component Boundaries:** `backend/src/schemas`, `backend/src/services`, `backend/src/workers`, `backend/src/api/middleware`, `backend/src/core`, `supabase/migrations`.
- **Algorithm Selection:** use idempotent consumers, an outbox/dedupe pattern for events, Redis-backed distributed limiting and cache protection, and backoff/quarantine for anti-bot workflows.
- **State Management:** canonical job/profile/event contracts live in `backend/src/schemas`; operational behavior lives in `backend/src/services` and `backend/src/workers`; shared config/secrets/telemetry live in `backend/src/core`.
- **Interfaces:** queue routing, event schema versioning, vector payload shape, cache invalidation hooks, and auth/rate-limit responses.

## Single-owner files

These files should be owned by one task at a time because every feature touches them:

- `backend/src/core/config.py`
- `backend/src/core/secrets.py`
- `backend/src/core/telemetry.py`
- `backend/src/main.py`
- `backend/src/api/middleware/auth.py`
- `backend/src/api/middleware/rate_limit.py`
- `backend/src/services/cache_manager.py`
- `backend/src/services/vector_store.py`
- `backend/src/workers/celery_app.py`
- `backend/docker-compose.yml`
- `backend/pyproject.toml`

## Tasks

### Task 1: Freeze the canonical contracts

**Objective:** Make the job, event, cache, and vector contracts explicit before any more wiring is added.

**Files:**
- Update: `backend/src/schemas/jobs.py`
- Update: `backend/src/schemas/profile.py`
- Update: `backend/src/schemas/events.py`
- Update: `backend/src/services/job_normalizer.py`
- Create: `docs/adr/2026-05-30-backend-contracts.md`

**Plan:**
- Write down the canonical schemas for normalized jobs, event payloads, and vector payloads.
- Record cache key naming and versioning conventions.
- Capture the input/output contract for each service boundary.

**Verification:**
- A new engineer can point to one canonical schema for each data type.
- No duplicate contract definitions exist in services and endpoints.

### Task 2: Make the worker topology explicit

**Objective:** Turn the Celery scaffolding into a clear queue topology with retries, routing, and health checks.

**Files:**
- Update: `backend/src/workers/celery_app.py`
- Update: `backend/src/workers/scraper.py`
- Update: `backend/src/workers/processing.py`
- Update: `backend/src/workers/notifications.py`
- Update: `backend/docker-compose.yml`

**Plan:**
- Define the queue layout and routing rules.
- Add retry/backoff behavior and dead-letter handling for failed tasks.
- Keep the worker roles distinct: scraper, processing, notification.
- Make sure local compose mirrors the production topology closely enough to catch integration mistakes early.

**Verification:**
- `docker compose -f backend/docker-compose.yml config` renders cleanly.
- Each task type has one obvious queue owner.
- Failed tasks do not disappear silently.

### Task 3: Turn event scaffolding into a durable event plane

**Objective:** Make publish/subscribe flows resilient, replayable, and idempotent.

**Files:**
- Update: `backend/src/services/event_publisher.py`
- Update: `backend/src/services/event_subscriber.py`
- Create: `backend/src/services/outbox.py`
- Update: `backend/src/schemas/events.py`

**Plan:**
- Add durable event emission for job ingest/update/delete boundaries.
- Add dedupe keys and idempotent consumer behavior.
- Add a replay/backfill path so downstream systems can recover without ad hoc scripts.
- Keep the event payload versioned so downstream consumers can evolve safely.

**Verification:**
- Events can be reprocessed without duplicate side effects.
- A lost consumer can catch up from a durable source.
- Event versioning is visible in the schema and the publisher.

### Task 4: Productionize vector search and cache coherence

**Objective:** Make vector indexing, search, and cache invalidation behave like one system instead of three separate helpers.

**Files:**
- Update: `backend/src/services/vector_store.py`
- Update: `backend/src/services/cache_manager.py`
- Update: `backend/src/api/endpoints/jobs.py`
- Update: `backend/src/api/endpoints/forecast.py` only if it shares the same cache or model-result boundary

**Plan:**
- Add collection versioning and a reindex/backfill path.
- Ensure search results and ranking data invalidate or refresh deterministically when the underlying job changes.
- Keep stampede protection explicit in the cache manager.
- Add metrics around cache hits, misses, and reindex work.

**Verification:**
- `pytest backend/tests/test_vector_store.py -q`
- `pytest backend/tests/test_cache_manager.py -q`
- Search and cache state stay coherent after a job update.

### Task 5: Harden security and anti-bot orchestration

**Objective:** Make auth, rate limiting, secrets, and scraper hardening production-grade.

**Files:**
- Update: `backend/src/api/middleware/auth.py`
- Update: `backend/src/api/middleware/rate_limit.py`
- Update: `backend/src/core/secrets.py`
- Update: `backend/src/services/scraping_session.py`
- Update: `backend/src/services/scraper_health.py`
- Update: `backend/src/services/data_pruner.py`

**Plan:**
- Keep JWT/RBAC and token-bucket limits explicit.
- Ensure distributed rate limiting is Redis-backed if the app is deployed beyond one process.
- Make secret loading, lease handling, and fallback behavior explicit.
- Keep proxy health, quarantine, and pruning logic visible and testable.

**Verification:**
- `pytest backend/tests/test_middleware.py -q`
- `pytest backend/tests/test_scraping.py -q`
- `pytest backend/tests/test_data_pruner.py -q`
- `pytest backend/tests/test_vector_store.py -q`

### Task 6: Regression tests and integration validation

**Objective:** Catch contract drift before it reaches production.

**Files:**
- Update or add tests under `backend/tests/`

**Plan:**
- Add integration coverage for the event -> vector -> cache path.
- Add failure-mode coverage for worker retries and limiter behavior.
- Add test fixtures that reflect the canonical schemas rather than duplicated ad hoc payloads.

**Verification:**
- `pytest backend/tests -q`
- `pytest backend/tests -m slow` for the marked long-running suite
- `ruff check backend/src backend/tests`
- `python -m mypy backend/src` if the backend type-checking config is enabled

## Risks

- Shared file collisions on config, main, and worker entrypoints can corrupt the integration boundary if multiple tasks edit them at once.
- If event consumers are not idempotent, retries will create duplicate side effects.
- If the cache and vector stores are not versioned together, stale results will survive job updates.
- If the distributed limiter is skipped, any multi-process deployment will have inconsistent abuse control.
