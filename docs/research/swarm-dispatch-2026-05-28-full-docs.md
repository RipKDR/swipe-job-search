# Hi-Hired Full-Scope Documentation Authoring — Swarm Dispatch Package (2026-05-28)

**Date:** 2026-05-28  
**Version:** 1.0 (ready-to-dispatch)  
**Locked Context (from query):** Structure B (Layered docs hierarchy per gap §4), Approach 2 (Parallel Swarm), Scope: Full (ALL MUST items + SHOULD before any scaffold).  
**Primary Source of Truth:** `docs/research/gap-analysis-2026-05-28.md` (especially §6 8 detailed outlines, §7 mini swarm plan, §5 tiered MUST list, §3 required set, §8 2026 MCP/browser citations, §9 artifacts).  
**Secondary:** `docs/research/required-docs-manifest.md` (full ~48 table, owners, status).  
**Mandatory Gate:** Every specialist agent (alex/maya/jordan/dev/sam or swarm member) **MUST** insert into `agent_logs` table **before sending any final reply**. See exact template below. Failed tasks still log. This is non-negotiable per CLAUDE.md workspace rule.

**This package is independent of the design-spec writer agent. Dispatch can proceed in parallel once human approves the gap + this package + any synthesized spec.**

---

## Swarm Mission Briefing (One Page for Coordinator / Orchestrator)

**Mission:** Author the complete set of MUST-tier documentation (hygiene + 2026 stack-deep references + AU legal/compliance + ops runbooks + API contracts + indexes + manifest) so that a new developer or specialist agent following the root README "Next Step for Developers" + gap-analysis-2026-05-28.md + STACK.md + docs/BACKEND.md + foundational-docs/02-mvp-definition.md has **zero knowledge blockers or hunting** before scaffolding the Expo RN TS monorepo.

**Scope Lock:** Full MUST only (see gap §5 + manifest rows 1-14,18-19,22-23,31,41-43 and hygiene). No code changes, no SHOULD yet (unless spillover), no invention of facts. All 2026 research (MCP Context7 expo_dev 86.3 / supabase 82.6 + cursor-ide-browser fairwork.gov.au snapshot 2026-05-27 with 511 refs/117 interactive) must be cited verbatim with timestamps/sources. DRY: reference canonicals (STACK, BACKEND, 02-mvp, ARCHITECTURE_AUDIT, existing UX files) — never duplicate schema, flows, or general advice.

**Approach:** Parallel swarm (4-6 agents) per gap §7. Each task card is **self-contained and independent** (minimal shared state; overlaps prevented by explicit DRY instructions + "log question to coord, do not assume"). Specialist lanes per CLAUDE.md + gap §7:
- `alex` (1503111680945557614): research/legal/intel
- `jordan` (1503120974198083747): arch/backend/api/ops/stack
- `dev` (1503121011501957331): impl/adapt/code examples/hygiene
- `sam` (1503121038265946152): qa/testing/a11y/analytics/incident
- `maya` (1503120930572996678): UX polish (optional for GUARDRAILS)

**Execution Cadence (per gap §7):** 1-2 days wall-clock. Human/orchestrator prep (30min review/approve), parallel authoring (agents execute cards independently), gate enforcement, review/synth (collect outputs, resolve rare overlaps, update indexes + manifest + gap §6 "Implemented" appends), human legal/compliance signoff on AU docs, close in Discord.

**Success Criteria:** All MUST files exist as full prose (not outlines) in the layered structure (docs/stack/, docs/legal/, docs/ops/, docs/api/, root hygiene, .github/, docs/README + updates); manifest updated with "full" status + dates/authors; 3 indexes reference gap + new docs; "Next Step" follower test passes (zero external hunting); every agent has logged to Supabase agent_logs; anti-drift respected (no scope creep).

**Key 2026 Facts (all agents must use; do not re-research):** 
- Context7 MCP 2026-05-28: Expo /websites/expo_dev (benchmark 86.3, v55/56) — full notif registration, useNotificationObserver hook (data.url → router.push), haptics exact (selectionAsync/impactAsync/notificationAsync), NativeTabs optional.
- Context7 MCP 2026-05-28: Supabase /supabase/supabase (82.6) — RLS multi-tenant (auth.uid(), is_room_participant adapt), pgmq_public RPC for queue consume in Edge (read/delete, Deno.serve loop), storage policies (public read + owner insert), realtime.messages RLS.
- cursor-ide-browser 2026-05-27 fairwork.gov.au/ snapshot: 511 refs/117 interactive; prominent Pay and wages (e9), Pay Calculator (e10), Pay guides (e12), Find my award (e52), Changes to workplace laws (e17); 404 on legacy /pay contracts URL (structure changed); sectors (fast food e21, hospitality, small business e30, visa e31).
- ARCHITECTURE_AUDIT 2026-05-27: Match TOCTOU race (add UNIQUE + atomic insert + 23505 ignore), notif fire-and-forget (add notification_queue + processor + idempotency), missing bulk_swipe_consent flag in profiles = Privacy Act violation.
- All per gap §8 exhaustive citations (local Glob/Read/Grep/Shell + MCP schemas first).

