# Hi-Hired Docs Index

**Pre-build audit complete (2026-05-28) + Full hygiene + AGENTS + indexes complete (2026-05-28):** This is the canonical entry for implementation docs under **Structure B** (locked 2026-05-28 design session + gap §4): root contains *only* hygiene (LICENSE, CONTRIBUTING.md with agent lanes + Supabase logging gate per CLAUDE.md, CODE_OF_CONDUCT with AU DDA, SECURITY PII-focused, CHANGELOG keep-a, AGENTS.md practical swarm guide, .github/ templates enforcing docs/a11y/RLS/sources 2026 cites/logs) + canonical pointers (slim README, STACK.md, existing high-authority); all living depth lives in `docs/{research/, stack/, legal/, ops/, api/, testing/, analytics/, security/, a11y/, plans/}` with dated files + sub-indexes; `foundational-docs/` remains immutable strategy/history per its excellent authority guide (2026-05-28 pointers only + 04-legal note).

**Before any code or scaffold:** Read the full gap + manifest + AGENTS + CONTRIBUTING (zero blockers test):

- [research/gap-analysis-2026-05-28.md](research/gap-analysis-2026-05-28.md) (exhaustive 2026-05-28 Glob/Read/Grep/Shell catalog of 35 MDs with lengths/mods/authority/gaps; architecture map; complete ~48 required set; Structure B rationale + diagram vs flat/persona alternatives; tiered MUST (12+ hygiene + 4 stack-deep 2026 from Context7 MCP expo_dev 86.3 / supabase 82.6 + 2 legal 2026 from cursor-ide-browser fairwork.gov.au/ snapshot 511 refs/117 interactive + ops + API + indexes) / SHOULD / NICE; 8 detailed outlines with verbatim 2026 facts + cross-refs + specialist owners (alex/jordan/dev/sam); mini swarm plan §7 with OpenClaw/ruflo parallel + mandatory agent_logs gate; sources §8 with exact tool paths/dates).
- [research/required-docs-manifest.md](research/required-docs-manifest.md) (living table of all ~48: tiers, paths, owners per CLAUDE lanes, status "full 2026-05-28 by <lane> via swarm DOC-00X" for hygiene/AGENTS/indexes/stack/legal/ops/api authored, cross-refs to gap §6).
- [../AGENTS.md](../AGENTS.md) (practical "how we run swarms here": specialist lanes table with Discord IDs 15031... from CLAUDE.md, routing (openclaw agent --agent <id> / /alex Telegram / ruflo swarm-init + anti-drift + monitor-stream), **mandatory Supabase agent_logs gate** with exact curl + per-card examples (dispatch DOC-007/011/012), parallel authoring (this 2026-05-28 swarm as canonical), anti-drift, future gap refresh/code tasks; refs dispatch package + design spec § "Swarm Execution Model" + gap §6 Outline 7 / §7 / §8 / §9).
- [../CONTRIBUTING.md](../CONTRIBUTING.md) (DNA + lanes quick ref + exact logging gate + PR checklist enforcing 2026 cites/a11y/RLS/logs + swarm dispatch examples).

## Canonicals (read end-to-end first)
- [../STACK.md](../STACK.md) — Single source of truth for tech (Expo 52+ RN TS, Supabase, TanStack etc), monorepo, env, deploy, testing, legacy/superseded list.
- [BACKEND.md](BACKEND.md) — PostgreSQL schema, RLS, Edge Functions, storage, migrations (933 lines, ready for direct migration authoring; incorporates ARCHITECTURE_AUDIT fixes).
- [../foundational-docs/02-mvp-definition.md](../foundational-docs/02-mvp-definition.md) — Authoritative v1 scope, ship/not-ship, screens, success (158 lines).

## Structure B (Locked 2026-05-28; see gap §4 for rationale + diagram; design spec "Locked decisions")

