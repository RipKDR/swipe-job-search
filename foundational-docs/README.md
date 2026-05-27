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
