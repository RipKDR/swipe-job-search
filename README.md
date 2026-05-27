# Hi-Hired

**A job finder like SEEK, but built for humans.** No keywords. No black holes. No bullshit.

Job seekers swipe local jobs with transparent pay and hours. Employers review who's interested and start a chat. Both sides confirm when someone's hired.

**Tagline:** *The algorithm is you.*

---

## Status

| Phase | State |
|-------|-------|
| Product direction | ✅ Locked |
| Canonical planning docs | ✅ Complete |
| Repo scaffold (Expo monorepo) | ⬜ Not started |
| Supabase migrations | ⬜ Not started |
| App Store submission | ⬜ Future |

**Beachhead:** Tullamarine, Gladstone Park, Airport West and surrounding northern Melbourne suburbs.

---

## Start Here

| Doc | Purpose |
|-----|---------|
| [**STACK.md**](STACK.md) | Canonical tech stack — Expo, Supabase, tooling, env vars, deployment |
| [**docs/BACKEND.md**](docs/BACKEND.md) | PostgreSQL schema, RLS, Edge Functions, match logic — write migrations from this |

---

## Doc Map

### Authoritative (build from these)

| Doc | Contents |
|-----|----------|
| [STACK.md](STACK.md) | Technology choices, monorepo layout, env matrix |
| [docs/BACKEND.md](docs/BACKEND.md) | Database, RLS, storage, notifications, migrations |
| [foundational-docs/02-mvp-definition.md](foundational-docs/02-mvp-definition.md) | MVP scope, screens, success criteria |
| [foundational-docs/PROJECT_CONTEXT.md](foundational-docs/PROJECT_CONTEXT.md) | Product context, risks, strategic non-goals |

### UX & flows (implement against MVP; adapt stack references)

| Doc | Contents |
|-----|----------|
| [APP_FLOW.md](APP_FLOW.md) | Onboarding, swipe loop, match, chat sequences |
| [RECRUITER_FLOW.md](RECRUITER_FLOW.md) | Employer job posting and interested-list UX (rename recruiter → employer in UI) |
| [AUTH_FLOWS.md](AUTH_FLOWS.md) | Auth methods — adapt from Next.js cookies to Expo SecureStore |
| [NOTIFICATIONS.md](NOTIFICATIONS.md) | Notification types — adapt OneSignal → Expo Notifications |
| [GUARDRAILS.md](GUARDRAILS.md) | Swipe UX, privacy, Fair Work, accessibility |

### Superseded or deferred

| Doc | Status |
|-----|--------|
| [SPEC.md](SPEC.md) | ⚠️ Superseded — see banner in file |
| [MOBILE_STRATEGY.md](MOBILE_STRATEGY.md) | ⚠️ Superseded — Capacitor path abandoned |
| [plans/2026-05-26-swipe-job-implementation.md](plans/2026-05-26-swipe-job-implementation.md) | Stale Next.js implementation plan |
| [PROVIDER_PORTAL.md](PROVIDER_PORTAL.md) | Deferred post-MVP |

See [foundational-docs/README.md](foundational-docs/README.md) for strategy doc authority.

---

## Next Step for Developers

**Pre-build docs audit complete (2026-05-28) + Full hygiene + AGENTS + indexes complete (2026-05-28):** Before any scaffold or code, the complete MUST-tier documentation set is in place (Structure B: root = hygiene files + AGENTS.md + canonical pointers only; living depth in `docs/{research/, stack/, legal/, ops/, api/, ...}`; `foundational-docs/` = immutable strategy history per its authority guide). New dev or specialist agent (alex/maya/jordan/dev/sam or swarm coordinator) following this + the 3-4 key files has **zero knowledge blockers or external hunting**.

**Read first (in order):**
- [docs/research/gap-analysis-2026-05-28.md](docs/research/gap-analysis-2026-05-28.md) (exhaustive catalog of all 35 existing MDs with lengths/dates/authority/gaps via 2026-05-28 Glob/Read/Grep/Shell; architecture map; complete required ~48-file set; proposed Structure B; tiered MUST (hygiene + 4 stack-deep 2026 from Context7 MCP + 2 legal 2026 from cursor-ide-browser fairwork snapshot + ops + API + indexes) / SHOULD / NICE; 8 detailed outlines with verbatim 2026 research facts + citations; mini swarm plan §7; sources §8).
- [docs/research/required-docs-manifest.md](docs/research/required-docs-manifest.md) (single living table: all ~48 files, tiers, owners per CLAUDE lanes, status "full 2026-05-28 by <lane> via swarm DOC-00X", cross-refs to gap §6).
- [AGENTS.md](AGENTS.md) (practical "how we run swarms here" guide: specialist lanes table with Discord IDs from CLAUDE.md, routing (openclaw agent --agent <id>, /alex Telegram, ruflo swarm-init + anti-drift), **mandatory Supabase agent_logs gate** with exact curl (copy from dispatch package or CLAUDE), parallel authoring example (this 2026-05-28 swarm itself), anti-drift rules, future use for gap refresh/code tasks; refs dispatch DOC-007 + design spec § "Swarm Execution Model" + gap §6 Outline 7 / §7).
- [CONTRIBUTING.md](CONTRIBUTING.md) (project DNA, agent lanes quick ref, exact logging gate, PR process + checklist enforcing docs/a11y/RLS/sources 2026 cites/logs).