**Root (hygiene + canonical pointers only — standard OSS discoverability + no sprawl):**
- [../AGENTS.md](../AGENTS.md) (swarm guide + logging gate + lanes; MUST)
- [../CONTRIBUTING.md](../CONTRIBUTING.md) (agent routing + gate + PR checklist; MUST)
- [../CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) (Covenant v2.1 + AU DDA/anti-discrim for swipe hiring; MUST)
- [../SECURITY.md](../SECURITY.md) (PII jobseeker swipes/matches + Privacy breaches + 2026 citations; MUST)
- [../LICENSE](../LICENSE) (MIT + AU Victorian law + Fair Work/Privacy/DDA note; MUST)
- [../CHANGELOG.md](../CHANGELOG.md) (keep-a-changelog seeded with 2026-05-28 audit/plan/swarm entries; MUST)
- [.github/](../.github/) (ISSUE_TEMPLATE/ bug/feature/doc_update/legal_update + PULL_REQUEST_TEMPLATE with enforced checklists: docs? a11y? RLS/Edge/security? sources 2026 cites? agent_logs?; MUST per DOC-012)
- [../README.md](../README.md) (slim: vision/status/Next Step + "Full docs complete 2026-05-28" + hygiene pointers; canonical entry)
- [../STACK.md](../STACK.md) (single source of truth: Expo 52+ RN TS + Router + Supabase + TanStack v5 + Zustand + RHF+Zod + monorepo + env 3 projects + deploy + testing + legacy/superseded list)
- Existing high-authority at root (AUTH_FLOWS.md, NOTIFICATIONS.md, GUARDRAILS.md, APP_FLOW.md, RECRUITER_FLOW.md, ARCHITECTURE_AUDIT.md, TESTING_STRATEGY.md, ANALYTICS_PLAN.md, etc. — adapt per new stack-deep docs + 2026 MCP)

**docs/ (living implementation depth by concern — scalable, DRY, agent-optimized):**
- [research/](research/) — Gap-analysis-2026-05-28.md (living audit + outlines + swarm plan + citations), required-docs-manifest.md (status table), COMPETITOR_2026..., MELBOURNE_NORTH_..., VALIDATION_..., research-notes/ (raw MCP/browser pulls e.g. fairwork snapshot 2026-05-27 YAML + expo_dev 86.3 snippets); "Start here" for authors (gap §6 outlines).
- [stack/](stack/) — Deep 2026 refs from Context7 MCP 2026-05-28 (EXPO_ROUTER_AUTH_NOTIFS_HAPTICS_2026.md, SUPABASE_RLS_EDGE_STORAGE_REALTIME_JOBS_2026.md, TANSTACK_QUERY_ZUSTAND_RHF_ZOD_RN_2026.md, EXPO_NOTIFICATIONS_EDGE_PROCESSOR_2026.md; full prose + TS/SQL examples + gotchas + testing; replaces "adapt" notes in AUTH/NOTIF/GUARDRAILS).
- [legal/](legal/) — AU compliance 2026 (AU_FAIR_WORK_PAY_TRANSPARENCY_CASUAL_2026.md from fairwork browser snapshot 2026-05-27 pay emphasis + 117 interactive refs; PRIVACY_ACT_RECRUITMENT_JOBSEEKER_DATA_2026.md + ARCH consent flag gap; ANTI_DISCRIM..., ASURIA...; pointer update to foundational 04-legal post-v1).
- [ops/](ops/) — MIGRATION_RUNBOOK_FROM_BACKEND.md (numbered from BACKEND + ARCH fixes + seed + verify + CI + smoke), EAS_BUILD_DEPLOY_CHECKLIST.md, INCIDENT_RESPONSE_MATCHES_NOTIFICATIONS.md (ARCH CRITICAL queue), DATA_RETENTION_PURGE_PLAN.md (Privacy PII 30/90d).
- [api/](api/) — EDGE_FUNCTIONS_CONTRACTS.md (match-notify atomic + 23505, notification-processor queue/Expo/Resend/idempotency, auth hooks, TS/OpenAPI, error codes, local test), AUTH_FLOWS_EXPO_2026.md (PKCE/SecureStore/deep links per MCP + STACK).
- [testing/](testing/), [analytics/](analytics/), [security/](security/), [a11y/](a11y/) — Expand existing (TESTING_STRATEGY 421ln, ANALYTICS_PLAN, GUARDRAILS 99ln) with RN/Supabase 2026 specifics (Maestro/RTL/Vitest, PostHog/Sentry impl, @axe-core/react-native, MCP haptics, RLS/Edge test notes, WCAG 2.2 AA + DDA full checklist).
- [plans/](plans/) — Dated (keep 2026-05-27-001 697ln Expo MVP plan; archive old Next.js/Capacitor).
- [BACKEND.md](BACKEND.md) (canonical 933ln: ERD, full Postgres enums/tables/profiles/jobs/swipes/matches/.../notification_queue/device_tokens with RLS hints, Edge specs per ARCH, storage, migration order, post-MVP).
- [ARCHITECTURE_AUDIT.md](ARCHITECTURE_AUDIT.md) (2026-05-27 pre-code CRITICAL: match TOCTOU → UNIQUE + atomic + 23505 ignore; notif fire-and-forget → queue + processor + idempotency; bulk_swipe_consent missing = Privacy violation).

