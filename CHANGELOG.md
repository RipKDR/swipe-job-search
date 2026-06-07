# Changelog

All notable changes to Hi-Hired will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added (2026-06-07 — Phase 4: Chat media, read receipts, jobs restructure)

- **Chat media attachments:** Full attachment system — upload images/video/docs from
  chat, signed URL display, `message_attachments` table with RLS, storage bucket
  wiring (`chat-media`). New components: `MediaPicker`, `AttachmentPreview`,
  `AttachmentImage`, `AttachmentVideo`, `AttachmentDocument`, `TypingIndicator`.
- **Read receipts:** `read_at` column on `messages`, realtime subscription for
  read-receipt updates, auto-mark-read on chat open.
- **Typing indicators:** Broadcast-based typing status with debounce (800ms) and
  TTL cleanup (3s).
- **Jobs screen restructure:** Replaced flat `jobs.tsx` with router-based
  `jobs/` stack (`_layout.tsx` + `index.tsx`) supporting `[id]/edit` and
  `[id]/interested` nested routes. Stats summary bar with active jobs, interested
  count, matches. Job pause/reactivate toggle with expiry extension.
- **Database types:** Added `message_attachments` table and `read_at` column to
  `messages` in both `packages/shared` and local `database.types.ts`.
- **Fix useChat.ts:** Corrected variable name bug (`return data` → `return message`)
  in `createMessageWithAttachments`.
- **Fix MessageInput.tsx:** `useRef` initial value for React 19 compatibility.
- **Fix MediaPicker.tsx:** Removed dead `Image` import; added type shim for
  `expo-document-picker`.
- **Test fixtures:** Updated `useChat.test.ts` with `read_at` field on all test
  message objects; added type imports.

### Added (2026-06-07 — Deep links for Matches + retention flows)

