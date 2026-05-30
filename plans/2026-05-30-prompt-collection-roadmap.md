# Swipe Job Search Architecture Prompt Incorporation Roadmap

> **For Hermes:** Use `software-development/subagent-driven-development` to execute the phase docs. This roadmap is the planning layer; it is not implementation work.

**Goal:** Fold the 17-section `SwipeJobSearch_Technical_Architecture_Prompts.docx` into the current Hi-Hired repo without duplicating work that is already implemented.

**Architecture:** The repo already has the right backbone: Expo Router mobile app, FastAPI backend, Supabase migrations, Terraform + Helm infra, and a docs asset generator. The plan is to harden and connect what exists, not to rewrite the app into a different architecture. Keep the current folder structure (`apps/mobile`, `backend`, `infra`, `docs`, `plans`) and only introduce new modules where there is a real contract or operational gap.

**Tech Stack:** Expo Router, React Native, Reanimated, Gesture Handler, TanStack Query, Supabase, FastAPI, Celery, Redis, Qdrant, PostgreSQL, Vault, Terraform, Helm, GitHub Actions, OpenTelemetry, MLflow, Playwright.

---

## Blueprint

- **Intent:** turn the prompt collection into a production-hardening roadmap for the current codebase.
- **Constraints:** avoid parallel auth stacks, preserve 60FPS swipe UX, keep mobile state boundaries simple, and do not replace existing working subsystems just because the prompt doc describes a more abstract architecture.
- **Data Contract:** auth/session payloads, job normalization schemas, event schemas, cache keys, vector payloads, deployment inputs, and docs asset outputs.
- **Success Criteria:** each prompt section maps to an existing module, a missing contract, or a deliberate deferment; no duplicate implementations are introduced.

## Technical Schema

- **Data Flow:** prompt doc -> cluster analysis -> phase plans -> implementation tasks -> tests -> deployment/docs.
- **Component Boundaries:** mobile UX, backend/data plane, infra/ops, docs assets.
- **Algorithm Selection:** prefer current primitives first; introduce new systems only where a contract gap exists; use queue/outbox/idempotency for side-effectful backend work.
- **State Management:** mobile server state stays in TanStack Query and the existing auth provider; backend state lives in Postgres/Redis/Qdrant/Vault; docs imagery is generated from `docs/scripts/gen-cover-bg.py`.
- **Interfaces:** auth flow, job ingest/normalize, event publish/subscribe, vector index/search, cache invalidation, CI/CD gates.

## What is already covered

- Mobile swipe deck, predictive buffering, commute badge, match score badge, auth callback flow, and session persistence.
- Backend normalization, vector store, cache manager, scraping health/pruning, auth/rate-limit middleware, telemetry, and Celery worker scaffolding.
- Infra Terraform modules, Helm backend chart, GitHub Actions workflows.
- Docs cover generator already exists in `docs/scripts/gen-cover-bg.py` and writes `doc1_cover_bg.png`, `doc2_cover_bg.png`, `doc3_cover_bg.png`, and `body_bg.png` under `docs/scripts/output/`.

## Main gaps

- The auth architecture is still a decision point.
- The backend event plane and worker topology need production contracts.
- Infra/telemetry/ML/release automation need final hardening and deployment wiring.
- The docs asset generator should be documented as a utility, not treated as a product subsystem.

## Phase order

1. Mobile/auth decision and UX polish.
2. Backend/data/security hardening.
3. Infra/ML/ops/docs delivery.

## Do not do

- Do not build a custom JWT/OAuth2 stack and the Supabase session path in the same release.
- Do not rewrite the Expo Router app into a `/src` architecture just to mirror the prompt.
- Do not introduce MMKV/Zustand unless a measured need appears.
- Do not turn the cover-background generator into a large design pipeline.

## Deliverables

- [Mobile auth & swipe plan](2026-05-30-mobile-auth-swipe-plan.md)
- [Backend data & security plan](2026-05-30-backend-data-security-plan.md)
- [Infra, ML, ops, and docs plan](2026-05-30-infra-ml-ops-docs-plan.md)
- [Docs cover assets note](2026-05-30-docs-cover-assets-plan.md)
