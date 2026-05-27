# Hi-Hired Required Documentation Manifest

**Date:** 2026-05-28 (baseline from gap-analysis-2026-05-28.md)  
**Purpose:** Single table of ALL recommended MD files for production-grade pre-impl (Expo 52+ RN TS + Supabase + AU casual Melbourne beachhead + compliance + agent-orchestrated). Tiers, owners, status, paths, cross-refs. Update on changes. DRY reference to gap-analysis for details/outlines/research.

**Total recommended:** ~48 (current 35 existing; net +13 baseline; post-2026-05-28 swarm delivered ~+20 (root hygiene 8 + .github 5 + docs/ stack(2 primary)/legal(2)/ops(4)/api(1)/a11y/analytics/research swarm files + indexes + AGENTS; see Glob 20 docs/** + pre-scaffold-readiness-report); many MUST now "full 2026-05-28 by <lane> via DOC-00X" (TANSTACK/EXPO_NOTIF assigned but not materialized per Glob)).  

**Tiers:** MUST (v1 build start blockers; complete before scaffold), SHOULD (first dev sprint / launch gates), NICE (post-MVP/completeness).

**Owners (per CLAUDE.md / OpenClaw specialists + gap §7):** alex (research/legal/intel), jordan (arch/backend/api/ops), dev (impl/adapt/stack code examples), sam (qa/testing/a11y/analytics/incident), maya (UX flows/a11y polish), swarm (parallel authoring via ruflo/OpenClaw), human (legal/compliance signoff, final review). Every author logs to agent_logs before final (per CLAUDE.md).

**Status key:** exists (current canonical or good), outline (stub + gap §6 details), full (authored prose), adapt (existing needs 2026 RN/Expo update), superseded (banner; archive post-v1), deferred (post-MVP), thin (exists but <50ln or outdated).

**Sources for baseline:** gap-analysis-2026-05-28.md (full catalog 35 + research MCP/browser 2026-05-28 + proposed structure + tiers + outlines). Update this manifest on authoring.

| # | File | Tier | Path | Owner | Status (2026-05-28) | Cross-Refs / Notes |
|---|------|------|------|-------|---------------------|--------------------|
| 1 | LICENSE | MUST | root/LICENSE | human (legal) | missing | Standard MIT/Apache + AU notes. |
| 2 | CONTRIBUTING.md | MUST | root/CONTRIBUTING.md | jordan + human | missing | Agent routing (/alex etc), supabase agent_logs gate (CLAUDE.md), PR process, specialist lanes. |
| 3 | CODE_OF_CONDUCT.md | MUST | root/CODE_OF_CONDUCT.md | human | missing | Contributor Covenant + AU DDA/anti-discrim. |
| 4 | SECURITY.md | MUST | root/SECURITY.md | jordan | missing | PII (jobseeker swipes/matches), breach notification, vuln reporting, App Store reqs. |
| 5 | CHANGELOG.md | MUST | root/CHANGELOG.md | dev | missing | Keep-a-changelog; pre-0.1.0 entries from plans/gap. |
| 6-8 | .github/ISSUE_TEMPLATE/*.md (bug, feature, doc, legal) | MUST | .github/ISSUE_TEMPLATE/ | sam + jordan | missing (0 .github md) | Templates with docs/a11y/RLS checklist. |
| 9 | .github/PULL_REQUEST_TEMPLATE.md | MUST | .github/PULL_REQUEST_TEMPLATE.md | sam | missing | Checklist: updated docs? tests? a11y? sources cited? RLS verified? |
| 10 | AGENTS.md | MUST | root/AGENTS.md | jordan (or swarm) | missing | Swarm/OpenClaw usage (alex etc lanes, logging gate, parallel for docs per gap §7), ruflo/claude-flow. See gap §6 outline 7. |
| 11 | EXPO_ROUTER_AUTH_NOTIFS_HAPTICS_2026.md | MUST | docs/stack/EXPO_ROUTER_AUTH_NOTIFS_HAPTICS_2026.md | jordan + dev | **full 2026-05-28** | Implemented by jordan (arch) + dev via swarm DOC-001 (parallel 2026-05-28). Header confirms "FULL PROSE — Authored by jordan via DOC-2026-05-28-001". MCP Context7 expo_dev 86.3 2026-05-28 verbatim. See [gap §6 Outline 1](../research/gap-analysis-2026-05-28.md#outline-1-expo...) + dispatch DOC-001 + design spec. Cross STACK/BACKEND/ARCH/02-mvp. (TANSTACK/EXPO_NOTIF assigned DOC-009/010 but not in post-Glob docs/stack/.) |
| 12 | SUPABASE_RLS_EDGE_STORAGE_REALTIME_JOBS_2026.md | MUST | docs/stack/SUPABASE_RLS_EDGE_STORAGE_REALTIME_JOBS_2026.md | jordan | **full 2026-05-28** | Implemented by jordan via swarm DOC-002. Per gap §6 Outline 2 + dispatch + MCP supabase 82.6 2026-05-28 (RLS, pgmq Edge, realtime/storage). See [gap §6 Outline 2](../research/gap-analysis-2026-05-28.md#outline-2-...) + design spec §2. Cross BACKEND/ARCH/02-mvp/new API. |
| 13 | TANSTACK_QUERY_ZUSTAND_RHF_ZOD_RN_2026.md | MUST | docs/stack/TANSTACK_QUERY_ZUSTAND_RHF_ZOD_RN_2026.md | jordan + dev | missing | RN patterns for swipe optimistic, forms, cache. Cross STACK, new EXPO_ stack. |
| 14 | EXPO_NOTIFICATIONS_EDGE_PROCESSOR_2026.md | MUST | docs/stack/EXPO_NOTIFICATIONS_EDGE_PROCESSOR_2026.md | jordan + dev | missing (adapt NOTIFICATIONS) | MCP + ARCH CRITICAL2 + BACKEND queue. |
| 15 | POSTHOG_ANALYTICS_TAXONOMY_RN_IMPL.md | SHOULD | docs/analytics/POSTHOG_ANALYTICS_TAXONOMY_RN_IMPL.md | sam | missing (build ANALYTICS_PLAN 84ln) | Events/funnels/flags for RN. |
| 16 | SENTRY_RN_PERF_MONITORING.md | SHOULD | docs/analytics/SENTRY_RN_PERF_MONITORING.md | sam | missing | Crashes/perf/breadcrumbs RN. |
| 17 | RESEND_EMAIL_FALLBACK.md | NICE | docs/stack/RESEND_EMAIL_FALLBACK.md | dev | missing (build NOTIFICATIONS) | Re-engage only (STACK). |
| 18 | AU_FAIR_WORK_PAY_TRANSPARENCY_CASUAL_2026.md | MUST | docs/legal/AU_FAIR_WORK_PAY_TRANSPARENCY_CASUAL_2026.md | alex | **full 2026-05-28** | Implemented by alex via swarm DOC-003. Header: "FULL 2026-05-28 by alex (research/legal specialist lane) via Hi-Hired parallel authoring swarm (DOC-003)". 2026 facts from cursor-ide-browser fairwork 2026-05-27 snapshot (511 refs/117 interactive). See [gap §6 Outline 3](../research/gap-analysis-2026-05-28.md#outline-3-...) + dispatch DOC-003 + design spec §3. Cross 02-mvp/BACKEND/GUARDRAILS/04-legal (pointer). |
| 19 | PRIVACY_ACT_RECRUITMENT_JOBSEEKER_DATA_2026.md | MUST | docs/legal/PRIVACY_ACT_RECRUITMENT_JOBSEEKER_DATA_2026.md | alex | outline (stub) | APPs, consent (ARCH missing bulk flag), retention, OAIC. Cross GUARDRAILS §7/04-legal/ASURIA/DATA_RETENTION. See gap §6 outline 4. |
| 20 | ANTI_DISCRIMINATION_SWIPE_HIRING_AU.md | SHOULD | docs/legal/ANTI_DISCRIMINATION_SWIPE_HIRING_AU.md | alex | missing | DDA, Fair Work adverse action, swipe bias UX mitigations. Cross GUARDRAILS a11y. |
| 21 | ASURIA_DES_PROVIDER_COMPLIANCE_HOOKS.md | SHOULD | docs/legal/ASURIA_DES_PROVIDER_COMPLIANCE_HOOKS.md | alex | missing (build ASURIA_PARTNERSHIP 119ln) | Reporting, consent flag (ARCH gap), bulk. Cross 02-mvp (deferred), BACKEND (excluded MVP). |
| 22 | Update 04-legal-data-sources.md (pointer) | MUST | foundational-docs/04-legal-data-sources.md | alex | exists (186ln, 2026-05-27) but thin/outdated | Add pointer to new /legal/ AU_*.md + gap. Archive post-v1. |
| 23 | MIGRATION_RUNBOOK_FROM_BACKEND.md | MUST | docs/ops/MIGRATION_RUNBOOK_FROM_BACKEND.md | jordan + dev | outline (stub) | Numbered from BACKEND §, seed, verify RLS/Edge, CI. Cross STACK deploy, new API_CONTRACTS, docs/plans/2026-05-27-001. See gap §6 outline 5. |
| 24 | EAS_BUILD_DEPLOY_CHECKLIST.md | SHOULD | docs/ops/EAS_BUILD_DEPLOY_CHECKLIST.md | dev + sam | missing | Dev client -> preview -> prod, env matrix (STACK), supabase cli. Cross MIGRATION_RUNBOOK. |
| 25 | INCIDENT_RESPONSE_MATCHES_NOTIFICATIONS.md | SHOULD | docs/ops/INCIDENT_RESPONSE_MATCHES_NOTIFICATIONS.md | sam + jordan | missing | Queue backpressure/retry, paging (ARCH CRITICAL). Cross NOTIFICATIONS/BACKEND. |
| 26 | DATA_RETENTION_PURGE_PLAN.md | SHOULD | docs/ops/DATA_RETENTION_PURGE_PLAN.md | jordan + human | missing | PII jobseeker/swipes/matches (Privacy Act), 30/90d policies. Cross new PRIVACY, BACKEND. |
| 27 | COMPETITOR_ANALYSIS_2026_SEEK_INDEED_AU_LOCAL.md | SHOULD | docs/research/COMPETITOR_ANALYSIS_2026_SEEK_INDEED_AU_LOCAL.md | alex | missing (build RESEARCH_INTEL 46ln) | 2026 Seek/Indeed/Sidekicker (obstacle-analysis). Cross gap research, MELBOURNE. |
| 28 | MELBOURNE_NORTH_SUBURBS_JOB_MARKET_2026.md | SHOULD | docs/research/MELBOURNE_NORTH_SUBURBS_JOB_MARKET_2026.md | alex | thin (20ln) | 2026 signals (unemp, hospitality shortages, FB groups). Sources ABS/Seek. Cross MELBOURNE_STRATEGY, gap. |
| 29 | VALIDATION_DATA_SOURCES_2026.md | SHOULD | docs/research/VALIDATION_DATA_SOURCES_2026.md | alex | missing (build 05-validation 172ln) | Surveys, Asuria intros, gov data. Cross gap, 05-validation. |
| 30 | research-notes/ (raw pulls) | NICE | docs/research/research-notes/ | swarm | dir created | MCP/browser excerpts (e.g. expo notif code, fairwork snapshot YAML). See gap §8. |
| 31 | EDGE_FUNCTIONS_CONTRACTS.md | MUST | docs/api/EDGE_FUNCTIONS_CONTRACTS.md | jordan | outline (stub) | Detailed match-notify, notif-processor, auth hooks (from BACKEND + MCP + ARCH). OpenAPI/TS. Cross SUPABASE_ stack, NOTIFICATIONS, 02-mvp. See gap §6 outline 6. |
| 32 | AUTH_FLOWS_EXPO_2026.md | SHOULD | docs/api/AUTH_FLOWS_EXPO_2026.md | jordan + dev | missing (adapt AUTH_FLOWS 234ln) | PKCE/deep links/SecureStore (MCP + STACK). Cross EXPO_ stack, new API_CONTRACTS. |
| 33 | Expand TESTING_STRATEGY.md | SHOULD | docs/testing/TESTING_STRATEGY.md (or root) | sam | exists (421ln) but adapt | RN/Maestro/RTL/RLS int (STACK note). Cross GUARDRAILS, new a11y. |
| 34 | SECURITY_AUDIT_PLAN.md | SHOULD | docs/security/SECURITY_AUDIT_PLAN.md | jordan | missing | RLS review, PII, rate limits, App Store. Cross GUARDRAILS §7, BACKEND. |
| 35 | Update GUARDRAILS.md (RN a11y/haptics) | SHOULD | root/GUARDRAILS.md (99ln) | maya + sam | exists, adapt (Capacitor/Playwright) | MCP haptics, @axe-core/react-native, Maestro. Cross new a11y/EXPO_ stack. |
| 36 | ACCESSIBILITY_AUDIT_CHECKLIST.md | SHOULD | docs/a11y/ACCESSIBILITY_AUDIT_CHECKLIST.md | sam + maya | missing (build GUARDRAILS WCAG) | WCAG 2.2 AA + AU DDA/DES full. Cross GUARDRAILS, new ANTI_DISCRIM. |
| 37 | POSTHOG_TAXONOMY_IMPL_RN.md | SHOULD | docs/analytics/POSTHOG_TAXONOMY_IMPL_RN.md | sam | missing (build ANALYTICS_PLAN 84ln) | Events from plan + RN/PostHog SDK. Cross new POSTHOG analytics. |
| 38 | SENTRY_PERF_RN_BUDGETS.md | NICE | docs/analytics/SENTRY_PERF_RN_BUDGETS.md | sam | missing | Perf budgets, RN integration. |
| 39 | docs/swarm/OPENCLAW_RUFLO_CLAUDE_FLOW_USAGE.md (or AGENTS.md) | SHOULD | docs/swarm/... or root/AGENTS.md | jordan + swarm | missing (build AGENTS.md outline) | Dispatch, parallel authoring (gap §7), logging gate, anti-drift. Cross gap §6/7, CONTRIBUTING. |
| 40 | .github/AGENT_TASK_TEMPLATES/ | NICE | .github/... | swarm | missing | Templates for doc/code tasks (gap §7). |
| 41 | docs/README.md (new index) | MUST | docs/README.md | (this + human) | missing (created) | Full structure + links to gap + canonicals + "Start here". See gap §4. |
| 42 | Update root README.md | MUST | root/README.md (84ln) | (this + human) | exists, update | Add gap link + "Pre-build audit 2026-05-28" to Doc Map/Next Step. |
| 43 | Update foundational-docs/README.md | MUST | foundational-docs/README.md (49ln) | (this + alex) | exists, update | Add gap/research/legal pointers + 04-legal note. See gap §4. |
| 44-48 | Misc/niche (Resend details, future admin, quarterly audit script, etc) | NICE | various | various | missing | Per gap §5. |

**Notes:**
- Existing 35 mapped in gap-analysis-2026-05-28.md §1 (canonicals like STACK/BACKEND/02-mvp/found README/PROJECT_CONTEXT/ARCH exist good; superseded SPEC/MOBILE/old plans well-bannered; UX like AUTH/NOTIF/GUARDRAILS exist but adapt; domain like RESEARCH/MELBOURNE/PITCH thin; plans recent 697ln good).
- Update this manifest + gap on every authoring (append "Implemented 2026-05-XX by <owner/agent>").
- Total files grow to ~48; structure per gap §4 (docs/ subdirs + root hygiene + foundational/ archive).
- Swarm/human: Use outlines in gap §6 for MUST (EXPO/SUPABASE/FAIR_WORK/PRIVACY/MIGRATION/API/AGENTS/manifest). Log gate mandatory.
- Review cadence: Re-audit on major (new SDK, Fair Work amendment, post-v1).

**End state:** "Next Step" follower (per root README) reads gap + manifest + 3-4 MUST + STACK + BACKEND + 02-mvp = zero blockers. All auditable, agent-friendly, 2026-fresh.

*See gap-analysis-2026-05-28.md for full catalog (35 existing with lengths/mods/gaps), architecture map, complete set rationale, proposed structure, outlines, swarm plan, citations (MCP/browser 2026-05-28).*