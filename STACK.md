# Hi-Hired — Canonical Tech Stack

> **Status:** Planning complete · Not yet scaffolded  
> **Last updated:** 2026-05-27

This document is the **single source of truth** for Hi-Hired technology choices. It supersedes conflicting stack guidance in:

- [`SPEC.md`](SPEC.md) — Next.js-primary web app, Capacitor path implied
- [`MOBILE_STRATEGY.md`](MOBILE_STRATEGY.md) — Web-first + Capacitor wrap
- [`foundational-docs/03-technical-build-plan.md`](foundational-docs/03-technical-build-plan.md) — includes admin web in Phase 0

When docs disagree, **this file wins**.

---

## Product

**Hi-Hired** — mobile-first job finder for casual, part-time, and permanent roles. Job seekers swipe local jobs; employers review interested candidates and start chat. Bilateral opt-in before messaging. Transparent pay on every card.

**Tagline:** *The algorithm is you.*

**Beachhead:** Tullamarine, Gladstone Park, Airport West and surrounding northern Melbourne suburbs.

---

## Stack Overview

| Layer | Technology | Notes |
|-------|------------|-------|
| **Mobile app** | Expo SDK 52+ · React Native · TypeScript | Primary product surface; iOS + Android |
| **Routing** | Expo Router (file-based) | Auth groups, role-based tabs |
| **Styling** | NativeWind v4 (Tailwind for RN) | Match design tokens in shared package |
| **Backend** | Supabase (Sydney region `ap-southeast-2`) | Postgres, Auth, Storage, Realtime, Edge Functions |
| **Auth** | Supabase Auth | Magic link (default), Google OAuth, Apple Sign-In (App Store required) |
| **Server state** | TanStack Query v5 | Cache, optimistic updates, refetch |
| **Client state** | Zustand | Ephemeral UI (deck index, modal state) — minimal |
| **Forms** | React Hook Form + Zod | Shared schemas in `packages/shared` |
| **Push notifications** | Expo Notifications → APNs / FCM | Register Expo push token; Edge Functions dispatch |
| **Email** | Resend | Re-engagement only (match unread 2h+, optional digest) |
| **Analytics** | PostHog | Events, funnels, feature flags (onboarding A/B post-MVP) |
| **Error monitoring** | Sentry (`@sentry/react-native`) | Crashes, performance, breadcrumbs |
| **Payments** | Stripe | **Post-MVP** — employer boost / sponsored jobs |
| **Admin web** | Next.js 15 + Tailwind | **Deferred post-MVP** — employers use mobile app in v1 |
| **CI** | GitHub Actions | Lint, typecheck, unit tests, Supabase migration dry-run |
| **Mobile builds** | EAS Build + EAS Submit | Dev client → preview → production |
| **Backend hosting** | Supabase Cloud | Migrations via Supabase CLI |
| **Future admin hosting** | Vercel | When `apps/admin` is added |

### Optional upgrades (not MVP)

| Upgrade | When | Replaces |
|---------|------|----------|
| OneSignal | If Expo push limits or advanced segmentation needed | Expo Notifications dispatch only |
| Detox E2E | Pre–public beta | Manual + Maestro smoke tests |
| Turborepo | Monorepo grows past 2 apps | pnpm workspaces alone |

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│  apps/mobile (Expo + Expo Router + NativeWind)              │
│  TanStack Query · RHF · Zod · Expo Notifications · Sentry   │
└──────────────────────────┬──────────────────────────────────┘
                           │ supabase-js (anon key + RLS)
┌──────────────────────────▼──────────────────────────────────┐
│  Supabase                                                    │
│  ├── PostgreSQL + RLS                                        │
│  ├── Auth (PKCE / deep links via Expo)                       │
│  ├── Storage (avatars, job-photos)                           │
│  ├── Realtime (messages, matches, notifications)             │
│  └── Edge Functions (match-notify, notification-processor)   │
└─────────────────────────────────────────────────────────────┘
         │                              │
    PostHog SDK                    Resend API
    Sentry SDK                     (email fallback)
