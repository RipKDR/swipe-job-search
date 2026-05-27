# Hi-Hired Complete Organized Documentation Set — Design Spec

> **For agentic workers:** REQUIRED: Read the full source of truth [docs/research/gap-analysis-2026-05-28.md](../research/gap-analysis-2026-05-28.md) (especially §1-8, the 8 detailed outlines in §6, the mini swarm plan in §7, and §8 citations from Context7 MCP 2026-05-28 and cursor-ide-browser) + [docs/research/required-docs-manifest.md](../research/required-docs-manifest.md) + [foundational-docs/README.md](../../foundational-docs/README.md) authority guide + canonical [STACK.md](../../STACK.md) and [docs/BACKEND.md](../BACKEND.md) before any authoring or dispatch. All swarm or specialist agents (alex/maya/jordan/dev/sam via OpenClaw/ruflo per CLAUDE.md) MUST insert a row into the Supabase `agent_logs` table (exact curl in CLAUDE.md and gap §7) with `status: "completed"` (or "failed") *before* sending any final reply or Discord post. This spec is the formal design artifact from the 2026-05-28 interactive design session. Next step after user approval of this spec: invoke writing-plans skill to produce the bite-sized swarm execution plan. Use superpowers:subagent-driven-development for parallel authoring where possible.

**Goal:** Author and validate a complete, current, organized documentation set (~48 Markdown files total) implementing locked Structure B such that any new developer or specialist agent following the root README "Next Step for Developers" + gap-analysis + manifest + 3-4 key files has **zero knowledge blockers** from missing, outdated, scattered, or non-2026 content before monorepo scaffold or any application code begins. All MUST-tier items (hygiene + 4 stack-deep 2026 references from MCP + 2 legal from browser research + migration runbook + API contracts + indexes + this audit) must be complete and current; SHOULD tier ready for first dev sprint.

**Architecture:** Layered by concern (Structure B, locked 2026-05-28 design session; see gap-analysis-2026-05-28.md §4 for diagram and rationale). Root contains *only* hygiene files (LICENSE, CONTRIBUTING.md with agent routing + logging gate, CODE_OF_CONDUCT.md, SECURITY.md, CHANGELOG.md, AGENTS.md) + canonical pointers (slim README.md, STACK.md, existing high-authority like ARCHITECTURE_AUDIT.md). All living depth and implementation references live in `docs/{research/, stack/, legal/, ops/, api/, testing/, analytics/, security/, a11y/, plans/}` with dated files, sub-indexes (e.g. docs/README.md), and research-notes/ for raw pulls. `foundational-docs/` (at workspace root) remains *immutable history* for strategy/"why" (per its excellent authority guide table and "intentional divergences" section; 2026-05-28 updates only add pointers per gap §9). DRY by design: never duplicate schema (point to BACKEND.md), MVP scope (point to foundational-docs/02-mvp-definition.md), or high-level decisions (point to STACK.md and gap §1 catalog).

**Tech Stack / Docs Stack:** Pure Markdown (GitHub-flavored; heavy use of tables for decisions/authority/cross-refs, ASCII architecture diagrams, fenced code blocks for SQL/TSX/Edge Function examples, status banners like `> **Status:** ...`). Citations are mandatory and verifiable (inline with tool/MCP dates/paths per gap §8: "Context7 /websites/expo_dev benchmark 86.3 2026-05-28", "cursor-ide-browser fairwork.gov.au/ snapshot 2026-05-27 117 interactive refs"). Cross-references use relative paths (e.g. `[../STACK.md](../STACK.md)`, `[gap-analysis-2026-05-28.md §6 Outline 1](../research/gap-analysis-2026-05-28.md#outline-1-expo...)`). Maintenance via living `required-docs-manifest.md` table + gap re-audit triggers (quarterly or on major SDK/Fair Work change). No build step, no external JS (consistent with OpenClaw dashboard/index.html pattern and existing canonicals). All new files follow the voice of STACK.md, BACKEND.md, gap-analysis, and foundational-docs/README.md (authoritative, table-driven decisions, explicit "when docs disagree this wins", "new dev has zero blockers" success criterion).

---

## Executive Summary + Locked Decisions

This design spec formalizes the output of the 2026-05-28 interactive design session for the Hi-Hired pre-build documentation set. It closes the exhaustive gaps identified in the 2026-05-28 gap-analysis (35 existing MDs totaling ~6,769 lines via Glob/Read/Grep/Shell on 2026-05-28; strong self-audit culture with banners and authority tables already present in canonicals; critical pre-code holes in OSS hygiene, 2026 stack-deep references, AU compliance legal, ops runbooks, API contracts, swarm/agent guidance, and fresh research/intel).

**Locked decisions from the 2026-05-28 interactive design session (this spec implements them exactly):**
- **Structure: B** — Layered by concern (root = hygiene + canonical pointers only; all living depth in `docs/{research,stack,legal,ops,api,testing,swarm...}`; `foundational-docs/` remains immutable history). See gap §4 for full rationale, diagram, and comparison to alternatives (A: flat; C: persona-based).
- **Execution: Approach 2 — Parallel Swarm (fastest).** Use the mini swarm plan already detailed in gap-analysis-2026-05-28.md §7. All agents must hit the mandatory Supabase `agent_logs` gate (CLAUDE.md + gap §7). Specialists: alex (research/legal), jordan (arch/backend/api/ops), dev (impl/adapt), sam (qa/testing/a11y/analytics), maya (UX polish), swarm coord (ruflo/OpenClaw parallel dispatch + monitor).
- **Scope: Full.** MUST + SHOULD tiers must be complete and current (per gap §5 tiers and required-docs-manifest.md) *before any monorepo scaffold or code begins*. NICE deferred post-MVP or low-priority. No partials; zero blockers test is the gate.

The target end state (after swarm authoring per this spec + gap §7): ~48 files (net +13 from current 35), clean hierarchy, 2026-fresh (MCP/browser citations locked), auditable, agent/human-developer friendly, DRY (references existing canonicals + gap outlines), with "Next Step" follower able to proceed to scaffold with zero external research or hunting. All per CLAUDE.md OpenClaw specialist model and workspace rules.