- **Deep link support (hi-hired:// scheme):** FEATURE_DEEP_LINKS + parseDeepLink in
  `lib/routing.ts` (deck, matches, saved, chat/:id). Root `_layout.tsx` listener
  (Linking.getInitialURL + addEventListener) for cold-start + runtime nav (streak
  at-risk → deck, match notifs → chat/matches per handoffs).
- Chat target corrected to `/chat/${matchId}` (matches actual `app/chat/[matchId].tsx`
  + `useMatchInbox` + `matches.tsx` pushes from MatchInboxList/MatchCelebration).
- Source-driven from existing auth deep links (getAuthRedirectUrl) + Expo Router
  patterns in CLAUDE.md + react-native-architecture skill + streak/matches handoff plans.
- Verified: `pnpm --filter @hi-hired/mobile typecheck` exit 0; targeted tests (25 passed
  in match/streak files, MatchCelebration.test green); end-to-end route consistency.
- Per architect-developer-protocol (blueprint in plans/next-phases-*.md) + hi-hired-delivery-loop
  (full audit first, agent_logs gate, 4-lens via pre-commit).
- Model: grok-build-0.1 (xai-oauth). Commit: e9686161.

### Added (2026-06-06 — Phase 3: Infra/ML/Ops/Docs delivery)

- **Terraform hardening:** Fixed EKS alarm namespace (AWS/ECS → ContainerInsights),
  added per-queue worker IAM roles (backend_processing, backend_notifications),
  exposed missing outputs, added monitoring module accessors.
- **Helm chart productionization:** Split per-queue deployments (worker-processing,
  worker-notifications, worker-scraper) with per-queue Celery configs; added
  PodDisruptionBudget, resource requests/limits, HPA, topologySpreadConstraints;
  created `values-staging.yaml` and `values-production.yaml` with environment
  overrides; split ServiceAccounts for IRSA.
- **Prometheus metrics middleware:** Request counter + duration histogram on FastAPI
  (`/metrics` endpoint); expanded prometheus scrape targets for all workers;
  5xx ALB alarm in monitoring module.
- **MLflowService:** Thin wrapper for model tracking, registry, and promotion from
  Staging to Production; production URI retrieval.
- **ML training pipeline:** `run_training_pipeline()` Celery task with Optuna
  hyper-parameter optimisation, XGBoost training, NDCG evaluation, promotion gate
  (default 0.3). Terraform workspace module for MLflow (RDS, S3, KMS).
- **Scraper worker:** Full implementation replacing NotImplementedError stub.
  Reads scrape_sources from Supabase, dispatches to Seek/Indeed/Jora stub adapters,
  chains to process_raw_job via Celery, records success/failure in
  ScraperHealthMonitor, respects source quarantine.
- **Prune audit logging:** DataPruner now writes audit records to Supabase
  `prune_audit` table; `get_prune_summary()` for admin API consumption.
- **Celery beat schedule:** Explicit schedule with 3 tasks — verify-and-prune-jobs
  (6h), scrape-all-sources (1h), retrain-match-model (24h).
- **CI/CD pipeline:** Added Python backend test job (ruff lint + mypy + pytest)
  in ci.yml; full staging→production CD pipeline with terraform validate, docker
  build+scan, helm deploy, smoke test, manual approval gate; release workflow
  with auto-changelog and version-tagged Docker images.
- **PR review workflow:** Python lint + type-check job for PR reviews.
- **Docs cover generator:** Added "Generated Assets" section to docs/README.md
  with cover image regeneration instructions.
- **Dockerfile:** Multi-stage production/dev build with HEALTHCHECK.

### Added (2026-06-06 — Phase 2: Backend data/security hardening)

- **Backend contracts ADR:** `docs/adr/2026-05-30-backend-contracts.md` — canonical
  schemas, cache key naming convention, event versioning.
- **Event versioning:** Added `version` field to `BaseEvent`; `EventSubscriber`
  version checking with `_KNOWN_VERSIONS` dict.
- **Durable event outbox:** `backend/src/services/outbox.py` — Supabase-backed
  outbox with emit, fetch_pending, mark_delivered, mark_failed, fetch_failed,
  backfill. Migration `202606060001_event_outbox.sql` with status enum + indexes.
- **`EventPublisher.emit_durable()`:** Writes events through outbox before publishing.
- **Vector store versioning:** `_version` payload field on Qdrant points;
  `reindex_all()`, `count_stale_points()`, `get_versions_for_cache_invalidation()`.
- **Redis rate limiter:** Sliding-window sorted-set implementation; auto-selection
  via `RATE_LIMITER_BACKEND=redis` env var.
- **Cache fix:** Replaced deprecated `setex` with `set(..., ex=ttl)`.
- **Worker topology:** Per-queue Celery workers (default, scraper, processing,
  notifications) with `task_reject_on_worker_lost`, explicit retry/backoff
  policies. Updated docker-compose.yml.
- **Apple sign-in enabled:** `APPLE_AUTH_ENABLED = true` in login-config.ts.
- **Logout cleanup:** `signOutAndRedirect` now clears SecureStore tokens + Supabase
  session + TanStack Query cache.
- **Callback robustification:** Handles OAuth cancellation, provider errors,
  stale direct visits, improved error messages.

### Changed

- **Backend tests:** 281 passing (was 266, +15 new MLflow/training tests).
- **Mobile tests:** 209 passing (1 pre-existing JobForm failure, unrelated).
- **Mobile typecheck:** 0 TypeScript errors.
- **MLflow tracking URI:** Default changed from `file:./mlruns` to
  `sqlite:///mlruns.db` to avoid MLflow 2.18+ filesystem deprecation.
- **Dockerfile:** Proper layer caching (deps first, source second), multi-stage
  production/dev targets, HEALTHCHECK.

### Added (2026-05-28 U3 — Auth and session management)

- **PKCE auth callback:** `lib/authCallback.ts` with `exchangeCodeForSession`, token fallback, URL parsing, and retry UI on `(auth)/callback`.
- **OAuth flow:** Google uses `skipBrowserRedirect` + `WebBrowser.openAuthSessionAsync` with in-session callback completion.
- **Apple Sign-In stub:** Disabled until App Store credentials (`APPLE_SIGN_IN_ENABLED` flag in login screen).
- **Tests:** 9 authCallback unit tests; AuthProvider signOut + SIGNED_OUT coverage; corrected profile fetch mock shape.

### Added (2026-05-28 U1 — Monorepo scaffold)

- **pnpm workspace:** Root `package.json`, `pnpm-workspace.yaml`, `.npmrc` with Expo/RN hoist settings; scripts `dev:mobile`, `test`, `lint`, `typecheck`.
- **`apps/mobile`:** Expo SDK 52 + Expo Router + TypeScript + NativeWind v4 (`app.config.ts`, `babel.config.js`, `tailwind.config.js`, `global.css`, `vitest.config.ts`); Supabase client at `lib/supabase.ts` (SecureStore adapter); env template at `.env.example` matching STACK § Environment Variables Matrix.
- **`packages/shared`:** `@hi-hired/shared` with Zod schemas, constants, types; Vitest unit tests for profile and job schemas.
- **CI:** `.github/workflows/ci.yml` — Node 20, pnpm install, typecheck, lint, vitest (35 tests).
- **Maestro stub:** `apps/mobile/.maestro/README.md` pointing to TESTING_STRATEGY (flows land in U8).

### Added (2026-05-28 Full Pre-Scaffold Docs State)

- **OSS Hygiene (MUST tier, Structure B root only):** Full LICENSE (MIT + AU Victorian law + Fair Work/Privacy/DDA note), CONTRIBUTING.md (agent-orchestrated lanes table from CLAUDE.md + exact Supabase agent_logs gate + PR checklist + dispatch examples), CODE_OF_CONDUCT.md (Contributor Covenant v2.1 + explicit AU DDA/anti-discrimination for swipe hiring + beachhead inclusive hiring), SECURITY.md (PII classification for jobseeker swipes/matches/profiles + Privacy Act notifiable breaches + App Store + ARCH CRITICAL gaps + 2026 MCP citations), CHANGELOG.md (this file; keep-a-changelog seeded with pre-0.1 audit/plan entries).
- **AGENTS.md (MUST, root):** Practical "how we run swarms here" guide. Specialist lanes table (alex/jordan/dev/sam/maya + Discord IDs + domains per CLAUDE.md + design spec), routing (openclaw agent, /alex Telegram shortcuts, ruflo swarm-init with anti-drift), mandatory logging gate (exact curl + per-card examples), parallel authoring (this dispatch package itself as example), anti-drift rules, references to swarm-dispatch-2026-05-28-full-docs.md, design spec § "Swarm Execution Model", gap §7 mini plan, CONTRIBUTING, ruflo skills. Use for future gap refresh, code tasks, quarterly re-audit.
- **.github/ Templates (MUST, sam + jordan):** ISSUE_TEMPLATE/bug_report.md, feature_request.md, doc_update.md, legal_update.md + PULL_REQUEST_TEMPLATE.md. All with project-specific checklists: "Docs updated? (gap §6 / manifest / STACK / BACKEND)", "a11y verified? (WCAG 2.2 AA + DDA)", "RLS / Edge / security reviewed?", "Sources cited with 2026 dates? (MCP/browser/gap)", "agent_logs row inserted for any agent work?", "Tested per TESTING_STRATEGY + new stack docs?". Enforces audit/agent/logging/compliance standards.
- **Index Updates (MUST rows 41-43):** root README.md, docs/README.md, foundational-docs/README.md all enhanced with "Full docs complete 2026-05-28" pointers, Structure B navigation (root hygiene + docs/ layered depth + foundational/ history), zero-blockers test references, citations to gap/design/dispatch/AGENTS, "Next Step" expanded. Consistent voice with tables, authority notes, DRY cross-refs.
- **Supporting (from prior swarm artifacts, 2026-05-28):** docs/research/gap-analysis-2026-05-28.md (exhaustive 35-file catalog, architecture map, ~48 required set, tiers, 8 detailed outlines with MCP/browser facts, mini swarm plan, sources), required-docs-manifest.md (living table, all MUST status updated on authoring), docs/stack/ (EXPO_ROUTER... + SUPABASE_RLS... stubs expanded per outlines), docs/legal/ (AU_FAIR_WORK + PRIVACY stubs), docs/ops/MIGRATION_RUNBOOK..., docs/api/EDGE_FUNCTIONS_CONTRACTS... (stubs per gap §9).

All per **swarm coordinator + QA/documentation agent (orchestrator + sam lanes)** execution of dispatch package DOC-007 (AGENTS), DOC-011 (root hygiene batch), DOC-012 (.github templates), DOC-008 (manifest), design spec 2026-05-28 §1 (Hygiene & OSS / Agent Foundations + detailed SECURITY/AGENTS/CONTRIBUTING requirements), § "Swarm Execution Model" (lanes + gate + parallel + anti-drift + verification), gap-analysis-2026-05-28.md §3 (complete set), §5 (MUST hygiene + AGENTS + indexes), §6 Outline 7 (AGENTS), §7 (mini swarm plan + logging gate), §8 (2026 citations: Context7 expo_dev 86.3 / supabase 82.6 2026-05-28; cursor-ide-browser fairwork 2026-05-27 511 refs/117 interactive; local Glob/Read/Grep/Shell), §9 (artifacts + index updates), CLAUDE.md (specialist lanes table + mandatory agent_logs gate + OpenClaw routing + Discord channels + default stack), and existing canonical authority (STACK, BACKEND, foundational-docs/README, root README Doc Map).

**Structure B locked (design spec § "Locked decisions"):** Root = hygiene files (8) + canonical pointers only (slim README, STACK, existing high-authority). All living depth in `docs/{research/, stack/, legal/, ops/, api/, testing/, analytics/, security/, a11y/, plans/}`. foundational-docs/ = immutable history/strategy (2026-05-28 pointers only; no content changes except 04-legal note). DRY by design (reference canonicals + gap outlines; never duplicate schema/flows/MVP).

**Zero blockers achieved for "Next Step" follower:** New dev/agent reads root README (Next Step + 2026-05-28 audit) + gap + manifest + AGENTS + CONTRIBUTING + 3-4 key files (STACK + BACKEND + 02-mvp + 1 legal + 1 stack-deep) = can scaffold + migrate + implement U1 without external hunting or re-research. All 2026 facts cited verbatim with timestamps/sources.

See [docs/research/required-docs-manifest.md](docs/research/required-docs-manifest.md) (rows 1-10, 41-43 now "full 2026-05-28 by sam/orchestrator via swarm") and gap §6 "Implemented" appends for per-outline status.

### Changed

- **Documentation Architecture (Structure B):** Flattened root sprawl (20+ MDs) consolidated; new layered `docs/` subdirs for scalability; hygiene extracted to root/.github (standard OSS discoverability + auditability for App Store/compliance). See gap §4 rationale vs alternatives (A flat, C persona).
- **Agent DNA Formalized:** AGENTS.md + hygiene templates now encode OpenClaw specialist model + ruflo parallel + mandatory Supabase logging gate (non-negotiable per CLAUDE.md workspace rule) + anti-drift enforcement. This swarm (dispatch package + design + gap) is the canonical example of parallel authoring.

### Deprecated / Superseded

- None in this hygiene release (pre-code). See STACK.md "Legacy & Superseded" and foundational-docs/README "Intentional divergences" for prior (SPEC/MOBILE/Next.js/Capacitor/OneSignal/Playwright refs).

## [0.0.1] - 2026-05-27 (Planning / Pre-Build Audit Baseline)

### Added

- Exhaustive gap analysis + research (gap-analysis-2026-05-28.md baseline): 35 existing MDs cataloged via Glob/Read/Grep/Shell (lengths, mods 2026-05-27 cluster, authority, self-reported gaps via 80+ "superseded/deferred/adapt" banners); architecture map; complete ~48-file required set; proposed Structure B; tiered MUST (12+ hygiene + stack-deep 2026 from MCP + legal 2026 from browser + ops + API + indexes) / SHOULD / NICE; 8 detailed outlines for highest-priority MUST with verbatim 2026 research facts (Context7 expo_dev 86.3 + supabase 82.6 2026-05-28; cursor-ide-browser fairwork.gov.au/ 2026-05-27 snapshot 511 refs/117 interactive pay/wages/calculator/guides/award finder for hospitality beachhead; ARCH CRITICAL race/notif/consent gaps); mini swarm plan (Approach 2 Parallel, 4-6 agents, OpenClaw/ruflo, logging gate); sources §8.
- required-docs-manifest.md (living baseline table, owners per CLAUDE lanes, status "missing/outline/exists", cross-refs to gap §6).
- Stubs + dirs for MUST authoring (docs/research/, stack/, legal/, ops/, api/ per gap §9).
- Index updates (partial): root/README "Pre-build docs audit complete 2026-05-28" + Next Step pointers to gap + manifest; docs/README full structure + "Start here"; foundational-docs/README "2026-05-28 Pre-Build Docs Audit" section + 04-legal pointer + gap links (authority guide preserved).
- Canonical refresh (2026-05-27 burst): STACK.md (Expo 52+ RN TS, Router, Supabase, TanStack v5, Zustand, RHF+Zod, monorepo, env 3 projects, deploy, testing, legacy list; supersedes SPEC/MOBILE), docs/BACKEND.md (933ln schema/ERD/RLS/Edge/notification_queue per ARCH fixes, migrations, storage, auth adapt), ARCHITECTURE_AUDIT.md (CRITICAL match race + notif fire-and-forget + consent flag Privacy violation), foundational-docs/ updates + authority guide, plans/2026-05-27-001 (current Expo MVP impl plan 697ln).
- 2026 MCP/browser research (cited throughout): Context7 (expo_dev notif/router/haptics exact code v55/56; supabase RLS/Edge/queues/storage/realtime patterns), cursor-ide-browser (fairwork home snapshot + 404 legacy pay URL + pay emphasis for beachhead cards).

### Changed

- Authority declarations strengthened (STACK as single source for tech/monorepo; BACKEND for schema/RLS/Edge/migrations; foundational-docs/README as strategy history map with "when in doubt" table + intentional divergences resolved; root README Doc Map + "Start Here" + "Next Step").
- Self-audit culture explicit (banners for superseded/stale/deferred/adapt in 10+ files; Grep-confirmed).

### Removed / Archived

- Stale Next.js/Capacitor plans (2026-05-26 impl plan, superpowers/ duplicate) noted as superseded (verify vs new STACK + plans/2026-05-27-001).

**Sources for 0.0.1 baseline:** gap-analysis-2026-05-28.md §1 (35-file catalog via 2026-05-28 Glob/Read/Grep/Shell), §8 (MCP/browser/local tool citations with exact timestamps/paths), design spec 2026-05-28 (locked Structure B + Approach 2 + Full scope + zero-blockers test), swarm-dispatch-2026-05-28-full-docs.md (cards + gate + launch), CLAUDE.md (lanes + gate + stack defaults), existing canonicals (first 100-250 lines each).

---

**Pre-0.1.0 History (condensed from plans/2026-05-26, foundational-docs/ 00-07, obstacle-analysis, MELBOURNE_STRATEGY, ASURIA, RESEARCH_INTEL, PITCH_DECK, PRD, BUSINESS_MODEL, etc.):** Concept refinement (vision for swipe-based local casual jobs with transparent pay, no keywords/resumes, bilateral opt-in, beachhead Melbourne north, Asuria/DES hooks, compliance-first); initial Next.js + Capacitor + OneSignal + bilateral match model (superseded 2026-05-27 by Expo RN + employer-init + queue per ARCH + STACK); strategy memos, validation plans, risk registers, obstacle analysis (Sidekicker competitor, data model expires_at gap); 2026-05-27 architecture audit + impl plan refresh locking Expo monorepo, Supabase Sydney, 2026 MCP research, pre-code MUST docs (this hygiene release closes the gap).

*See foundational-docs/ for full historical narrative (immutable per its README authority guide). All 2026-05-28 work DRY-references these + gap/design/dispatch.*

---

**Next (post this 2026-05-28 full hygiene/AGENTS/indexes state):** Human review + legal/compliance signoff on AU docs (alex lane + external if needed); verify all agent_logs rows; update manifest/gap §6 "Implemented 2026-05-28 by <lane> via DOC-00X"; optional archive superseded to foundational-docs/archive/ or docs/archive/; "Scaffold approved" signal; run monorepo init per docs/ops/MIGRATION_RUNBOOK + STACK + new stack-deep docs. Re-audit on major (new Expo SDK, Fair Work amendments, Privacy Act changes). See dispatch package "Final Synthesis Step" + design spec verification checklist (new dev/agent zero blockers test).

*Maintained 2026-05-28 onward. Update on every authoring (append to Unreleased + bump manifest/gap). Human + orchestrator gate before v0.1.0.*