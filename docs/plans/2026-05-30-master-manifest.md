# Hi-Hired Technical Architecture Expansion — Master Manifest

> **Status:** Plan · **Date:** 2026-05-30
> **Source:** `SwipeJobSearch_Technical_Architecture_Prompts.docx` (17 sections)
> **Base project:** `/home/admin/swipe-job-search/` (Expo SDK 56 monorepo)

## Architecture Overview

The document introduces a multi-layer architecture that extends the current Expo + Supabase project with:

1. **Python backend service tier** (FastAPI + Celery + Redis)
2. **Data intelligence** (Qdrant vector DB, ML pipeline, caching)
3. **Infrastructure** (Terraform, K8s, CI/CD, telemetry, secrets)
4. **Frontend enhancements** (60FPS swipe, predictive buffering, enhanced auth)

```
┌──────────────────────────────────────────────────────────────┐
│  apps/mobile (Expo RN · Reanimated · Gesture Handler)        │
│  ← SwipeCard 60FPS · useJobsPipeline · JWT auto-refresh      │  Phase 4
└──────────────────────────┬───────────────────────────────────┘
                           │ supabase-js + custom API calls
┌──────────────────────────▼───────────────────────────────────┐
│  backend/src (Python FastAPI + Celery + Redis + Pydantic)     │  Phase 1
│  ← Job ingestion · Normalization · Events · Workers           │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│  Data Intelligence Layer                                      │  Phase 2
│  ├── Qdrant vector DB (semantic job search)                   │
│  ├── MLflow + XGBoost (match scoring)                         │
│  ├── Cache Manager (memory → Redis → materialized views)      │
│  └── Scraping Session (anti-bot, proxy rotation, health)      │
└────────────────────┬───────────────────────────────────┬──────┘
                     │                                   │
┌────────────────────▼─────────┐   ┌─────────────────────▼──────┐
│  infra/terraform (AWS · EKS)  │   │  .github/workflows         │  Phase 3
│  ├── VPC · EKS · RDS · Redis │   │  ├── CI (lint · test · sec)│
│  ├── S3 · IAM · Monitoring   │   │  ├── CD (build · deploy)   │
│  └── Vault (secret mgmt)     │   │  └── Release (Helm · EAS)  │
└──────────────────────────────┘   └─────────────────────────────┘
```

## Section-to-Phase Mapping

| Doc § | Title | Phase | Priority |
|-------|-------|-------|----------|
| §1 | Tech Stack Overview & Project Structure | P1 | Reference (already in STACK.md) |
| §2 | 60FPS Swipe Engine (Reanimated v3) | **P4** Task 1 | High |
| §3 | Predictive Buffering & Data Sync | **P4** Task 2 | High |
| §4 | Micro-Service Decoupling (Celery/Redis) | **P1** Task 3 | High |
| §5 | Data Normalization Schema (Pydantic) | **P1** Task 2 | High |
| §6 | Event-Driven Architecture (Pub/Sub) | **P1** Task 5 | High |
| §7 | Vector Database Integration | **P2** Task 1 | Medium |
| §8 | Multi-Level Caching Strategy | **P2** Task 2 | Medium |
| §9 | Advanced Concurrency & Anti-Bot Evasion | **P2** Task 3 | Medium |
| §10 | Infrastructure-as-Code (Terraform/K8s) | **P3** Task 1 | Low (blocks prod) |
| §11 | Enterprise Secret Management | **P3** Task 5 | Low |
| §12 | ML Pipeline Automation (MLflow) | **P2** Task 4 | Medium |
| §13 | Distributed Telemetry (OpenTelemetry) | **P3** Task 4 | Low |
| §14 | Automated Data Pruning & Scraper Health | **P2** Task 5 | Medium |
| §15 | Rate-Limiting & API Defense | **P3** Task 3 | Medium |
| §16 | CI/CD Pipeline (GitHub Actions) | **P3** Task 2 | Low |
| §19 | Secure Session State (JWT/OAuth2) | **P4** Task 3 | High |

## Implementation Order

### Recommended Execution Sequence

```
Phase 4 ───────┐  (Can run independently — no backend deps)
                ├──→ Ship frontend improvements immediately
                │
Phase 1 ────────┘  (Backend foundation — needed for P2)
        │
        ├──→ Phase 2  (Data intelligence — needed for semantic matching)
        │
        └──→ Phase 3  (Infra — deploy backend + data services)
```

| Step | Phase | What it delivers | Duration |
|------|-------|-----------------|----------|
| 1 | **P4** | 60FPS swipe, predictive buffering, OAuth2 auth | 1-2 days |
| 2 | **P1** | FastAPI backend, Pydantic schemas, Celery workers, events | 2-3 days |
| 3 | **P2** | Qdrant vector search, ML match scoring, caching, scraper | 3-4 days |
| 4 | **P3** | Terraform infra, CI/CD pipelines, telemetry, secrets | 2-3 days |