**This package + gap-analysis = single source spec. Agents execute cards; do not improvise.**

---

## Mandatory Supabase agent_logs Gate (Exact Template — Copy-Paste, Do Not Modify Structure)

**Every task is incomplete until this log row is written.** Insert **before** any final reply, Discord post, Telegram summary, or "task done" declaration. Use `status: "completed"` or `"failed"` (failed tasks must still log). One retry max on transient error; surface blocker if fails.

**Exact curl (from CLAUDE.md workspace rule + gap §7):**

```bash
curl -sS -X POST 'https://twwmqqgjtdbcvrkinifa.supabase.co/rest/v1/agent_logs' \
  -H 'apikey: sb_publishable_amzArN-PtOSPCQQVNtOVaw_geB8qjzL' \
  -H 'Authorization: Bearer sb_publishable_amzArN-PtOSPCQQVNtOVaw_geB8qjzL' \
  -H 'Content-Type: application/json' \
  -H 'Prefer: return=minimal' \
  --data '{"agent_name":"<alex|jordan|dev|sam|maya>","task_description":"<one-sentence summary of THIS card>","model_used":"<claude-4.5-opus|your-model-id>","status":"completed"}'
```

**Per-card below:** A ready-to-run example with this task's values pre-filled (replace `<model>`). Run it as the **last action** of the card.

**Enforcement:** Swarm coordinator (or human) verifies logs via Supabase dashboard / query before synthesis. No log row = task not accepted for review.

---

## Self-Contained Task Cards (12+ MUST Items — Execute in Any Order, Minimal Dependencies)

**How to use a card:** Copy the **Full Instructions** + **Log Gate** into your agent prompt / ruflo task / OpenClaw message / manual assignment. Execute exactly. Output only after log. Cards are designed for zero shared mutable state.

### DOC-2026-05-28-001: EXPO_ROUTER_AUTH_NOTIFS_HAPTICS_2026 (Stack Deep #1)

**Specialist Lane:** jordan (arch) + dev (impl examples)  
**Exact Target File:** `docs/stack/EXPO_ROUTER_AUTH_NOTIFS_HAPTICS_2026.md` (stub exists per gap §9; expand it)  
**Dependencies:** None (parallel OK; highest priority for auth/swipe scaffold)  
**Effort Estimate:** 4-6 hours

**Full Instructions (adapt + expand gap §6 Outline 1 verbatim):**

Read (mandatory, in order):
1. Primary spec: `docs/research/gap-analysis-2026-05-28.md` §6 "Outline 1: docs/stack/EXPO_ROUTER..." (full sections, key facts, cross-links, author checklist) + §8 (exact MCP 2026-05-28 citations + tool usage).
2. DRY context (first 100 lines each): `STACK.md` (Expo 52+ / Router / Notifs / Env / monorepo decisions) + `docs/BACKEND.md` (device_tokens table, Edge notif specs, auth notes).
3. Existing adapt targets (skim only for ref, do not dupe): `AUTH_FLOWS.md`, `NOTIFICATIONS.md`, `GUARDRAILS.md`, `foundational-docs/02-mvp-definition.md` (push in MVP), `ARCHITECTURE_AUDIT.md` (CRITICAL notif fixes).
4. Stub file itself (it already contains outline header + MCP cites).