```

**Match model (MVP):** Candidate swipes right on a job → employer sees **Interested List** → employer taps **Chat** → match row created. Not bilateral job↔candidate swiping. See [`docs/BACKEND.md`](docs/BACKEND.md) § Match Logic.

---

## Monorepo Structure

```
hi-hired/                          # repo root (rename from swipe-job-search when scaffolded)
├── apps/
│   └── mobile/                    # Expo app — sole v1 product surface
│       ├── app/                   # Expo Router routes
│       ├── components/
│       ├── hooks/
│       ├── lib/                   # supabase client, analytics, notifications
│       └── app.config.ts
├── packages/
│   └── shared/                    # Types, Zod schemas, constants, suburb list
│       ├── src/
│       │   ├── schemas/           # profile, job, swipe, match
│       │   ├── types/
│       │   └── constants/         # job_types, work_rights, beachhead suburbs
│       └── package.json
├── supabase/
│   ├── migrations/                # Numbered SQL migrations (see BACKEND.md)
│   ├── functions/                 # Edge Functions
│   └── seed/                      # Beachhead demo jobs + circles
├── docs/
│   ├── BACKEND.md                 # Canonical schema + RLS + Edge Functions
│   └── superpowers/plans/         # Implementation plans (update stack refs)
├── foundational-docs/             # Product strategy v1 (see foundational-docs/README.md)
├── STACK.md                       # ← this file
├── README.md
├── package.json                   # pnpm workspace root
├── pnpm-workspace.yaml
└── .github/workflows/             # ci.yml
```

**Deferred (post-MVP):**

```
apps/admin/          # Next.js employer/admin dashboard
packages/ui/         # Shared web components (only if admin ships)
```

---

## Mobile App Conventions

| Concern | Choice |
|---------|--------|
| Gestures | `react-native-gesture-handler` + `react-native-reanimated` |
| Images | `expo-image` + Supabase Storage public URLs |
| Camera / picker | `expo-image-picker` |
| Haptics | `expo-haptics` |
| Location | `expo-location` (suburb validation, optional radius sort) |
| Deep links | `hi-hired://` scheme + Universal Links / App Links |
| Session storage | `@supabase/supabase-js` with `expo-secure-store` adapter |
| Env vars | `expo-constants` + `app.config.ts` `extra` (no secrets in bundle) |

Auth redirect URLs (Expo):

- Dev: `exp://127.0.0.1:8081/--/auth/callback`
- Staging/prod: `hi-hired://auth/callback`, `https://auth.hi-hired.com.au/callback` (optional web fallback)

---

## Environment Variables Matrix

### Mobile app (`apps/mobile`)

| Variable | Dev | Staging | Prod | Client-safe |
|----------|-----|---------|------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | local or dev project | staging project | prod project | Yes |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | dev anon key | staging anon key | prod anon key | Yes |
| `EXPO_PUBLIC_POSTHOG_KEY` | dev project key | staging key | prod key | Yes |
| `EXPO_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` | same | same | Yes |
| `EXPO_PUBLIC_SENTRY_DSN` | optional / disabled | staging DSN | prod DSN | Yes |
| `EXPO_PUBLIC_APP_ENV` | `development` | `staging` | `production` | Yes |

### Supabase Edge Functions (secrets — never in mobile bundle)

| Variable | Dev | Staging | Prod |
|----------|-----|---------|------|
| `SUPABASE_URL` | ✓ | ✓ | ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | ✓ | ✓ |
| `RESEND_API_KEY` | test key | staging | prod |
| `EXPO_ACCESS_TOKEN` | optional | ✓ | ✓ |
| `STRIPE_SECRET_KEY` | — | — | post-MVP |

### EAS / CI (GitHub Actions secrets)

| Variable | Purpose |
|----------|---------|
| `EXPO_TOKEN` | EAS CLI authentication |
| `SUPABASE_ACCESS_TOKEN` | `supabase db push` in CI |
| `SUPABASE_DB_PASSWORD` | Migration runs |
| `SENTRY_AUTH_TOKEN` | Source map upload |

### Local dev only