**foundational-docs/ (immutable history/strategy per its README authority guide — 2026-05-28 pointers only):**
- [../foundational-docs/](../foundational-docs/) — 00-vision-manifesto.md (thesis), 02-mvp-definition.md (authoritative v1 scope/ship list/screens/success), PROJECT_CONTEXT.md, 01-07 strategy/risks/validation (historical), 04-legal-data-sources.md (partially superseded by new docs/legal/ + gap; add pointer/archive post-v1), analysis/obstacle-analysis.md (Sidekicker + data model gaps), README.md (authority table + "when in doubt" + intentional divergences resolved + 2026-05-28 audit section with gap links).

**Superseded / Stale / Deferred (banners + pointers; do not scaffold from; see STACK legacy + foundational divergences + gap §1):**
- SPEC.md, MOBILE_STRATEGY.md (Next.js/Capacitor/bilateral → Expo RN + employer-init per ARCH/STACK 2026-05-27), old plans/2026-05-26 (superseded by 2026-05-27-001 + new docs/plans/), PROVIDER_PORTAL.md (deferred post-MVP per BACKEND/02-mvp/ARCH).

See gap §4 for full rationale (avoids sprawl, DRY, agent/human-friendly, pre-code zero blockers, fits OpenClaw/CLAUDE specialist model + logging gate + 2026 MCP/browser research). All new files follow voice of STACK/BACKEND/gap/foundational-docs/README (tables, banners, exact relative links, "when docs disagree this wins", "new dev/agent has zero blockers" success criterion). No build step (pure Markdown, GitHub-flavored).

## Foundational / History (immutable; see its README authority guide)
- [../foundational-docs/](../foundational-docs/) — Strategy (00-vision to 07-refinement, PROJECT_CONTEXT, obstacle-analysis, 04-legal etc). Authority map + divergences resolved. 2026-05-28 update: see research/gap for pre-build audit + 2026 research (MCP/browser); 04-legal partially superseded by new legal/.

## UX / Domain / Other (adapt or reference)
- Root: APP_FLOW.md, AUTH_FLOWS.md (adapt Next->Expo per STACK + new stack/ EXPO_ doc), NOTIFICATIONS.md (adapt OneSignal->Expo + queue per ARCH/BACKEND), GUARDRAILS.md (adapt Capacitor/Playwright; a11y WCAG + Privacy), RECRUITER_FLOW.md (rename employer), ANALYTICS_PLAN.md, RESEARCH_INTEL.md (thin; see research/ for 2026 updates), BUSINESS_MODEL.md, ASURIA_PARTNERSHIP.md, MELBOURNE_STRATEGY.md (thin 20ln), etc.
- Superseded (banners): SPEC.md, MOBILE_STRATEGY.md, old plans/ (see STACK legacy + gap §1).

## Next Step for Developers (expanded from root README; zero blockers confirmed 2026-05-28)