1. Read **STACK.md** and **docs/BACKEND.md** end-to-end (canonicals per gap/foundational-docs/README authority; STACK supersedes SPEC/MOBILE; BACKEND ready for direct migrations with ARCH CRITICAL fixes incorporated).
2. Read gap-analysis §4 (Structure B rationale + diagram) + §5 (MUST tier) + relevant outlines in §6 (e.g. EXPO_ROUTER_AUTH_NOTIFS_HAPTICS_2026, SUPABASE_RLS_EDGE..., AU_FAIR_WORK_PAY_TRANSPARENCY_CASUAL_2026, PRIVACY_ACT..., MIGRATION_RUNBOOK, EDGE_FUNCTIONS_CONTRACTS; cite Context7 expo_dev 86.3 + supabase 82.6 2026-05-28 + fairwork browser 2026-05-27 snapshot 511 refs/117 interactive + ARCH 2026-05-27).
3. Review hygiene (all now present at root + .github/): [LICENSE](LICENSE) (MIT + AU Victorian law + Fair Work/Privacy/DDA note), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) (Contributor Covenant v2.1 + explicit DDA/anti-discrimination for swipe hiring + beachhead inclusive), [SECURITY.md](SECURITY.md) (PII classification for jobseeker swipes/matches/profiles/work rights + Privacy Act notifiable breaches + App Store + 2026 citations), [.github/ templates](.github/) (4 issue + PR with enforced checklists: docs updated? a11y? RLS/Edge/security? sources cited 2026 dates? agent_logs inserted?).
4. Scaffold the monorepo (`pnpm` workspaces, `apps/mobile` via Expo SDK 52+/v55/56, `packages/shared`, `supabase/`) per STACK § monorepo/Env.
5. Apply migrations in order (BACKEND.md § Migration Order + [docs/ops/MIGRATION_RUNBOOK_FROM_BACKEND.md](docs/ops/MIGRATION_RUNBOOK_FROM_BACKEND.md) + seed beachhead circle/jobs per 02-mvp; verify RLS/Edge/token; smoke employer post → candidate swipe → match → notif).
6. Configure Supabase Auth (magic link, Google, Apple) with Expo deep links + SecureStore adapter (see [docs/stack/EXPO_ROUTER_AUTH_NOTIFS_HAPTICS_2026.md](docs/stack/EXPO_ROUTER_AUTH_NOTIFS_HAPTICS_2026.md) + MCP facts 2026-05-28).
7. Build core flows: auth/onboarding (consent per Privacy + 02-mvp <60s) → candidate swipe deck (haptics per MCP expo_dev, optimistic via TanStack per new stack doc + GUARDRAILS) → employer interested list → chat → hire confirm + push (Expo + queue per ARCH CRITICAL + BACKEND notification_queue + new EXPO_/SUPABASE_ docs).

**All MUST hygiene + key legal/stack-deep/ops/API docs in place (2026-05-28 full pre-scaffold state per swarm).** New dev or agent (alex/maya/jordan/dev/sam or orchestrator) has **zero blockers from missing/outdated/scattered knowledge**. "Next Step" follower test passes: after reading only root README (this) + gap (full or targeted) + manifest + AGENTS + CONTRIBUTING + STACK + BACKEND + 02-mvp + 1 legal + 1-2 stack-deep, can scaffold + migrate + implement U1 auth/swipe without external searches, MCP re-calls, or questions.

See [docs/README.md](docs/README.md) (central index + Structure B navigation), [foundational-docs/README.md](foundational-docs/README.md) (authority guide + 2026-05-28 audit pointers + 04-legal note), [docs/research/swarm-dispatch-2026-05-28-full-docs.md](docs/research/swarm-dispatch-2026-05-28-full-docs.md) (cards + exact log templates + launch), design spec 2026-05-28 (locked Structure B + Approach 2 Parallel Swarm + Full scope + zero-blockers verification), gap §9 (artifacts + synthesis), AGENTS.md (full swarm ops + gate examples). All 2026 facts cited verbatim with timestamps/sources (no invention). DRY (reference canonicals + gap outlines).

**Full docs complete 2026-05-28** (hygiene + AGENTS + indexes + stack/legal/ops/api stubs per dispatch + design + gap). Human legal/compliance signoff + all agent_logs verified before scaffold approval. Re-audit gap/AGENTS on major changes (new SDK, Fair Work amendments, Privacy Act updates). See CHANGELOG.md for history + required-docs-manifest for living status.

---

## Product Principles

- Mobile-first (Expo) — not a web app wrapper
- Bilateral opt-in before chat (candidate swipes right → employer starts chat)
- Transparent pay on every card
- No keyword search, no resume upload in v1
- Free for job seekers — always
