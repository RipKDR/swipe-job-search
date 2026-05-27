# Foundational Docs — Hi-Hired

Strategy and product documents from the concept phase. These capture **why** and **what** to build; implementation details live elsewhere.

---

## Authority Guide

| When you need… | Read this | Not this |
|----------------|-----------|----------|
| Tech stack, tooling, deployment | [**../STACK.md**](../STACK.md) | `03-technical-build-plan.md` (partially stale) |
| Database schema, RLS, Edge Functions | [**../docs/BACKEND.md**](../docs/BACKEND.md) | `SPEC.md` §3–§6 |
| MVP scope, screens, data model intent | [**02-mvp-definition.md**](02-mvp-definition.md) | `plans/` Next.js tasks |
| Product vision, positioning, non-goals | [**PROJECT_CONTEXT.md**](PROJECT_CONTEXT.md), [**00-vision-manifesto.md**](00-vision-manifesto.md) | — |
| Beachhead, GTM, validation | [**05-validation-plan.md**](05-validation-plan.md), [**01-strategy-memo.md**](01-strategy-memo.md) | — |
| Legal, data sourcing constraints | [**04-legal-data-sources.md**](04-legal-data-sources.md) | — |
| Risks | [**06-risks-and-mitigations.md**](06-risks-and-mitigations.md) | — |

**Canonical stack:** [../STACK.md](../STACK.md) supersedes stack sections in `03-technical-build-plan.md`, [../SPEC.md](../SPEC.md), and [../MOBILE_STRATEGY.md](../MOBILE_STRATEGY.md).

---

## Document Index

| File | Purpose | Still authoritative for |
|------|---------|---------------------------|
| [00-vision-manifesto.md](00-vision-manifesto.md) | Vision and principles | Product identity |
| [01-strategy-memo.md](01-strategy-memo.md) | Strategy narrative | GTM thinking |
| [02-mvp-definition.md](02-mvp-definition.md) | **MVP scope** | Features in/out, screens, success metrics |
| [03-technical-build-plan.md](03-technical-build-plan.md) | Original build plan | Monorepo *intent* only — verify stack against STACK.md |
| [04-legal-data-sources.md](04-legal-data-sources.md) | Legal constraints | Compliance, data sourcing |
| [05-validation-plan.md](05-validation-plan.md) | Validation approach | Pre-build customer discovery |
| [06-risks-and-mitigations.md](06-risks-and-mitigations.md) | Risk register | Planning reviews |
| [07-concept-refinement.md](07-concept-refinement.md) | Concept evolution | Historical context |
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | Agent session context | Quick orientation |
| [analysis/obstacle-analysis.md](analysis/obstacle-analysis.md) | Obstacle analysis | Strategy |

---

## Intentional divergences (resolved in canonical docs)

| Topic | Foundational doc said | Canonical resolution |
|-------|----------------------|----------------------|
| Admin web in Phase 0 | `03-technical-build-plan.md` includes `apps/admin` | Admin **deferred** — employers use mobile app ([STACK.md](../STACK.md)) |
| Role name | `job_seeker` / `employer` in 02-mvp | **`candidate` / `employer`** in schema ([BACKEND.md](../docs/BACKEND.md)) |
| Match model | Employer taps Chat on interested list (02-mvp) | Same — **not** bilateral swipe-to-match (SPEC.md outdated) |
| Push | "Phase 2" in 03-technical-build-plan | **In MVP** via Expo Notifications ([STACK.md](../STACK.md)) |

When in doubt: **product scope** → `02-mvp-definition.md`; **implementation** → `STACK.md` + `docs/BACKEND.md`.

---

## 2026-05-28 Pre-Build Docs Audit & Research Update + Full Hygiene + AGENTS + Indexes Complete

