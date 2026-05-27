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

1. Read **STACK.md** and **docs/BACKEND.md** end-to-end.
2. Scaffold the monorepo (`pnpm` workspaces, `apps/mobile` via Expo, `packages/shared`, `supabase/`).
3. Apply migrations in order (BACKEND.md § Migration Order).
4. Configure Supabase Auth (magic link, Google, Apple) with Expo deep links.
5. Build: auth → onboarding → candidate swipe deck → employer interested list → chat → hire confirm.

---

## Product Principles

- Mobile-first (Expo) — not a web app wrapper
- Bilateral opt-in before chat (candidate swipes right → employer starts chat)
- Transparent pay on every card
- No keyword search, no resume upload in v1
- Free for job seekers — always