Use **verbatim 2026 MCP facts** (paste/adapt exact code blocks; attribute with dates):
- Full notif reg + send example (expo-notifications + Constants.expoConfig.extra.eas.projectId + fetch https://exp.host/... ; Android channel MAX importance).
- Router observer hook (useEffect + Notifications.getLastNotificationResponseAsync + addNotificationResponseReceivedListener → router.push(data.url) from notif payload).
- Haptics: selectionAsync(), notificationAsync(Success/Error/Warning), impactAsync(Light/Medium/Heavy/Rigid/Soft) — exact button/integration example.
- Auth: @supabase/supabase-js + expo-secure-store adapter (full init), PKCE magic/Google/Apple, deep links "hi-hired://" + app.config.ts extra (dev: exp://..., prod: hi-hired:// + universal links), app/auth/callback.tsx router.replace.
- Gotchas: physical device only for push (simulator no), EAS projectId required, Realtime + notif dual path, iOS background suppress via AppState, cold Edge starts (use queue per ARCH).

**Write full prose + working TS/TSX code examples** (not bullets). Expand the 7 sections exactly as listed in gap Outline 1:
1. Expo Router file-based + auth/role groups...
2. Supabase Auth 2026 Expo...
3. Expo Notifications 2026 (SDK 52+/v55+)...
4. Haptics for swipe deck...
5. Monorepo/Env...
6. Gotchas 2026...
7. Testing...

**DRY rules (enforced):** Reference (do not copy) existing adapt files + BACKEND schema + STACK decisions + ARCH fixes. All new content is 2026 Expo RN specific + MCP-sourced.

**Update header on completion:** Change "OUTLINE ONLY" to "FULL 2026-05-28 by jordan/dev via swarm DOC-001"; append "Implemented per gap-analysis-2026-05-28 §6.1 + dispatch package."

**Log Gate (exact — run as LAST action, before any "done" output):**
```bash
curl -sS -X POST 'https://twwmqqgjtdbcvrkinifa.supabase.co/rest/v1/agent_logs' \
  -H 'apikey: sb_publishable_amzArN-PtOSPCQQVNtOVaw_geB8qjzL' \
  -H 'Authorization: Bearer sb_publishable_amzArN-PtOSPCQQVNtOVaw_geB8qjzL' \
  -H 'Content-Type: application/json' \
  -H 'Prefer: return=minimal' \
  --data '{"agent_name":"jordan","task_description":"Expanded docs/stack/EXPO_ROUTER_AUTH_NOTIFS_HAPTICS_2026.md to full prose per gap §6 Outline 1 + verbatim MCP 2026-05-28 facts (Context7 expo_dev 86.3)","model_used":"<claude-4.5-opus>","status":"completed"}'
```

**Acceptance Criteria (passes "new dev can follow without hunting" test):**
- All 7 sections + intro + key facts + gotchas + testing present as full prose + copy-pasteable code.
- Every 2026 MCP fact from gap Outline 1 Key Facts included with inline citation (Context7 ... 2026-05-28).
- Zero duplication of general auth/notif concepts (all refs are "see NOTIFICATIONS.md §X (adapt OneSignal→Expo + queue per ARCH)").
- New dev test: After reading only gap §6.1 + this file + STACK first 100 + BACKEND first 100 + 02-mvp, can implement Expo Router auth groups, SecureStore Supabase init, push token upsert + observer deep link, swipe haptics in <30min with no other searches.
- Linter/docs style matches existing (prose + TS blocks + tables where used in gap).
- Manifest row 11 updated (by author or coord) to "full".

---

### DOC-2026-05-28-002: SUPABASE_RLS_EDGE_STORAGE_REALTIME_JOBS_2026 (Stack Deep #2)

**Specialist Lane:** jordan  
**Exact Target:** `docs/stack/SUPABASE_RLS_EDGE_STORAGE_REALTIME_JOBS_2026.md` (stub exists)  
**Dependencies:** None (parallel)  
**Effort:** 5-8 hours

**Full Instructions:** Identical structure to DOC-001 but for gap §6 Outline 2.

Mandatory reads: gap §6 Outline 2 + §8 (Context7 supabase 82.6 + 2026-01 blog + queues); STACK first 100 + BACKEND first 100 (full schema/ERD/RLS hints/Edge specs/notification_queue/ARCH fixes).

Verbatim facts to include:
- RLS enable + policy using auth.uid() or current_setting; force row level security.
- is_room_participant adapt → is_match_participant or job_visible.
- Queue consume Edge: supabase.schema('pgmq_public').rpc('read'/'delete'), process loop, Deno.serve.
- Profiles + avatars storage policies (public select, owner insert; realtime pub add table).
- realtime.messages RLS for broadcast (authenticated send/receive).

Expand exactly the 7 sections in Outline 2 (RLS patterns for jobs/swipes/matches/messages/...; Edge atomic + queue processor per ARCH; Realtime; Storage; Auth triggers; RN client; Pitfalls).

DRY: "Builds on BACKEND full schema/ERD/migrations/Edge + ARCH CRITICAL1/2; see notification_queue processor spec in BACKEND."

Update stub header, append implemented note.

**Log Gate (pre-filled):**
```bash
curl ... --data '{"agent_name":"jordan","task_description":"Authored full prose + SQL/TS examples for docs/stack/SUPABASE_RLS_EDGE..._2026.md per gap §6 Outline 2 + Context7 supabase 82.6 MCP facts 2026-05-28","model_used":"<model>","status":"completed"}'
```

**Acceptance:** Matches Outline 2 sections exactly; all MCP facts cited; new dev can write RLS for swipes/matches, Edge queue processor, storage policies, RN realtime sub without hunting BACKEND or re-researching 2026 patterns. Manifest row 12 → full.

---

### DOC-2026-05-28-003: AU_FAIR_WORK_PAY_TRANSPARENCY_CASUAL_2026 (Legal #1)

**Specialist Lane:** alex  
**Exact Target:** `docs/legal/AU_FAIR_WORK_PAY_TRANSPARENCY_CASUAL_2026.md` (stub)  
**Dependencies:** None  
**Effort:** 3-5 hours (may re-browse OAIC/fairwork via allowed MCP if exact amendment text needed; cite 2026-05-27 snapshot first)

**Full Instructions:** Expand gap §6 Outline 3 verbatim (7 sections + key facts from browser snapshot).

Mandatory reads: gap §6.3 + §8 (cursor-ide-browser fairwork 2026-05-27 details: 511 refs, pay sections e9/e10/e12/e52, 404 legacy, sectors); 02-mvp (pay field required), BACKEND (pay_amount/period/display), GUARDRAILS, foundational-docs/04-legal-data-sources.md (for pointer), MELBOURNE_STRATEGY, ASURIA_PARTNERSHIP.

Include verbatim: Home structure, casual rules 2026, app UI implications (every card must show specific pay_rate/hours/suburb; no vague "competitive"), employer obligations, Asuria/DES/visa hooks, sources/links, v1 compliance checklist.

Update 04-legal with pointer (see DOC-012 or batch with alex legal work).

**Log Gate:**
```bash
... "agent_name":"alex","task_description":"Full AU Fair Work 2026 pay transparency doc per gap §6 Outline 3 + browser snapshot 2026-05-27 (pay sections, 117 interactive)","model_used":"<model>","status":"completed"
```

**Acceptance:** All sections + checklist; citations to 2026-05-27 snapshot + exact ref IDs; new dev/employer poster knows exact pay display rules for beachhead hospitality without hunting fairwork.gov.au or old 04-legal. Manifest row 18 → full.

---

### DOC-2026-05-28-004: PRIVACY_ACT_RECRUITMENT_JOBSEEKER_DATA_2026 (Legal #2)

**Specialist Lane:** alex  
**Exact Target:** `docs/legal/PRIVACY_ACT_RECRUITMENT_JOBSEEKER_DATA_2026.md`  
**Dependencies:** None (parallel to 003)  
**Effort:** 3-4 hours

**Full Instructions:** Expand gap §6 Outline 4 (sections on APPs for recruitment, jobseeker data specifics, platform vs employer, Asuria/DES bulk consent flag (ARCH gap), deletion/purge, UI consent screens).

Reads: gap §6.4 + §8 (ARCH "Task 7 ... bulk_swipe_consent ... Missing = Privacy Act violation"); GUARDRAILS §7 AU Privacy, 04-legal, ASURIA, BACKEND profiles (no consent field yet), 02-mvp onboarding <60s.

**Log Gate:** agent_name "alex", task "Authored Privacy Act recruitment doc per gap §6 Outline 4 + ARCH consent flag gap 2026-05-27", ...

**Acceptance:** Covers consent for swipes/PII/matches, notifiable breaches, retention, bulk flag requirement; new dev adds correct onboarding + profile field without re-researching OAIC/Privacy Act 1988.

---

### DOC-2026-05-28-005: MIGRATION_RUNBOOK_FROM_BACKEND (Ops #1)

**Specialist Lane:** jordan + dev  
**Exact Target:** `docs/ops/MIGRATION_RUNBOOK_FROM_BACKEND.md` (stub)  
**Dependencies:** None (but logically before first real mig)  
**Effort:** 4 hours

**Full Instructions:** Expand gap §6 Outline 5 (prereqs supabase CLI + 3 projects, numbered order extensions/enums/tables/RLS/functions/storage/realtime/seed beachhead circle/jobs per 02-mvp, verify RLS/Edge/token, rollback, CI dry-run with SUPABASE_ACCESS_TOKEN, post-mig smoke: employer post → candidate swipe → match → notif).

Reads: gap §6.5 + BACKEND "A developer should be able to write numbered migrations directly", notification_queue for ARCH fix, seed/, STACK deploy, docs/plans/2026-05-27-001, new API_CONTRACTS (will exist via DOC-006).

**Log Gate:** jordan or dev, "Authored numbered migration runbook per gap §6 Outline 5 + BACKEND § + ARCH fixes", ...

**Acceptance:** Numbered steps complete; new dev (or CI) can run migrations on fresh Supabase project + seed + smoke full MVP flow without guessing order or missing queue/RLS.

---

### DOC-2026-05-28-006: EDGE_FUNCTIONS_CONTRACTS (API #1)

**Specialist Lane:** jordan  
**Exact Target:** `docs/api/EDGE_FUNCTIONS_CONTRACTS.md` (stub)  
**Dependencies:** None (parallel; cite BACKEND + ARCH + new SUPABASE stack)  
**Effort:** 3-4 hours

**Full Instructions:** Expand gap §6 Outline 6: match-notify (input swipe/job, atomic insert per ARCH UNIQUE, queue notif), notification-processor (pgmq read, Expo push + Resend fallback, retries, idempotency), auth hooks (profile create on signup), types/TS, error codes, rate limits, testing (local supabase functions + Edge).

Reads: gap §6.6 + BACKEND Edge specs + ARCH (idempotency/queue), new SUPABASE_RLS... (DOC-002), NOTIFICATIONS, 02-mvp.

**Log Gate:** jordan, "Authored Edge Functions contracts (match-notify + processor) per gap §6 Outline 6 + BACKEND/ARCH 2026-05-27", ...

**Acceptance:** OpenAPI-style or detailed TS contracts + example calls; new dev/Edge author implements without ambiguity or re-deriving from BACKEND prose.

---

### DOC-2026-05-28-007: AGENTS (Swarm / Agent Ops)

**Specialist Lane:** jordan (orchestrator support)  
**Exact Target:** `AGENTS.md` (root; new per gap §3/§5/§7)  
**Dependencies:** None (but cite CONTRIBUTING when it exists; can be DOC-011)  
**Effort:** 3-5 hours

**Full Instructions:** Expand gap §6 Outline 7 + §7 mini swarm plan + CLAUDE.md specialist table.

Include:
- Specialist lanes table (alex research/legal, jordan arch, dev impl, sam qa, maya UX) with Discord channel IDs from CLAUDE/gap.
- Routing: openclaw agent --agent <id> --message, /alex in Telegram, ruflo swarm.
- **Mandatory logging gate** with exact curl (copy from this package).
- Parallel authoring example (this dispatch package itself).
- Anti-drift rules, how to use for future gap refresh or code tasks.
- Full OpenClaw + ruflo/claude-flow usage notes (from gap §7 + skills cache if available to author).

Reads: gap §6.7 + §7 + §8 + CLAUDE.md (full logging + lanes + stack defaults) + this dispatch package.

**Log Gate:** "jordan", "Authored root AGENTS.md with lanes, logging gate, ruflo/OpenClaw dispatch per gap §6.7 + §7 + CLAUDE", ...

**Acceptance:** One-stop for any swarm/agent task on this project; new coordinator can dispatch DOC-00x cards or future work without re-reading CLAUDE + gap.

---

### DOC-2026-05-28-008: required-docs-manifest (Living Baseline)

**Specialist Lane:** swarm coordinator / this subagent / human  
**Exact Target:** `docs/research/required-docs-manifest.md` (exists; update)  
**Dependencies:** All other DOC-00x (run last in synthesis)  
**Effort:** 1 hour (mostly table edits)

**Full Instructions:** Update the table: set status "full" + "Implemented 2026-05-28 by <lane> via swarm DOC-00x" for every MUST authored; append new rows if gaps found during authoring; update "Last updated" + notes. Keep DRY pointer to gap-analysis for outlines/research.

Reads: gap §6 + §9 (artifacts list) + current manifest.

**Log Gate:** "swarm" or "jordan", "Updated required-docs-manifest with full statuses post-MUST authoring per gap §6.8 + dispatch", ...

**Acceptance:** Manifest accurately reflects reality; all MUST rows show "full" + dates/authors; "End state" paragraph still accurate.

---

### DOC-2026-05-28-009: TANSTACK_QUERY_ZUSTAND_RHF_ZOD_RN_2026 (Stack Deep #3)

**Specialist Lane:** jordan + dev  
**Exact Target:** `docs/stack/TANSTACK_QUERY_ZUSTAND_RHF_ZOD_RN_2026.md` (new; per manifest row 13 + gap §5 MUST)  
**Dependencies:** None (parallel to other stack)  
**Effort:** 4 hours

**Full Instructions (self-contained synthesis from gap §5 + manifest + STACK):**

Reads (mandatory): gap-analysis §5 (MUST stack-deep list) + §8 (no specific MCP for TanStack but use 2026 date from STACK 2026-05-27) + STACK first 100 (TanStack Query v5, Zustand, RHF+Zod, monorepo packages/shared schemas) + BACKEND first 100 (for query patterns on jobs/swipes/matches) + docs/stack/EXPO... (if DOC-001 done; router + query integration) + GUARDRAILS (optimistic swipe weight).

Create full prose doc with:
- Setup: QueryClient + RN persister (or SecureStore), supabase client integration.
- Queries: useQuery for active jobs (filter suburb/pa y), swipes history, matches.
- Mutations: useMutation for right-swipe (optimistic update + rollback on 23505), match creation (employer), with invalidateQueries.
- Forms: RHF + Zod for job post (pay structured + display), profile, with shared schemas from packages/shared.
- Zustand: minimal ephemeral (deck index, current filter, modal state) — explicit "not for server state".
- Devtools, error handling, offline (React Native).
- Testing: Vitest + RTL for hooks.
- Swipe-specific patterns (optimistic UI per GUARDRAILS "Tinder feel").
- Gotchas 2026 (v5 suspense, RN re-renders, Supabase realtime + query sync).

Cite: "Per STACK.md (2026-05-27): TanStack Query v5 + Zustand + RHF+Zod. See gap §5 for priority."

DRY: Reference (do not re-explain) Supabase client from new EXPO/SUPABASE stack docs.

**Log Gate:** jordan/dev, "Authored TanStack RN 2026 patterns doc per gap §5 MUST + STACK 2026-05-27 (v5, optimistic swipe, RHF+Zod)", ...

**Acceptance:** New dev can implement swipe deck with optimistic right-swipe + form validation + cache for jobs list using only this + STACK + 02-mvp (no hunting TanStack docs or re-deriving RN patterns).

---

### DOC-2026-05-28-010: EXPO_NOTIFICATIONS_EDGE_PROCESSOR_2026 (Stack Deep #4)

**Specialist Lane:** jordan + dev  
**Exact Target:** `docs/stack/EXPO_NOTIFICATIONS_EDGE_PROCESSOR_2026.md` (new per manifest 14 + gap §5)  
**Dependencies:** DOC-001 (notif reg), DOC-002 (queue RLS/Edge), DOC-006 (contracts) — but can start with refs to stubs  
**Effort:** 4 hours

**Full Instructions:** Builds directly on gap §6 Outlines 1+2+6 + ARCH CRITICAL2 + BACKEND notification_queue.

Reads: gap §5/§6 (notif processor), BACKEND first 100 + queue section, ARCHITECTURE_AUDIT (fire-and-forget fix), new EXPO_ and SUPABASE_ stack docs.

Content: Full TS Edge Function example for notification-processor (pgmq read 5 msgs, Expo push via fetch with EAS projectId + token from device_tokens, Resend fallback for email, retries, idempotency key, error → requeue or DLQ, logging). Plus client registration patterns (cross-ref DOC-001). Testing local + deployed.

**Log Gate:** "jordan", "Authored Expo + Edge notif processor patterns per gap §5 + ARCH CRITICAL + BACKEND queue 2026-05-27", ...

**Acceptance:** Dev can implement the processor Edge (or adapt existing) + verify end-to-end notif from match without re-deriving queue/Expo push/ARCH fixes.

---

### DOC-2026-05-28-011: Root OSS Hygiene Files (Batch — 5 files)

**Specialist Lane:** dev (primary) + jordan (arch review)  
**Exact Targets:** 
- root/LICENSE
- root/CONTRIBUTING.md
- root/CODE_OF_CONDUCT.md
- root/SECURITY.md
- root/CHANGELOG.md
**Dependencies:** None (parallel)  
**Effort:** 3-4 hours total

**Full Instructions (self-contained per gap §3 hygiene MUST + §5 + manifest rows 1-5 + CLAUDE logging):**

Reads: gap §3 (8 hygiene files list), §5 (MUST hygiene 5-6), manifest rows 1-5 + 10 (AGENTS cross), CLAUDE.md (logging gate + OpenClaw lanes + Discord channels + default stack), this dispatch package (for CONTRIBUTING agent section + exact curl).

Provide **full ready-to-paste content** for each:

- **LICENSE:** Standard MIT (or Apache-2.0 per preference) + (c) 2026 Hi-Hired Pty Ltd (or authors) + short AU law note (governed by Victorian law, Fair Work/Privacy compliance).
- **CONTRIBUTING.md:** Full modern template + project specifics: "Agent-orchestrated (OpenClaw/ruflo). Specialist lanes (table from CLAUDE + gap). Routing shortcuts. **Mandatory Supabase agent_logs gate** (exact curl from this package). PR process (docs/a11y/RLS/sources checklist). How to run swarm dispatch. Link to AGENTS.md + gap §7."
- **CODE_OF_CONDUCT.md:** Contributor Covenant v2.1 + explicit AU DDA/anti-discrimination + beachhead inclusive hiring note.
- **SECURITY.md:** PII (jobseeker swipes/matches/availability/work rights/avatars), notifiable breaches (Privacy Act), vuln reporting (security@ + GitHub), App Store requirements, rate limits on Edge.
- **CHANGELOG.md:** keep-a-changelog 1.0 format; Unreleased + 2026-05-28 entries from gap (pre-build audit complete, docs/ layered structure, 2026 MCP research, swarm dispatch package) + plans/2026-05-27-001 summary. Pre-0.1.0 history.

**DRY:** "See AGENTS.md for lanes/logging; see gap-analysis-2026-05-28.md §3/§7 for full rationale."

Update any existing banners if needed (none expected).

**Log Gate (batch OK):** dev, "Created root hygiene (LICENSE/CONTRIBUTING/SECURITY/CODE_OF_CONDUCT/CHANGELOG) per gap §3/§5 + CLAUDE logging gate + manifest", ...

**Acceptance:** All 5 files present with project-specific content; CONTRIBUTING contains exact curl + lanes table + "log before final reply"; new contributor can start PR without hunting CLAUDE or gap.

---

### DOC-2026-05-28-012: GitHub Templates + PR/Issue Hygiene

**Specialist Lane:** sam + jordan  
**Exact Targets:** `.github/ISSUE_TEMPLATE/` (bug_report.md, feature_request.md, doc_update.md, legal_update.md) + `.github/PULL_REQUEST_TEMPLATE.md` (and dir structure)  
**Dependencies:** DOC-011 (CONTRIBUTING cross-refs)  
**Effort:** 2 hours

**Full Instructions:** Per gap §3 + manifest row 6-9 + §5 MUST.

Reads: gap §3/§5 (templates with docs/a11y/RLS/sources cited checklist), manifest, CLAUDE (PR process), this dispatch (logging).

Provide full YAML/frontmatter + markdown bodies for 4 issue templates + PR template with checkboxes:
- "Docs updated? (gap §6 / manifest / STACK / BACKEND)"
- "a11y verified? (WCAG 2.2 AA + DDA)"
- "RLS / Edge / security reviewed?"
- "Sources cited with 2026 dates? (MCP/browser/gap)"
- "agent_logs row inserted for any agent work?"
- "Tested per TESTING_STRATEGY + new stack docs?"

Also bug_report with reproduction, env (Expo SDK, Supabase project, device), logs.

**Log Gate:** sam/jordan, "Created .github/ templates (4 issues + PR) with full checklists per gap §3/§5 + manifest", ...

**Acceptance:** Templates exist and enforce the project's audit/agent/logging standards; new PR automatically surfaces docs + compliance + logging requirements.

---

## Coordination Instructions (for Swarm Coordinator / Human Orchestrator)

**Progress Reporting:** 
- Each agent posts start/complete (after log) to their Discord lane (alex 1503111680945557614 etc) or via ruflo monitor-stream.
- Coordinator polls agent_logs table or uses `openclaw message read --channel discord --target channel:<id>` for updates.
- Use shared channel or Telegram for cross-lane questions (log the question; do not mutate another agent's file without explicit handoff).

**Overlap / Conflict Handling:** 
- Explicit DRY + "reference only" in every card makes overlaps rare (e.g. notif details live in EXPO_ + EDGE_PROCESSOR + reference from NOTIFICATIONS.md adapt later).
- If suspected: agent logs "Question for coord: overlap with DOC-00X on <topic>?" to lane + waits for reply. Coordinator arbitrates (usually "put in X, ref from Y").
- No agent edits another agent's target file.

**Final Synthesis Step (after all logs show completed):**
1. Verify all 12+ agent_logs rows exist with correct task_descriptions + status completed (query Supabase or dashboard).
2. Collect authored files (git diff or PRs).
3. Human + coord review against gap §6 outlines + acceptance (especially legal AU docs + compliance signoff).
4. Update: required-docs-manifest (DOC-008), gap-analysis §6 (append "Implemented 2026-05-28 by <lane> via DOC-00X" to each outline), root/foundational/docs README "Next Step" if needed.
5. Archive any superseded notes.
6. Post synthesis summary to Discord #planning + Telegram orchestrator.
7. Human: "Scaffold approved — run monorepo init per docs/ops/MIGRATION_RUNBOOK + STACK."

**Anti-Patterns (enforce in every card + dispatch):** 
- Skipping log gate (immediate fail, re-dispatch after log).
- Inventing 2026 facts (must cite MCP/browser/gap §8 with dates).
- Duplicating content (DRY violation = reject in review).
- Scope creep (only the target file + its outline; no code, no SHOULD).
- Assuming shared state (each card re-states its reads/facts).

**If Swarm Infra Not Running:** Human 1:1 assigns cards via OpenClaw (`openclaw agent --agent jordan --message "<paste full card instructions + log template>"`) or Telegram/Discord DM. Still parallel (multiple agents in different terminals/tmux). Manual curl for gate still required.

---

## How to Launch This Swarm

**Option 1: Ruflo / Claude-Flow (recommended for true parallel + anti-drift)**

```bash
# 1. Init hierarchical swarm (from ruflo swarm-init skill + claude-flow)
npx @claude-flow/cli@latest swarm init --topology hierarchical --max-agents 6 --strategy specialized

# 2. (In Claude Code or MCP-enabled env) Use TeamCreate + Agent tool with isolation worktree
#    Spawn 5 agents (alex, jordan x2, dev, sam) + coordinator
#    For each: SendMessage with full text of one DOC-00X card (or "Execute DOC-2026-05-28-001 per attached dispatch package")

# 3. Monitor
#    mcp__claude-flow__swarm_status or npx ... swarm status
#    Use monitor-stream skill for live events
```

See ruflo skills in /root/.cursor/plugins/cache/ruflo/... for exact MCP/tool calls.

**Option 2: OpenClaw Parallel Dispatches (current workspace default per CLAUDE.md)**

Run in parallel shells/tmux (or background with & + wait):

```bash
# Example for jordan stack tasks (paste full card text into --message)
openclaw agent --agent jordan --message "Execute DOC-2026-05-28-001: EXPO_ROUTER... per attached swarm-dispatch-2026-05-28-full-docs.md. Full instructions: [paste or 'see docs/research/swarm-dispatch... §DOC-001']. Use exact log curl on completion."

# Repeat for alex (003+004), dev (009+011), sam (012), etc.
# Coordinator monitors Discord lanes + agent_logs.
```

After all complete + logs verified: human runs synthesis commands (git status, Supabase query, etc.).

**Option 3: Manual / No Infra**

1. Human reviews/approves this package + gap.
2. Assigns cards 1:1 (email/Telegram/Discord/Linear) to the named lanes.
3. Each specialist pastes the card into their agent session (or does manually), runs the exact curl as last step, posts "DOC-00X complete, log row <id>" + diff.
4. Human aggregates in a tracking sheet or this file's frontmatter.

**Prep Checklist (human, 30min before launch):** 
- [ ] gap + this dispatch + manifest reviewed/approved in Discord #planning.
- [ ] Stubs + dirs from gap §9 exist (confirmed via Glob).
- [ ] Supabase agent_logs table writable with the publishable key (test one curl).
- [ ] OpenClaw/ruflo/MCP env ready for target agents.
- [ ] "Next Step" in root README + docs/README already points to gap (per gap §9 updates).

**Launch Command (copy-paste after approval):**
(Insert the 5-6 parallel openclaw or ruflo commands here once human confirms.)

---

## End of Dispatch Package

All task cards are now ready for independent parallel execution. Logging gate is impossible to miss (repeated in briefing, dedicated section, every card, launch instructions). Citations and 2026 facts are embedded so no re-research. DRY + independence enforced by design.

**Next human action:** Approve (or request edits to) this package + the design spec (from parallel writer agent). Then launch via chosen option.

*Package authored 2026-05-28 as coherent independent task per user query. Output only artifacts + readiness summary to parent.*