**Pre-implementation audit complete (2026-05-28) + Full hygiene + AGENTS + indexes complete (2026-05-28):** See [../docs/research/gap-analysis-2026-05-28.md](../docs/research/gap-analysis-2026-05-28.md) (primary source) + [../docs/research/required-docs-manifest.md](../docs/research/required-docs-manifest.md) + [../AGENTS.md](../AGENTS.md) + [../CONTRIBUTING.md](../CONTRIBUTING.md) + design spec 2026-05-28 for:
- Exhaustive 2026-05-28 Glob/Read/Grep/Shell catalog of all 35 existing .md (lengths, mods 2026-05-27 cluster, purposes, authority, 80+ self-reported "superseded/deferred/adapt" gaps).
- Architecture map (flat sprawl → Structure B rationale + diagram vs alternatives; overlaps minimal, contradictions resolved in canonicals per BACKEND decisions table + STACK legacy + this README authority).
- Complete required set (~48 files for Expo 52+ RN TS + Supabase Sydney + AU casual Melbourne north beachhead hospitality/retail + compliance (Fair Work 2026 pay transparency, Privacy Act jobseeker PII/swipes/matches + bulk consent flag per ARCH CRITICAL 2026-05-27, DDA/Asuria/DES, App Store) + agent-orchestrated (OpenClaw/ruflo specialists + mandatory Supabase agent_logs gate per CLAUDE.md)).
- **Locked Structure B (design spec + gap §4):** Root = hygiene (LICENSE + CONTRIBUTING with lanes/gate + CODE_OF_CONDUCT with AU DDA + SECURITY PII + CHANGELOG + AGENTS.md swarm guide + .github/ templates with docs/a11y/RLS/2026-cites/logs checklists) + canonical pointers only (slim README, STACK, existing high-authority like this README/02-mvp/PROJECT_CONTEXT/ARCH); living depth in `docs/{research/ (gap+manifest+2026 intel+notes), stack/ (4x 2026 MCP refs from Context7 expo_dev 86.3 / supabase 82.6 2026-05-28), legal/ (2x AU 2026 from fairwork browser snapshot 2026-05-27 511 refs/117 interactive + ARCH), ops/ (migration + EAS + incident + retention), api/ (Edge contracts + auth), testing/analytics/security/a11y/ (RN/Supabase expands), plans/ (dated)}`; foundational-docs/ = immutable strategy/history (this README authority guide preserved; 2026-05-28 pointers + 04-legal note only; no content changes except audit section).
- Tiered MUST (12+ before scaffold: 8 hygiene/AGENTS/.github + 4 stack-deep 2026 + 2 legal 2026 + migration + API + indexes/manifest/gap artifacts) / SHOULD (EAS/incident/retention, 2026 intel, RN expands, adapt) / NICE (post-MVP).
- 8 detailed outlines in gap §6 (EXPO_ / SUPABASE_ / AU_FAIR_WORK / PRIVACY / MIGRATION / EDGE / AGENTS / manifest) with verbatim 2026 facts (Context7 MCP paths/dates/benchmarks 86.3/82.6 + snippets; cursor-ide-browser fairwork 2026-05-27 snapshot + ref IDs e9/e10/e12/e52 + 404 legacy; ARCH CRITICAL race/notif/consent; local tool timestamps), cross-refs (DRY to STACK/BACKEND/02-mvp/ARCH/GUARDRAILS/this README), specialist owners (alex research/legal, jordan arch/AGENTS, dev hygiene/impl, sam qa/.github, swarm coord indexes), acceptance (zero-blockers test).
- Mini swarm plan §7 (Approach 2 Parallel 4-6 agents 1-2 days wall-clock; OpenClaw/ruflo dispatch with anti-drift; mandatory agent_logs gate before final per CLAUDE + exact curl; prep/review/synth steps; anti-patterns; success = all MUST full + indexes updated + logs verified + human legal signoff + "Next Step" follower unblocked).
- Citations §8 (all tool/MCP/browser 2026-05-28/27 with exact paths; no invention).
- Artifacts §9 (dirs + 6 outline stubs + manifest + gap + partial index updates; this swarm completed the hygiene/AGENTS/index cross-cut).

**Action for 04-legal-data-sources.md:** Partially superseded by new [../docs/legal/AU_FAIR_WORK_PAY_TRANSPARENCY_CASUAL_2026.md](../docs/legal/AU_FAIR_WORK_PAY_TRANSPARENCY_CASUAL_2026.md) and PRIVACY_ACT_RECRUITMENT_JOBSEEKER_DATA_2026.md (MUST tier, from 2026 Fair Work site pay emphasis + ARCH "bulk_swipe_consent missing = Privacy Act violation" gap + browser snapshot 2026-05-27). Add pointer or archive post-v1 authoring per gap §6 Outline 3/4 + design §3. See also GUARDRAILS §7 AU Privacy + new ANTI_DISCRIM / ASURIA hooks.

**New research/ living folder + hygiene/AGENTS complete:** [../docs/research/](../docs/research/) (gap-analysis as living audit, required-docs-manifest as single table, COMPETITOR_2026 etc, research-notes/ raw MCP pulls e.g. fairwork snapshot + expo_dev snippets). Root hygiene + AGENTS.md + .github/ templates now present (full 2026-05-28 per swarm DOC-007/011/012 + design §1 + gap §3/5/6 Outline 7 / §7). Re-audit quarterly or on major (new Expo SDK, Fair Work amendments, Privacy Act changes, post-v1). See AGENTS.md for swarm dispatch examples (this package itself) + logging gate + anti-drift.

**Indexes updated 2026-05-28 (Structure B + "Full docs complete"):** [../README.md](../README.md) (Next Step + hygiene list + zero-blockers + "Full docs complete 2026-05-28" pointers), [../docs/README.md](../docs/README.md) (central entry + full Structure B navigation + "Full docs complete 2026-05-28" + AGENTS/CONTRIBUTING pointers + zero-blockers checklist), this file (authority preserved + 2026-05-28 audit + gap links + 04-legal note). Consistent voice: tables, banners, exact relative links, "when in doubt this wins", "new dev/agent has zero blockers from missing knowledge", 2026 citations (MCP/browser/local 2026-05-28).

This keeps foundational-docs/ as immutable strategy history while ensuring 2026 freshness, Structure B compliance, agent/human-friendliness (AGENTS.md + swarm plan + logging gate per CLAUDE.md), Australian compliance (Fair Work/Privacy/DDA), and zero blockers for "Next Step" follower before scaffold. Update this section + manifest + gap §6 on every authoring. Human legal/compliance signoff + all agent_logs verified before scaffold approval.

**Full docs complete 2026-05-28 (hygiene + AGENTS + indexes + stack/legal/ops/api per swarm):** See dispatch package (cards + exact curls + synthesis), design spec (locked decisions + verification 10-item checklist + swarm model + risks), gap §9 (artifacts + next), AGENTS.md (full ops + recommendations for human review of .github templates), CHANGELOG.md (Unreleased 2026-05-28 entries), required-docs-manifest (rows 1-10/41-43 now full). DRY (reference canonicals + gap outlines; no dupe of schema/MVP/flows). All per 2026-05-28 sources with timestamps/paths. Re-audit triggers documented. Scaffold only after human signoff + logs + zero-blockers pass.