**Full docs complete 2026-05-28 (hygiene + AGENTS + indexes + key stack/legal/ops/api per swarm DOC-007/011/012 + design spec + gap):** All MUST-tier items in place under Structure B. New dev or specialist agent (alex/maya/jordan/dev/sam or swarm coordinator via ruflo/OpenClaw) following this + the listed files reaches scaffold/migration readiness in <30min with **zero external searches, MCP re-calls, or questions**.

1. Read [research/gap-analysis-2026-05-28.md](research/gap-analysis-2026-05-28.md) (full or targeted §4/5/6) + [research/required-docs-manifest.md](research/required-docs-manifest.md) + [../AGENTS.md](../AGENTS.md) + [../CONTRIBUTING.md](../CONTRIBUTING.md) (swarm ops + exact logging gate + PR enforcement).
2. Read [../STACK.md](../STACK.md) + [BACKEND.md](BACKEND.md) end-to-end (canonicals per foundational-docs/README authority table + "when in doubt").
3. Read gap §4 (Structure B) + §5 (MUST) + relevant §6 outlines (e.g. EXPO_ + SUPABASE_ stack-deep with MCP 86.3/82.6 2026-05-28 facts + code; AU_FAIR_WORK + PRIVACY legal with fairwork browser 2026-05-27 snapshot + ARCH consent flag; MIGRATION_RUNBOOK; EDGE_FUNCTIONS_CONTRACTS) + [../docs/ops/MIGRATION_RUNBOOK_FROM_BACKEND.md](ops/MIGRATION_RUNBOOK_FROM_BACKEND.md).
4. Hygiene in place (all root + .github/ per this index + AGENTS + CONTRIBUTING).
5. Scaffold monorepo per STACK (Expo 52+/v55/56 RN TS, pnpm workspaces, EAS, 3 Supabase projects).
6. Migrations per runbook + BACKEND (extensions/enums/tables/RLS/functions/storage/realtime/seed beachhead per 02-mvp; verify + smoke swipe→notif).
7. Auth/swipe/haptics/notifs per new stack-deep docs + verbatim MCP 2026-05-28 + ARCH fixes (atomic match, queue processor).

**Evidence of readiness (design spec verification checklist + gap §0 goal + root "Next Step"):** Can list locked decisions (Structure B, Approach 2 Parallel Swarm, Full scope); states match model/roles/push provider correctly; from AU_FAIR_WORK alone knows 2026 pay transparency (every card specific rate/hours) + UI implications (hospitality beachhead); from Privacy + ARCH identifies bulk_swipe_consent gap + fix; from EXPO_/SUPABASE_ + BACKEND can sketch Router auth groups + SecureStore init + deep links + haptics + RLS for jobs/swipes + atomic insert + pgmq Edge loop; from MIGRATION_RUNBOOK + BACKEND can run first migrations + seed + smoke end-to-end; from AGENTS + CONTRIBUTING + CLAUDE knows lanes, can draft dispatch, knows exact agent_logs curl and that it is mandatory before final; navigates Structure B via indexes; opens ≤8-10 files total; no web/MCP hunt needed. All per 2026-05-28 citations (MCP paths/dates, browser snapshot, local tools, ARCH, gap §8).

See [../README.md](../README.md) (Next Step + "Full docs complete 2026-05-28" + hygiene list), [../foundational-docs/README.md](../foundational-docs/README.md) (authority + 2026-05-28 pointers + 04-legal note), [research/swarm-dispatch-2026-05-28-full-docs.md](research/swarm-dispatch-2026-05-28-full-docs.md) (cards + log templates + synthesis), design spec 2026-05-28 (full rationale + ACs + swarm model + verification), gap §9 (artifacts + next), AGENTS.md (full ops + examples). All DRY, cited, consistent voice (tables, banners, "zero blockers", authority notes). Re-audit on major changes (SDK/Fair Work/Privacy). Human legal signoff + logs verified before scaffold.

*Maintained 2026-05-28 onward via manifest + gap triggers. Update on authoring. Swarm coordinator (orchestrator + sam) gate + human compliance signoff.*