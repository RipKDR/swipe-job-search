# ADR: Backend Data Contracts, Cache Keys, and Event Schemas

**Date:** 2026-05-30
**Status:** Accepted
**Deciders:** H F (product owner), Claw (engineering)

## Context

The backend has multiple services (normalizer, vector store, cache manager, event publisher, ML pipeline) that share data contracts. Without explicit boundaries, contract drift between services creates hard-to-find bugs in production.

Three specific areas need freeze:

1. **Canonical schemas** — the `NormalizedJob`, `UserProfile`, and event payloads live in `backend/src/schemas/`. Services like `job_normalizer.py`, `vector_store.py`, and `match_scorer.py` should import and produce exactly these types — not inline dicts or partial shapes.
2. **Cache key naming and versioning** — the `CacheManager` accepts arbitrary keys. Without a naming convention, different services can collide on keys or read stale-version data.
3. **Event payload versioning** — the current `EventPublisher` publishes Pydantic models as JSON via Redis Pub/Sub. Downstream subscribers need to know the schema version of each event to migrate safely.

## Decision

### 1. Canonical schemas as single source of truth

- `NormalizedJob` in `backend/src/schemas/jobs.py` is the **single canonical shape** for all job data flowing through the system.
- `UserProfile` in `backend/src/schemas/profile.py` is the single canonical shape for candidate profile data.
- Event payloads in `backend/src/schemas/events.py` define the envelope; opaque `payload: dict` content is documented inline per event type.
- Service boundaries (`job_normalizer`, `vector_store`, `match_scorer`, `cache_manager`) must accept and return these exact types — no inline dicts, no partial shape subsets.
- The `RawJobInput` schema is the input contract for ingestion pipelines; `NormalizedJob` is the output contract for all downstream consumers.

### 2. Cache key naming convention

All cache keys follow this structure:

```
{namespace}:{entity-type}:{identifier}[:{variant}]
```

| Namespace | Entity type | Example | TTL |
|-----------|-------------|---------|-----|
| `search` | `results` | `search:results:v2:{query_hash}` | 120s |
| `search` | `vector` | `search:vector:v1:{job_id}` | 3600s |
| `scrape` | `session` | `scrape:session:{source}:{session_id}` | 600s |
| `scrape` | `health` | `scrape:health:{source}` | 300s |
| `match` | `score` | `match:score:{candidate_id}:{job_id}` | 600s |
| `event` | `dedup` | `event:dedup:{event_id}` | 86400s |
| `lock` | `stampede` | `lock:stampede:{cache_key}` | 10s |

- Key version segments (`v1`, `v2`) allow rolling cache migrations without cluster-wide flush.
- Always include a version segment before the identifier to allow independent cache migrations per entity type.
- TTLs are guidance values; callers may override per-key via the CacheManager `ttl` parameter.

### 3. Event payload versioning

All events carry a `version` integer field in the `BaseEvent` envelope:

```python
class BaseEvent(BaseModel):
    event_id: UUID = Field(default_factory=uuid4)
    event_type: str
    version: int = 1
    timestamp: datetime = Field(default_factory=lambda: datetime.now(tz=utc))
    correlation_id: UUID
    payload: dict[str, Any]
```

- Bump `version` when the expected shape of `payload` changes for a given `event_type`.
- The `EventPublisher` serialises the full event model (including `version`) to JSON.
- Subscribers check `version` before processing; unknown versions are logged and routed to a dead-letter channel.

### 4. Published event types and their payload contracts

| Event Type | Version | Payload Shape | Publisher |
|---|---|---|---|
| `job.ingested` | 1 | `{ raw_job_input: RawJobInput }` | Ingestion pipeline |
| `job.indexed` | 1 | `{ job_id: UUID, title: str, location: dict }` | Vector indexer |
| `user.matched` | 1 | `{ match_id: UUID, candidate_id: UUID, job_id: UUID }` | Match scorer |
| `application.submitted` | 1 | `{ swipe_id: UUID, job_id: UUID, candidate_id: UUID }` | Swipe handler |
| `application.status_changed` | 1 | `{ match_id: UUID, status: str }` | Match status handler |

## Consequences

- A new service engineer can determine the shape of every data boundary from three files: `schemas/jobs.py`, `schemas/profile.py`, `schemas/events.py`.
- Cache busting a namespace requires a version bump on the relevant key prefix — no cluster-wide flush needed.
- Event subscribers will reject unknown versions with a logged warning, making schema migrations visible in telemetry.
- Services that currently use inline dicts (e.g., internal helpers) should be migrated to shared types as part of future refactors.