| Variable | Purpose |
|----------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Seed scripts, integration tests |

---

## Deployment Targets

| Target | Service | Branch / trigger | URL pattern |
|--------|---------|------------------|-------------|
| Mobile dev client | EAS Build (`development`) | local | Install via QR |
| Mobile internal beta | EAS Build (`preview`) | `main` | TestFlight / internal track |
| Mobile production | EAS Submit | tagged release `v*` | App Store / Play Store |
| Database | Supabase CLI migrations | merge to `main` | per-environment project |
| Edge Functions | `supabase functions deploy` | merge to `main` | bundled with Supabase project |
| Admin web (future) | Vercel | `main` → prod | `admin.hi-hired.com.au` |

**Supabase projects:** use three isolated projects (dev, staging, prod). Do not share service role keys across environments.

---

## Testing Stack (aligned with [`TESTING_STRATEGY.md`](TESTING_STRATEGY.md))

| Layer | Tool | Scope |
|-------|------|-------|
| Unit | Vitest + `@testing-library/react-native` | Hooks, schemas, swipe logic |
| Integration | Vitest + Supabase local (`supabase start`) | RLS, triggers, Edge Functions |
| E2E | Maestro (MVP) → Detox (pre–public beta) | Onboarding, swipe, match, chat |
| A11y | `@axe-core/react-native` (spot checks) | WCAG 2.2 AA per [`GUARDRAILS.md`](GUARDRAILS.md) |

Update [`TESTING_STRATEGY.md`](TESTING_STRATEGY.md) references from Playwright/Next.js to Maestro/Expo when implementing.

---

## Legacy & Superseded Docs

| Doc | Status | Notes |
|-----|--------|-------|
| [`SPEC.md`](SPEC.md) | **Superseded** (stack) | Schema fragments useful; bilateral `check-match` flow replaced by employer-initiated match |
| [`MOBILE_STRATEGY.md`](MOBILE_STRATEGY.md) | **Superseded** | Capacitor/PWA path abandoned |
| [`plans/2026-05-26-swipe-job-implementation.md`](plans/2026-05-26-swipe-job-implementation.md) | **Stale** | Next.js tasks; rewrite after scaffold using Expo plan |
| [`AUTH_FLOWS.md`](AUTH_FLOWS.md) | **Adapt** | Replace Next.js middleware/cookies with Expo Router + SecureStore |
| [`NOTIFICATIONS.md`](NOTIFICATIONS.md) | **Adapt** | Replace OneSignal with Expo Notifications; keep queue/retry pattern |
| [`RECRUITER_FLOW.md`](RECRUITER_FLOW.md) | **Adapt** | UX reference; rename recruiter → employer in UI copy |
| [`PROVIDER_PORTAL.md`](PROVIDER_PORTAL.md) | **Deferred** | Post-MVP / partnership phase |
| [`foundational-docs/02-mvp-definition.md`](foundational-docs/02-mvp-definition.md) | **Authoritative** | Product scope, screens, match model |
| [`docs/BACKEND.md`](docs/BACKEND.md) | **Authoritative** | Schema, RLS, Edge Functions |

---

## Locked Decisions (user-approved 2026-05-27)

1. Product name: **Hi-Hired**
2. Mobile-first: **Expo + React Native + Expo Router + NativeWind**
3. Backend: **Supabase**
4. State/forms: **TanStack Query**, **React Hook Form**, **Zod**
5. Push: **Expo Notifications** (OneSignal optional later)
6. Observability: **PostHog + Sentry**
7. Payments: **Stripe** post-MVP
8. Admin Next.js: **deferred** post-MVP
9. Role terms: **candidate** + **employer** (not recruiter)

---

## Next Step for Developers

1. Read [`README.md`](README.md) and [`docs/BACKEND.md`](docs/BACKEND.md)
2. Scaffold monorepo: `pnpm init`, workspace config, `create-expo-app apps/mobile`
3. Run Supabase migrations in order (BACKEND.md § Migration Order)
4. Seed beachhead circle + demo jobs
5. Implement auth → onboarding → swipe deck → interested list → chat