## File Map

```
hi-hired/
├── apps/mobile/                          ← Phase 4 (enhancements)
│   ├── components/deck/
│   │   ├── SwipeCard.tsx                 ● NEW — 60FPS swipe wrapper
│   │   ├── SwipeDeck.tsx                 ● MODIFY — use SwipeCard
│   │   └── JobCard.tsx                   ▲ EXISTS (no change needed)
│   ├── hooks/
│   │   ├── useJobsPipeline.ts            ● NEW — predictive buffering
│   │   └── useJobDeck.ts                 ● MODIFY — delegate to pipeline
│   ├── lib/
│   │   ├── swipe-engine.ts               ● NEW — pure gesture math
│   │   ├── auth/oauth.ts                 ● NEW — OAuth2 social login
│   │   ├── auth/token-refresh.ts         ● NEW — JWT auto-refresh
│   │   └── supabase.ts                   ● MODIFY — add auth listener
│   └── providers/AuthProvider.tsx        ● MODIFY — enhanced session
│
├── backend/                              ← Phase 1 + Phase 2 (NEW)
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── src/
│       ├── main.py                       ● FastAPI entrypoint
│       ├── api/                          ● REST endpoints
│       │   └── middleware/               ● Auth, rate limit (Phase 3)
│       ├── core/                         ● Config, telemetry, secrets
│       ├── schemas/                      ● Pydantic v2 models
│       ├── services/
│       │   ├── job_normalizer.py         ● RawJobInput → NormalizedJob
│       │   ├── event_publisher.py        ● Redis Pub/Sub publisher
│       │   ├── event_subscriber.py       ● Redis Pub/Sub subscriber
│       │   ├── vector_store.py           ● Qdrant integration (P2)
│       │   ├── cache_manager.py          ● Multi-level cache (P2)
│       │   ├── scraper_session.py        ● Anti-bot HTTP client (P2)
│       │   ├── scraper_health.py         ● Health monitor (P2)
│       │   ├── match_scorer.py           ● ML scoring (P2)
│       │   ├── ml_pipeline.py            ● MLflow training (P2)
│       │   └── data_pruner.py            ● Job verification (P2)
│       └── workers/
│           ├── celery_app.py             ● Celery configuration
│           ├── scraper.py                ● Scraper worker tasks
│           ├── processing.py             ● Processing worker tasks
│           └── notifications.py          ● Notification worker tasks
│
├── infra/                                ← Phase 3 (NEW)
│   ├── terraform/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── modules/
│   │   │   ├── vpc/
│   │   │   ├── eks/
│   │   │   ├── database/
│   │   │   ├── storage/
│   │   │   ├── monitoring/
│   │   │   └── iam/
│   │   └── environments/
│   │       └── staging/terraform.tfvars
│   └── vault/
│       └── policies/backend.hcl
│
├── .github/workflows/                    ← Phase 3 (NEW)
│   ├── ci.yml                            ● PR validation
│   ├── cd.yml                            ● Main merge deploy
│   └── release.yml                       ● Tagged release
│
└── docs/plans/
    ├── 2026-05-30-phase1-backend-service-foundation.md
    ├── 2026-05-30-phase2-data-intelligence.md
    ├── 2026-05-30-phase3-infrastructure-devops.md
    ├── 2026-05-30-phase4-frontend-advanced.md
    └── 2026-05-30-master-manifest.md     ← THIS FILE
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Python backend (not Deno) | Celery + ML ecosystem maturity; existing Deno Edge Functions stay for realtime & data-plane ops |
| Qdrant (not Pinecone/Weaviate) | Self-hosted, AU region control, no per-query costs, Docker Compose friendly |
| Redis Pub/Sub (not Kafka v1) | Simpler for Phase 1; Kafka migration path documented in §6 for scale |
| XGBoost (not neural) | Better with tabular data, interpretable features, smaller training data requirements |
| Terraform (not Pulumi/CDK) | Already in architecture doc; team familiarity, HCL for IaC standard |
| EKS (not ECS) | K8s portability, Helm for deployment, cluster autoscaler for ML batch jobs |
| Reanimated v3 (already in use) | UI thread animations verified working; only need SwipeCard wrapper refactor |

## Verification Gate

Before merging any phase into `main`:

- [ ] All tests pass (`pnpm test` + `pytest tests/`)
- [ ] TypeScript type-check passes (`pnpm typecheck`)
- [ ] Python type-check passes (`mypy src/`)
- [ ] Lint passes (`ruff check` + `eslint`)
- [ ] No `any` types in new TypeScript (except at isolated boundaries)
- [ ] No `TODO` or `FIXME` in new production code
- [ ] Supabase `agent_logs` row inserted for agent work
- [ ] CHANGELOG.md updated
- [ ] Plan docs committed alongside implementation