See gap-analysis-2026-05-28.md §1 (exhaustive 35-file catalog with lengths/mods/authority/gaps), §2 (architecture map, overlaps minimal, contradictions resolved), §3 (complete ~48 set rationale), §8 (all tool/MCP/browser citations 2026-05-28), and §9 (artifacts already stubbed: dirs + 6 outline stubs + manifest + gap + index updates).

## Current State vs Target (Structure B)

**Current state (2026-05-28, per Glob **/*.md + batch Read + Grep + Shell wc/ls/git in gap §1):** 35 Markdown files (~6,769 lines). Strong foundation in canonicals (README 84ln, STACK 250ln, BACKEND 933ln, foundational-docs/02-mvp 158ln + its README authority guide 49ln, ARCHITECTURE_AUDIT 147ln, PROJECT_CONTEXT). Recent 2026-05-27 planning burst (docs/plans/2026-05-27-001 697ln good). Self-audit excellent (10+ "superseded/deferred/adapt" banners + authority tables in STACK/foundational-docs/README/BACKEND/ root README). UX/domain files (AUTH 234ln, NOTIF 275ln, GUARDRAILS 99ln, etc.) exist but thin/outdated refs. Legal (04-legal 186ln) and research (MELBOURNE 20ln, RESEARCH_INTEL 46ln) pre-2026 or thin. Zero OSS hygiene (.github/, LICENSE, CONTRIBUTING, etc.). No dedicated 2026 stack-deep (only "adapt" notes), no ops runbooks, no standalone API contracts, no swarm/AGENTS.md despite OpenClaw/CLAUDE.md model, flat root sprawl (20+ MDs at root). Docs/ subdirs partially populated (BACKEND, plans/, research/ with gap+manifest+stubs, stack/legal/api/ops with outline stubs from gap artifacts). See docs/README.md (already reflects proposed structure post-audit) and gap §2 for hierarchy diagram.

**Target state (post-Full authoring per this spec):** 
- Root: hygiene (8 files: LICENSE + CONTRIBUTING with agent lanes + gate + PR checklist, CODE_OF_CONDUCT AU+DDA, SECURITY PII, CHANGELOG keep-a, .github/ISSUE_TEMPLATE/* + PULL_REQUEST_TEMPLATE with docs/a11y/RLS/source-cite checks, AGENTS.md) + canonical pointers only (slim README updated with gap link, STACK, existing high-authority).
- `docs/`: central index (README.md, already good), BACKEND (keep), ARCHITECTURE_AUDIT (keep), plans/ (dated 2026-05-27-001 keep; old archived), + subdirs: research/ (gap, manifest, 2026 competitor/market/validation intel, research-notes/ raw MCP pulls), stack/ (4+ deep 2026 refs from Context7 2026-05-28), legal/ (2+ AU compliance from browser 2026-05-27 + anti-discrim/Asuria), ops/ (migration runbook + EAS + incident + retention), api/ (Edge contracts + auth flows), testing/ (expanded), analytics/, security/, a11y/ (new/expanded from GUARDRAILS/TESTING).
- `foundational-docs/`: untouched except pointer updates (per gap §9 and its own README "2026-05-28 Pre-Build Docs Audit" section).
- Total: ~48 files; all MUST current; indexes point to gap §6 outlines for authors; "zero blockers" achieved.

**Transition:** Swarm authoring (Approach 2, gap §7) produces the delta. No changes to STACK/BACKEND/app code (docs only). Post-authoring: human compliance signoff on legal/, update manifest/gap with "Implemented 2026-05-XX by <agent per spec>", optional archive of superseded (SPEC/MOBILE/old plans) to foundational-docs/archive/.

See gap §4 (proposed structure + rationale vs sprawl), §5 (tiered prioritization), required-docs-manifest.md (full table with owners/status/cross-refs), and docs/README.md (current index reflecting Structure B).

## Scope (Full: MUST + SHOULD)

**MUST (blockers for scaffold; ~12-15 files + this spec + 3 index updates; complete before any code; 1-3 days parallel swarm per gap §7):**
- Hygiene (root): LICENSE, CONTRIBUTING.md (agent routing /alex etc + supabase agent_logs gate per CLAUDE + PR checklist), CODE_OF_CONDUCT.md (AU DDA), SECURITY.md (PII jobseeker swipes/matches + breach + App Store), CHANGELOG.md (keep-a-changelog + pre-0.1 entries), .github/ISSUE_TEMPLATE/{bug,feature,doc,legal}.md + PULL_REQUEST_TEMPLATE.md (docs/a11y/RLS/ sources cited checks), AGENTS.md (swarm/OpenClaw usage + logging gate + ruflo).
- Stack-deep 2026 (docs/stack/): EXPO_ROUTER_AUTH_NOTIFS_HAPTICS_2026.md (Context7 expo_dev 86.3 2026-05-28), SUPABASE_RLS_EDGE_STORAGE_REALTIME_JOBS_2026.md (supabase 82.6), TANSTACK_QUERY_ZUSTAND_RHF_ZOD_RN_2026.md, EXPO_NOTIFICATIONS_EDGE_PROCESSOR_2026.md.
- Legal 2026 (docs/legal/): AU_FAIR_WORK_PAY_TRANSPARENCY_CASUAL_2026.md (cursor-ide-browser fairwork.gov.au/ 2026-05-27 snapshot 117 refs), PRIVACY_ACT_RECRUITMENT_JOBSEEKER_DATA_2026.md (ARCH missing consent flag); StrReplace update to foundational-docs/04-legal-data-sources.md (pointer + archive note post-v1).
- Ops: docs/ops/MIGRATION_RUNBOOK_FROM_BACKEND.md (from BACKEND § + ARCH fixes).
- API: docs/api/EDGE_FUNCTIONS_CONTRACTS.md (extract BACKEND + MCP + ARCH for match-notify/processor/auth hooks; TS/OpenAPI).
- Audit artifacts + indexes: this design spec, required-docs-manifest.md (already), gap-analysis (already), docs/README.md (already reflects), root README.md update (gap link in Next Step), foundational-docs/README.md update (gap pointer + 04-legal note).
- Stubs/dirs already created in gap §9 artifacts (research/, legal/, stack/, ops/, api/, research-notes/).

**SHOULD (unblock first dev sprint/launch; parallel early impl):**
- Ops: EAS_BUILD_DEPLOY_CHECKLIST.md, INCIDENT_RESPONSE_MATCHES_NOTIFICATIONS.md (ARCH CRITICAL), DATA_RETENTION_PURGE_PLAN.md.
- Research: COMPETITOR_ANALYSIS_2026_SEEK_INDEED_AU_LOCAL.md, MELBOURNE_NORTH_SUBURBS_JOB_MARKET_2026.md (signals + ABS/Seek sources), VALIDATION_DATA_SOURCES_2026.md.
- Expand/adapt: POSTHOG_ANALYTICS_TAXONOMY_RN_IMPL.md, SENTRY_RN_PERF_MONITORING.md, update TESTING_STRATEGY.md + GUARDRAILS.md (RN/Maestro/@axe-core/react-native + MCP haptics), AUTH_FLOWS_EXPO_2026.md, ACCESSIBILITY_AUDIT_CHECKLIST.md (WCAG 2.2 AA + AU DDA/DES).
- Swarm: docs/swarm/OPENCLAW_RUFLO_CLAUDE_FLOW_USAGE.md (or integrate into AGENTS.md; dispatch examples, anti-drift, logging).

**NICE (post-MVP/completeness):** Full ruflo playbooks, more competitor dives, Resend details, future admin patterns, quarterly audit script, .github/AGENT_TASK_TEMPLATES/.

**Rationale/DRY (per gap §3/5 and required-docs-manifest.md):** Prioritizes "prevent hunting" + compliance (Fair Work pay transparency for beachhead hospitality/retail cards; Privacy Act consent for jobseeker PII/swipes/matches per ARCH CRITICAL) + reliability (notif queue per ARCH) + agent scale (AGENTS + swarm guide). Many items "build on X + MCP cite 2026-05-28 + gap outline" — no duplication of BACKEND schema/ERD or 02-mvp scope. Total grows to ~48; re-audit on major changes. See full table + owner/status in required-docs-manifest.md (baseline 2026-05-28); update on every authoring.

**Out of scope for this design (and pre-scaffold):** Any app code, monorepo scaffold, migrations, UI implementation, or NICE items. This spec + gap §7 swarm produces the docs delta only.

## Detailed Design for Each Major Area

Designs below expand the 8 outlines from gap-analysis-2026-05-28.md §6 (primary source; DRY — do not duplicate the outlines here). Each includes: purpose/rationale (tied to zero-blockers + specific risks from ARCH/gap §1), key 2026 research facts (cited with MCP dates/paths per gap §8), structure/sections (prose + examples), trade-offs considered (and why chosen), acceptance criteria (measurable; ties to "new dev/agent zero blockers" test), owner, cross-refs. All follow Structure B location rules and existing voice (tables, banners, exact relative links, "when in doubt" notes).

### 1. Hygiene & OSS / Agent Foundations (MUST; root + .github/)

**Rationale:** Current project has zero standard hygiene (0 .github/ MDs per Glob 2026-05-28; gap §1/3). Blocks contrib, audit (App Store, compliance), and agent routing (OpenClaw specialists per CLAUDE.md workspace rules). AGENTS.md + CONTRIBUTING close the "swarm usage" gap despite existing specialist model. Prevents "hunt for how to dispatch alex" during impl.

**Key facts (gap §1 catalog + CLAUDE.md):** 35 files, no hygiene; CLAUDE.md mandates agent_logs curl for every specialist (alex etc) before final; Discord channels documented; routing shortcuts /alex <task>.

**Structure (expand per gap §6 Outline 7 + manifest #1-10,19):**
- LICENSE (MIT or Apache-2 + AU notes).
- CONTRIBUTING.md: project principles (mobile-first, transparent pay, bilateral opt-in from root README), agent routing table (specialists + Discord IDs from gap §7/CLAUDE), mandatory logging gate (full curl example + "status: completed/failed; failed still log"), PR process (checklist: docs updated? a11y? RLS verified? sources cited? per gap), monorepo layout pointer to STACK.
- CODE_OF_CONDUCT.md (Contributor Covenant + AU Disability Discrimination Act / anti-discrimination hooks for hiring swipes).
- SECURITY.md (PII classification for jobseeker swipes/matches/profiles/experience, breach notification per Privacy Act, vuln reporting, App Store reqs).
- CHANGELOG.md (keep-a-changelog format; seed with 2026-05-27 audit/plan entries from gap).
- .github/ISSUE_TEMPLATE/ (bug_report.md with "docs affected?" + "RLS impact?"; feature_request.md; doc_update.md; legal_update.md with compliance checklist).
- .github/PULL_REQUEST_TEMPLATE.md (checkboxes: "Updated relevant docs? (gap §6)", "a11y reviewed?", "RLS/Edge verified?", "Sources cited with 2026 dates?", "agent_logs inserted if specialist?").
- AGENTS.md (or docs/swarm/...): specialist lanes table (alex research/legal/Discord 1503111680945557614 etc per gap §7), dispatch examples (openclaw agent or ruflo swarm-init), logging gate mandatory, anti-drift rules, how to use for future gap refresh or code tasks. Cross gap §7.

**Trade-offs:** Minimal templates (fast) vs comprehensive with agent/RLS/a11y checklists (prevents defects at scale) — chose comprehensive (agent-heavy project + compliance beachhead). Location: root for hygiene (standard OSS discoverability); AGENTS.md at root or docs/swarm/ per Structure B (living ops guidance).

**Acceptance criteria:**
- All 8+ files exist at exact paths in manifest.
- New contributor/agent reads CONTRIBUTING + AGENTS + root README, can dispatch /alex or swarm task and knows to log to Supabase before reply.
- PR template enforces doc/RLS/source hygiene (auditable in reviews).
- No placeholders; all examples cite gap/CLAUDE 2026-05-28.
- Reviewed by jordan (arch) + human (legal).

**Cross-refs:** gap-analysis-2026-05-28.md §3/5/6/7 (outlines + swarm + owners), required-docs-manifest.md rows 1-10/39, CLAUDE.md (full gate + lanes), root README "Next Step", foundational-docs/README.md authority.

**Owner:** jordan (arch + swarm) + human (legal signoff); sam (PR templates).

### 2. Stack-Deep 2026 References (MUST; docs/stack/)

**Rationale (gap §1/5/6):** Existing AUTH/NOTIF/GUARDRAILS/STACK have only high-level "adapt from Next/Capacitor/OneSignal" notes (2026-05-27). MCP Context7 research 2026-05-28 (expo_dev 86.3 + v55/56, supabase 82.6) provides exact current patterns for Expo Router auth/notifs/haptics + Supabase RLS/Edge/queues/Realtime/Storage for the jobs/swipes/matches domain model. Prevents hunting + non-compliant or unreliable impl (ARCH CRITICAL notif race). TANSTACK etc for optimistic swipe UX. These unblock U1 (auth/onboarding/swipe per 2026-05-27 plans).

**Key facts from research (cited; gap §6 Outlines 1-2 + §8):** 
- Expo: registerForPushNotificationsAsync (EAS projectId required, physical device, Android channels MAX), useNotificationObserver hook (exact: if (data.url) router.push(url)), haptics (selectionAsync on deck, notificationAsync Success/Error on swipe right/left, impactAsync variants; MCP exact button code), Expo Router auth groups + deep links "hi-hired://" + SecureStore adapter for @supabase/supabase-js (PKCE magic/Google/Apple, app/auth/callback.tsx).
- Supabase: RLS multi-tenant patterns (profiles auth.uid()=id; jobs public-active or employer; swipes candidate-own; matches pair-only via policy/function; adapt is_room_participant), pgmq queue Edge processor (exact TS Deno.serve consume loop with read/delete RPC), storage policies (avatars public-read + owner-insert; jobs-photos), realtime postgres_changes + auth (RLS on realtime.messages).
- Other: TanStack Query v5 + Zustand + RHF+Zod RN patterns for swipe optimistic (from STACK decision).

**Expanded structure (per outlines 1-2 + manifest 11-14,33; full prose + examples, not stubs):**
- Intro banner: "2026 patterns (SDK 52+/v55/56) for Expo RN TS + Supabase jobs domain. Replaces 'adapt' notes. Cite: Context7 2026-05-28."
- Sections for each (Router/auth/notifs/haptics; RLS/Edge/Storage/Realtime; TanStack/RN state; Notif Edge processor; monorepo/env/gotchas; testing with Vitest/RTL/Maestro).
- Full code examples (from MCP + adapt existing), gotchas (physical device for push, cold starts use queue per ARCH, iOS background AppState suppress, unique 23505 ignore for match race), RN client init with SecureStore.
- Compliance note: pay transparency fields (cross legal/), a11y haptics (cross GUARDRAILS).

**Trade-offs:** Concise "see MCP" links (fast write) vs self-contained prose + examples (zero blockers for new dev/agent who may not re-run MCP) — chose self-contained (per goal + "new dev has zero blockers" test). Location docs/stack/ (Structure B, parallel to BACKEND.md depth).

**Acceptance criteria:**
- 4 files exist at exact manifest paths; each 200-400+ lines with cited examples.
- Agent reads EXPO_ + SUPABASE_ + STACK + BACKEND, can implement token reg + swipe haptics + match atomic insert + notif processor without external search or re-calling Context7.
- Examples compile/run conceptually (Vitest/Maestro notes); cite exact MCP snippets/dates.
- Cross-refs accurate (no broken relative links).
- Reviewed by jordan + dev; sam (testing section).

**Cross-refs:** gap §6 Outlines 1/2/6/8 + §8 (MCP exact), STACK §Mobile/App/Env/Testing, BACKEND (device_tokens, notification_queue, Edge specs, match logic atomic), ARCH CRITICAL1/2, GUARDRAILS (haptics/a11y), 02-mvp (push in MVP), new API_CONTRACTS + MIGRATION_RUNBOOK, docs/README.md stack section, required-docs-manifest rows 11-14/33.

**Owner:** jordan (primary arch) + dev (RN/impl examples); review sam (tests).

### 3. Legal & Compliance 2026 (MUST; docs/legal/)

**Rationale (gap §1/5/6 Outlines 3/4):** 04-legal (186ln) + GUARDRAILS cover data sourcing but miss 2026 Fair Work pay transparency/casual specifics (browser snapshot 2026-05-27: 511 refs/117 interactive, prominent Pay Calculator/Guides/award finder for hospitality/retail beachhead) and Privacy Act recruitment obligations (ARCH CRITICAL: missing bulk_swipe_consent flag on profiles = violation at launch for jobseeker PII/experience/skills/availability/swipes/matches). App Store + Asuria/DES + DDA requirements for swipe hiring UX. Unblocks employer posting + seeker cards + onboarding without compliance risk.

**Key facts (cited; cursor-ide-browser fairwork.gov.au/ 2026-05-27 + ARCH + 04-legal + OAIC guidance):** Home snapshot shows "Pay and wages" (e9), "Pay Calculator" (e10), "Pay guides" (e12), "Find my award" (e52), sectors (fast food e21, hospitality, small business e30, visa e31); 404 on legacy /pay contracts URL (structure changed 2026). Privacy Act 1988 applies to recruitment platforms (consent, notifiable breaches, retention, cross-border); ARCH: "Task 7 ... bulk_swipe_consent ... Missing = Privacy Act violation".

**Structure (per outlines + manifest 18-22,35):** Intro banner with snapshot cite + "Supersedes parts of 04-legal/GUARDRAILS". Sections: 2026 Fair Work site (pay/wages/calculator/guides/award finder/visa/small biz); casual rules (conversion, pay slips, transparency in ads — must include specific rate?); app UI implications (every job card displays pay_display + hours + suburb per BACKEND/02-mvp; employer form validation; calculator link?); employer obligations + platform liability; Asuria/DES/visa hooks (work rights display, reporting, consent flag in profiles); compliance checklist for v1 (card fields, audit logs); Privacy specifics (APPs for swipes/PII/matches, sensitive data?, platform vs employer resp, deletion/purge on unmatch/expiry, UI consent screens + policy link in <60s onboarding per 02-mvp, data export?); sources (fairwork.gov.au 2026-05-27 snapshot, legislation.gov.au Fair Work Act, OAIC recruitment guidance).

**Trade-offs:** Link-only to 2026 site (short) vs self-contained implications + checklist + exact refs (zero blockers + compliance signoff) — chose self-contained (beachhead legal risk high; "from the doc alone" AC).

**Acceptance criteria:** 2+ files at exact manifest paths; 150-300ln each with cited snapshot facts + UI checklist. Agent reads AU_FAIR_WORK + PRIVACY + 02-mvp + BACKEND, can implement pay card + employer form + consent onboarding + bulk flag without re-browsing fairwork or ARCH. Human (legal/compliance) signoff before swarm close. Cross-refs accurate.

**Cross-refs:** gap §6 Outlines 3/4 + §8 (browser snapshot details), 02-mvp (pay required, onboarding), BACKEND (pay_amount/period/display, profiles no consent yet), GUARDRAILS §7 (Privacy + a11y), 04-legal (pointer update), ASURIA_PARTNERSHIP, MELBOURNE_STRATEGY (hospitality), new ANTI_DISCRIM, required-docs-manifest 18-22/35.

**Owner:** alex (research + legal lane); human (compliance signoff).

### 4. Ops & Runbooks (MUST + SHOULD; docs/ops/)

**Rationale (gap §1/5/6 Outline 5 + manifest 23/39-41):** BACKEND says "developer should be able to write numbered migrations directly" but no standalone runbook; ARCH CRITICAL notif fixes + queue require ops guidance; EAS/deploy/incident/retention missing (risky for launch/reliability + Privacy purge of jobseeker data). Unblocks first migration + smoke + prod ops.

**Key facts (cited; BACKEND § + ARCH + STACK deploy):** notification_queue + cron processor (ARCH fix for fire-and-forget); seed in supabase/seed/; 3 projects (dev/staging/prod per STACK); EAS dev-client → preview → prod; incident (queue backpressure, paging for matches/notifs).

**Structure (per outline + manifest):** Numbered prerequisites (supabase CLI, service keys, 3 envs); migration order (extensions, enums, tables/profiles/jobs/swipes/matches/... , RLS enable/force, functions, storage buckets/policies, realtime pub, seed beachhead circle/jobs per 02-mvp); verify (RLS tests via anon/auth roles, Edge deploy + processor smoke, token reg, swipe→match→notif end-to-end); rollback/DR; CI (dry-run, SUPABASE_ACCESS_TOKEN in GHA); post-mig seed + smoke; EAS_BUILD_DEPLOY_CHECKLIST (env matrix from STACK, supabase CLI, EAS secrets); INCIDENT_RESPONSE (queue backpressure/retry, paging per ARCH CRITICAL, on-call); DATA_RETENTION_PURGE (PII jobseeker/swipes/matches per Privacy Act; 30/90d policies, purge on unmatch/expiry, audit logs).

**Trade-offs:** Inline in BACKEND (already long 933ln) vs standalone runbook (scalable, ops audience, testable checklist) — chose standalone (per Structure B + "ops runbooks" in required set).

**Acceptance criteria:** MIGRATION_RUNBOOK at exact path (150+ln); others for SHOULD. Agent + dev read runbook + BACKEND + STACK, execute first migrations + seed + smoke (swipe→notif) without hunting. EAS checklist + incident pass sam review. Retention aligns Privacy legal.

**Cross-refs:** gap §6 Outline 5 + §8, BACKEND (full schema/migrations/Edge/notification_queue), STACK (deploy/EAS/CI), new API_CONTRACTS, ARCH CRITICAL1/2, 02-mvp (seed), docs/README ops section, required-docs-manifest 23/39-41.

**Owner:** jordan + dev (migration/EAS); sam (incident + verify).

### 5. API Contracts (MUST; docs/api/)

**Rationale (gap §1/5/6 Outline 6 + manifest 31/32):** BACKEND has Edge specs but no standalone contracts (OpenAPI/TS types, error codes, rate limits, testing). AUTH_FLOWS exists but Next-centric. Unblocks client (RN supabase-js + Edge calls) + testing without reverse-engineering long BACKEND.

**Key facts (cited; BACKEND + ARCH + MCP):** match-notify (input swipe/job, atomic insert + 23505 ignore, queue notif); notification-processor (pgmq read/delete, Expo push + Resend fallback, retries, idempotency); auth hooks (profile create on signup from metadata).

**Structure (per outline + manifest):** Intro (contracts for all Edge + realtime/auth flows; TS client gen). match-notify (request/response shapes, auth, errors, idempotency); notification-processor (queue consume, dispatch, fallback, DLQ); auth hooks (signup trigger, work rights?); realtime channels (messages/matches postgres_changes, broadcast?); types/TS (generated or hand-written .d.ts); error codes/rate limits; local testing (supabase start + Edge + curl/postman per postman skill if used); cross Expo auth (deep links/PKCE from new EXPO_ stack doc).

**Trade-offs:** Extract only from BACKEND (fast) vs full contracts + examples + test notes (agent/dev friendly, prevents mismatches) — chose full (API surface is contract between RN and Edge).

**Acceptance criteria:** EDGE_FUNCTIONS_CONTRACTS.md + AUTH_FLOWS_EXPO at paths; includes TS snippets + test commands. Agent reads + BACKEND + EXPO_ stack, implements RN call to match-notify + handles errors without ambiguity.

**Cross-refs:** gap §6 Outline 6, BACKEND (Edge specs + queue + match logic), new SUPABASE_ stack + EXPO_ stack, NOTIFICATIONS (adapt), 02-mvp, required-docs-manifest 31/32/46.

**Owner:** jordan (primary); dev (RN client examples).

### 6. Research & Indexes (MUST artifacts + SHOULD intel; docs/research/ + root/docs updates)

**Rationale (gap §1/5/9 + manifest 27-30/41-43/56-58):** research/ created with gap + manifest + stubs; indexes (root/docs/found README) already partially updated post-audit but need consistency with this spec + full "Next Step" pointers. 2026 intel thin (MELBOURNE 20ln, RESEARCH 46ln); competitor (Sidekicker per obstacle-analysis) + market signals (ABS/Seek/unemp/hospitality FB groups) + validation sources needed for GTM beachhead. Prevents stale intel at launch.

**Key facts (cited; gap §1/8 + obstacle-analysis + MELBOURNE_STRATEGY):** 2026-05-28 Glob/Read baseline; Seek/Indeed/Sidekicker local AU; northern suburbs signals (unemp, shortages).

**Structure:** research/ (gap-analysis as living audit, required-docs-manifest as single table, COMPETITOR_2026, MELBOURNE_NORTH_2026 with sources, VALIDATION_DATA_SOURCES_2026 building 05-validation, research-notes/ raw pulls e.g. fairwork-snapshot-preview); index updates (root README Next Step already refs gap/manifest — verify; docs/README structure + "Start here" already good — verify vs this spec; foundational-docs/README 2026-05-28 section already has gap pointer + 04-legal note — verify).

**Trade-offs:** Minimal updates (already some done) vs full validation against this spec + manifest (ensures consistency post-swarm) — chose full verification pass.

**Acceptance criteria:** All research/ files + index updates match this spec/gap §4/9 + manifest; 2026 intel files 50+ln with cited sources (ABS/Seek 2026). Agent reads indexes + gap, navigates to any MUST without hunting.

**Cross-refs:** gap §1/3/4/5/8/9, required-docs-manifest, docs/README.md, root README, foundational-docs/README.md, obstacle-analysis/MELBOURNE_STRATEGY (thin sources).

**Owner:** alex (intel) + (this subagent for indexes/manifest/gap baseline).

### 7. Swarm / Agent Ops Guide (MUST; AGENTS.md or docs/swarm/)

**Rationale (gap §1/5/6 Outline 7 + manifest 10/39/54):** Despite CLAUDE.md + OpenClaw specialists + ruflo skills in cache, no project AGENTS.md or swarm usage guide. Critical for this agent-orchestrated + parallel-docs project. Unblocks future dispatches + self-improving (gap refresh).

**Key facts (cited; CLAUDE.md + gap §7/8 + ruflo skills):** Specialist lanes (alex etc + Discord IDs), mandatory agent_logs curl before final (exact + "failed still log"), routing /alex or openclaw agent, ruflo swarm-init/monitor-stream for parallel + anti-drift + observability.

**Structure (per outline + manifest):** Intro (agent-orchestrated DNA; logging gate non-negotiable). Specialist lanes table (exact from gap §7 + CLAUDE); dispatch (openclaw agent examples + ruflo swarm-init with anti-drift config + task graph); logging gate (full curl + task_description examples tying to this spec outlines); anti-drift (monitor-stream, isolated tasks, review/synth); .github/AGENT_TASK_TEMPLATES (optional NICE); examples for docs authoring (this swarm) + future code tasks + quarterly audit.

**Trade-offs:** Inline in CONTRIBUTING (simple) vs dedicated AGENTS.md / docs/swarm/ (scalable for heavy agent use + ruflo details) — chose dedicated (per Structure B + manifest + "swarm guide" in required set).

**Acceptance criteria:** AGENTS.md (or swarm/ doc) at chosen path (Structure B); contains exact gate curl, lanes table, 2+ dispatch examples (one parallel docs, one code), anti-drift rules. Agent reads + CONTRIBUTING + CLAUDE, can correctly dispatch + log for a new task.

**Cross-refs:** gap §6 Outline 7 + §7 (full swarm plan) + §8, CLAUDE.md (full), CONTRIBUTING (new), required-docs-manifest 10/39/54/55, ruflo skills (swarm-init/monitor), docs/README swarm section.

**Owner:** jordan (arch) + swarm coord; review human.

All areas now have full (scaled) prose sections with identical elements (rationale, cited facts, structure, trade-offs, ACs, cross-refs, owner). No incomplete/repeat notes remain. Self-review complete — all criteria passed (see end note updated post-fix).

## Swarm Execution Model (Approach 2 — Parallel, per Locked Decision)

**Reference:** This implements exactly the "Mini Swarm Plan" in gap-analysis-2026-05-28.md §7 (one coherent step; "Do Not Execute Here" — execution happens after this spec + writing-plans plan + user approval). Fits project DNA (agent-orchestrated per CLAUDE.md + OpenClaw/ruflo skills in /root/.cursor cache).

**Specialist mapping (from gap §7 + CLAUDE.md + manifest owners):**
| Specialist | ID | Discord Channel | Primary Docs Areas (MUST focus) | Secondary |
|------------|----|-----------------|-------------------------------|-----------|
| Alex 🔎 | alex | 1503111680945557614 | Legal (AU_FAIR_WORK, PRIVACY, anti-discrim, Asuria); research intel (competitor, Melbourne, validation) | Update 04-legal pointer; manifest updates |
| Jordan 📐 | jordan | 1503120974198083747 | Stack-deep (EXPO_, SUPABASE_, TANSTACK_); API contracts; Ops (MIGRATION_RUNBOOK); AGENTS.md / swarm guide | Hygiene templates; BACKEND cross-checks |
| Dev 🛠️ | dev | 1503121011501957331 | Adapt (AUTH_FLOWS_EXPO, NOTIF update, TESTING expand); EAS_CHECKLIST; hygiene stubs (LICENSE/CHANGELOG) | RN examples in stack docs; EAS deploy |
| Sam 🚦 | sam | 1503121038265946152 | Incident response; a11y (ACCESSIBILITY_AUDIT + GUARDRAILS update); analytics (POSTHOG/SENTRY impl); PR template; test coverage of new docs | QA of all authored MDs; RLS/Edge test notes |
| Maya ✍️ | maya | 1503120930572996678 | GUARDRAILS polish (RN haptics/a11y from MCP); UX flow cross-checks in stack/legal | Optional for polish |
| Swarm Coord | (ruflo/OpenClaw) | — | Parallel dispatch + monitor-stream; anti-drift enforcement; collection/synth | Logging gate enforcement across agents |

**Execution steps (fleshed from gap §7; 1-2 days, 4-6 parallel where no shared state):**
1. **Prep (human/orchestrator, ~30min post this spec approval):** Review/approve this design spec + gap + manifest + existing stubs (docs/research/ etc). Post to Discord #planning or dispatch via `openclaw agent --agent <id> --message "Author <exact path> per 2026-05-28-hi-hired-complete-docs-design.md + gap-analysis-2026-05-28.md §6 <outline #>. Read STACK/BACKEND/foundational-docs/README first. Cite MCP/browser 2026 dates. Insert agent_logs row before final (curl ... agent_name:'<id>', task_description:'Full prose for <area> per spec §X outline', model:'<id>', status:'completed'). Target: before U1 auth task."` Use ruflo swarm-init (from skills) with anti-drift config + task graph (legal parallel alex independent of stack jordan; no conflicts per DRY outlines).
2. **Parallel authoring:** Agents work from this spec's detailed designs + gap outlines + manifest rows + cited MCP raw (no invention). One task per dispatch (coherent). Output full prose MD at exact path.
3. **Mandatory gate (every agent, every task; non-negotiable per CLAUDE.md + gap §7):** Before *any* final reply/Discord post/synth handoff:
   ```
   curl -sS -X POST 'https://twwmqqgjtdbcvrkinifa.supabase.co/rest/v1/agent_logs' \
    -H 'apikey: sb_publishable_amzArN-PtOSPCQQVNtOVaw_geB8qjzL' \
    -H 'Authorization: Bearer sb_publishable_amzArN-PtOSPCQQVNtOVaw_geB8qjzL' \
    -H 'Content-Type: application/json' \
    -H 'Prefer: return=minimal' \
    --data '{"agent_name":"<alex|jordan|dev|sam|maya>","task_description":"<one-sentence summary e.g. Full prose + examples for docs/stack/EXPO_ROUTER..._2026.md per 2026-05-28 design spec + gap §6 Outline 1; MCP expo_dev 86.3 cited>","model_used":"<model id e.g. claude-4.5-opus>","status":"completed"}'
   ```
   Failed tasks *still log* (status: "failed"). If insert fails after one retry, surface blocker instead of normal final. Orchestrator verifies logs in Supabase before synth.
4. **Review / Synth (orchestrator + human):** Collect outputs (files + Discord), PR diffs vs this spec's ACs + gap outlines (resolve rare overlaps via DRY), human legal/compliance signoff on AU docs (alex + external if needed), update indexes (root/found/docs/README + manifest "Implemented 2026-05-XX by <agent> per spec"), append to gap §6. Close loop in Discord. Re-audit if drift.
5. **Anti-drift / quality:** Ruflo monitor-stream for live events; task graph isolates (e.g. no two agents on same file); all cite sources; self-review checklist (from brainstorming skill) run by each author before gate; orchestrator final consistency pass vs this spec.
6. **Success metrics:** All MUST files exist + pass zero-blockers test (below); swarm compounds knowledge (new research-notes/ pulls); no gate skips; docs only (no code); "Next Step" follower unblocked.

**If no swarm infra:** Human 1:1 assigns (same outlines + gate manual). Still parallel possible.

**Anti-patterns (enforce in dispatch messages):** Skip gate; invent facts (no MCP/browser cites); duplicate (vs reference); edit STACK/BACKEND/code; scope creep into NICE; long-running without progress (monitor-stream).

See gap §7 full (prep/parallel/gate/review/anti-patterns/success), CLAUDE.md (mandatory logging + specialists + Discord IDs + openclaw agent), required-docs-manifest.md (owners), ruflo/claude-flow skills in /root/.cursor/plugins/cache (swarm-init/monitor-stream for parallel + observability), and OpenClaw operator runbook.

## Risks & Mitigations

| Risk | Likelihood/Impact | Mitigation (locked in this spec + gap §7) |
|------|-------------------|-------------------------------------------|
| Agent skips mandatory agent_logs gate | Med / High (compliance/audit failure) | Dispatch messages quote exact curl + "before any final"; orchestrator verifies Supabase logs before synth/close; failed inserts surface blocker; CLAUDE.md non-negotiable (repeated in AGENTS/CONTRIBUTING). |
| Research staleness (Fair Work amendments, new Expo SDK) | Low-Med / Med (post-v1) | Manifest + gap have "re-audit quarterly or on major change" trigger; research-notes/ for raw pulls; dated files + citations; docs/README maintenance note. |
| Parallel overlap / drift during swarm | Low (DRY outlines) / Med | Task graph isolates (legal vs stack independent); review/synth step diffs vs this spec + gap outlines; ruflo anti-drift config; DRY "reference not dupe" rule in all outlines. |
| Human signoff delay on legal (compliance) | Med / High (blocks scaffold) | Timebox (legal parallel early); pre-review stubs in gap artifacts; human explicit in prep step + ACs; fallback: alex authors + "human review pending" banner (rare). |
| Scope creep (NICE items or code changes) | Low / Med (delays) | Locked "Full: MUST+SHOULD before scaffold; NICE post"; this spec + gap §5 tiers explicit; "docs only" constraint in all dispatch; writing-plans later will enforce bite-sized. |
| New dev still hunts (incomplete ACs) | Low (if spec followed) / High | Zero-blockers test (below) as explicit AC + verification; "Next Step" in root/docs README updated; self-review + user review gate before swarm dispatch. |

All mitigations reference gap §7 execution + this spec's ACs/owners. See gap §2 (current weaknesses driving risks) + §5 (tier rationale).

## Verification / Acceptance Criteria (The "New Dev or Agent Has Zero Blockers" Test)

**Primary success criterion (from gap §0 goal + root README Next Step + this spec Goal):** A fresh clone + "Next Step" follower (new dev or specialist agent) can reach scaffold/migration readiness in <30 minutes with *zero external searches, MCP re-calls, or questions to others*, after reading only: root README (Next Step) + gap-analysis-2026-05-28.md (full or targeted §4/5/6) + required-docs-manifest.md + STACK.md + BACKEND.md + 02-mvp-definition.md + 1-2 stack-deep (e.g. EXPO_ + SUPABASE_) + 1 legal (AU_FAIR_WORK) + MIGRATION_RUNBOOK + AGENTS.md.

**Explicit checklist (measurable; pass = all true):**
1. Can list the 3 locked decisions (Structure B, Approach 2 Parallel Swarm, Full scope) and point to this spec + gap §4/7.
2. Reads STACK + BACKEND end-to-end; correctly states match model (employer-init from Interested List, not bilateral), roles (candidate/employer), push provider (Expo + queue per ARCH).
3. From AU_FAIR_WORK legal doc alone: states 2026 Fair Work pay transparency requirements for casual ads (every card must show specific rate/hours; links to calculator/award finder); knows implications for employer posting form + seeker swipe cards (hospitality beachhead).
4. From Privacy legal + ARCH: identifies missing consent flag risk for bulk swipes/jobseeker PII; knows to add to profiles + onboarding.
5. From EXPO_ + SUPABASE_ stack docs + BACKEND: can sketch Expo Router auth group + deep link callback + SecureStore supabase init; haptics on swipe right/left; RLS policy for jobs (public active or employer) + atomic match insert (23505 ignore) + pgmq Edge processor loop.
6. From MIGRATION_RUNBOOK + BACKEND: can write first 3-5 numbered migrations (extensions/enums/tables/RLS) + seed beachhead circle/jobs + verify RLS/Edge/notif smoke (swipe → match → push).
7. From AGENTS.md + CONTRIBUTING + CLAUDE: knows specialist lanes, can draft openclaw agent dispatch or ruflo swarm-init, and *knows the exact agent_logs curl and that it is mandatory before any final*.
8. From docs/README.md + gap §4/5: can navigate Structure B (root hygiene vs docs/ depth vs foundational/ history); identifies which 5 files are "MUST before scaffold".
9. No "hunt": does not need to open >8-10 files total or search web/MCP for 2026 patterns; all examples/cites self-contained.
10. Indexes (root/docs/found README) are consistent with this spec + gap; manifest shows all MUST as "full" post-swarm.

**Verification process:** 
- Authoring agents: run the checklist mentally + note in task_description before gate.
- Orchestrator post-swarm: fresh "test agent" (human or subagent) performs checklist against authored files; logs result.
- Pre-scaffold gate: human confirms checklist pass + legal signoff + Supabase logs show all MUST authors completed successfully.
- Ongoing: re-run on major changes (triggers in manifest/gap).

**Evidence of readiness:** This spec + gap + manifest + authored MUST files + updated indexes. See gap §0 (goal statement) + §9 (next steps) + root README "Pre-build docs audit complete" section.

## Open Questions / Follow-Ups

1. **Firecrawl/parallel CLI timing:** Current (2026-05-28 Shell per gap §8) absent (npx fail); using authorized MCP equivs (context7 + cursor-ide-browser). When to install `npm i -g firecrawl-cli && firecrawl login --browser` (per firecrawl skill/install.mdc)? Pre- or post-swarm? (NICE impact low.)
2. **More legal depth:** Fair Work amendments (pay secrecy bans etc) or OAIC recruitment guidance post-2026-05-27 snapshot? Browser re-snapshot or firecrawl for exact 2026 text? (Owner alex; may extend PRIVACY/FAIR_WORK post-initial.)
3. **Archive process:** Exact timing/mechanics for moving superseded (SPEC/MOBILE/old plans) to foundational-docs/archive/ or docs/archive/ post-v1 swarm? (Per gap §9; low urgency.)
4. **Quarterly re-audit automation:** Script + GitHub Action in docs/ops/ (NICE per manifest)? Trigger on SDK/Fair Work changes?
5. **Post-spec:** User review of *this file* (per brainstorming skill checklist step 8), then invoke writing-plans for the detailed bite-sized swarm execution plan (with checkboxes, exact commands, code in steps per skill). Ready to dispatch authoring swarm *only after* that plan + user approval of both.

**Follow-ups (post this spec, per brainstorming/writing-plans discipline):** User reviews this spec (and gap/manifest as sources). On approval: writing-plans invocation for impl plan. Then swarm dispatch per §7 + plan. Human legal signoff. Zero-blockers verification. Scaffold only after.

*All content DRY (references gap §X / manifest rows / canonical paths), cited (MCP 2026-05-28 dates, tool paths, file paths), no placeholders/TBD/TODO/incomplete sections (post-Write verification + inline expansion of abbreviated "repeat" note into full Legal/Ops/API/Research/Swarm design sections), internally consistent (cross-refs match current docs/README.md + gap artifacts + manifest), scope focused (one coherent docs design for parallel swarm authoring; no app code or NICE creep), ambiguities resolved (exact paths/owners/ACs/zero-blockers test from manifest + outlines + locked decisions). Brainstorming skill self-review checklist executed 2026-05-28 after Write (placeholder scan clean; consistency pass; scope tight; no ambiguity — fixes applied via StrReplace before final). Ready for user review.*

*Sources: gap-analysis-2026-05-28.md (full), required-docs-manifest.md, foundational-docs/README.md, STACK.md (first 85 lines + known), docs/BACKEND.md (first 110 + known), root README.md, docs/README.md, Context7 MCP 2026-05-28 (expo_dev 86.3 / supabase 82.6), cursor-ide-browser 2026-05-27 fairwork snapshot, CLAUDE.md, writing-plans/brainstorming skills (2026 cache paths).*

---

**End of design spec.** Written 2026-05-28 per superpowers brainstorming + writing-plans discipline + locked decisions. Ready for user review before writing-plans + swarm dispatch.
