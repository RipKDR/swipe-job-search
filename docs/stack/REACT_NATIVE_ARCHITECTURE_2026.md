# React Native Architecture — Hi-Hired Mobile (2026-05-29)

**Scope:** `apps/mobile` (Expo SDK 56, Expo Router 56, React Native 0.85).
**Auth:** Supabase + `AuthProvider` / `auth-gate` — **not** Clerk ([CLERK_EXPO_PATTERNS_2026.md](./CLERK_EXPO_PATTERNS_2026.md) is deferred reference only).
**DRY:** Stack canon in [EXPO_ROUTER_AUTH_NOTIFS_HAPTICS_2026.md](./EXPO_ROUTER_AUTH_NOTIFS_HAPTICS_2026.md), [SUPABASE_RLS_EDGE_STORAGE_REALTIME_JOBS_2026.md](./SUPABASE_RLS_EDGE_STORAGE_REALTIME_JOBS_2026.md); gap backlog in [gap-analysis-2026-05-28.md](../research/gap-analysis-2026-05-28.md) (link only).

---

## Current state map

### Expo Router groups (matches skill’s role-split model)

| Route group | Path | Layout | Purpose |
|-------------|------|--------|---------|
| Root | `app/_layout.tsx` | `QueryClientProvider` → `SafePostHogProvider` → `AuthProvider` → `RootLayoutNav` | TanStack Query, analytics, auth gate, `Slot` |
| Auth | `app/(auth)/` | `app/(auth)/_layout.tsx` | `login.tsx`, `callback.tsx` (OAuth / magic link) |
| Onboarding | `app/(onboarding)/` | `app/(onboarding)/_layout.tsx` | `role.tsx`, `candidate-profile.tsx`, `employer-profile.tsx` |
| Candidate | `app/(candidate)/` | Stack `app/(candidate)/_layout.tsx` | Tabs + `job/[id].tsx` |
| Candidate tabs | `app/(candidate)/(tabs)/` | `app/(candidate)/(tabs)/_layout.tsx` | `deck`, `matches`, `profile` |
| Employer | `app/(employer)/` | Stack `app/(employer)/_layout.tsx` | Tabs + hidden `jobs/[id]/interested` |
| Employer tabs | `app/(employer)/(tabs)/` | `app/(employer)/(tabs)/_layout.tsx` | `jobs`, `post-job`, `matches`, `profile` |
| Chat | `app/chat/[matchId].tsx` | (root stack via `Slot`) | Shared match thread (both roles) |
| Index | `app/index.tsx` | — | Loading placeholder; redirects handled in root layout |

**Routing helpers:** `lib/routing.ts` (`ROUTES`, `getRoleHomeRoute`, `shouldRedirectForRoleMismatch`, `getAuthRedirectUrl`), `lib/auth-gate.ts` (`resolveAuthRedirect`).

### Providers & data

- **Session/profile:** `providers/AuthProvider.tsx` — Supabase `onAuthStateChange`, typed `Profile` from `@hi-hired/shared` `Database`.
- **Consumer:** `hooks/useAuth.ts`.
- **Server state:** `@tanstack/react-query` `QueryClient` in `app/_layout.tsx` (5m `staleTime`, retry 2).
- **Feature hooks:** `hooks/useJobDeck.ts`, `useSwipe.ts`, `useChat.ts`, `useMatchInbox.ts`, `useCreateMatch.ts`, `useHireConfirm.ts`, `usePushRegistration.ts`, etc.

### Platform splits (web vs native)

| Concern | Native | Web | Implementation |
|---------|--------|-----|----------------|
| Supabase auth storage | `expo-secure-store` | `localStorage` | `lib/supabase.ts` `getStorageAdapter()` |
| Session in URL | off | `detectSessionInUrl: true` | `lib/supabase.ts` |
| Sentry | `@sentry/react-native` | no-op stub | `lib/sentry.ts` |
| PostHog | `posthog-react-native` + `PostHogProvider` in root | `posthog-js`; provider passthrough | `lib/posthog.ts`, `app/_layout.tsx` `SafePostHogProvider` |
| Gesture root | `GestureHandlerRootView` wraps candidate tabs | tabs without GHRV | `app/(candidate)/(tabs)/_layout.tsx` |
| Metro native-only pkgs | real modules | `.metro-stubs/native-stub.js` | `metro.config.js` |
| Tab layout width | full width | `TabWebShell` max-width on lg+ | `components/ui/TabWebShell.tsx` |
| Styling | NativeWind 4 + `react-native-css` | same + `global.css` | `components/tw/*`, `tailwind.config.js` |

### UI shell

- **Screen wrapper:** `components/ui/AppScreen.tsx` — scroll/centered/max-width/footer, `AmbientBackground`.
- **Headers / empty:** `ScreenHeader.tsx`, `EmptyState.tsx`, `LoadingScreen.tsx`, `ProfileLoadError.tsx`.
- **Deck / chat / forms:** `components/deck/*`, `components/chat/*`, `components/forms/*`, `components/employer/*`.

### Monorepo shared package

- **`@hi-hired/shared`** (`packages/shared`): Zod schemas (`profile`, `job`, `swipe`, `match`), `Database` types, AU constants (suburbs, work rights, Fair Work mins).
- **Mobile usage:** Supabase client typing, forms, deck, onboarding submit — ~15 import sites under `apps/mobile`.

### Tests & tooling

- **Runner:** `vitest` via `vitest.config.mjs` (script: `npm test`).
- **Setup:** `vitest.setup.ts` — RN mock, `expo-secure-store` / `expo-constants` mocks, `@/components/tw` → `react-native` in setup.
- **Aliases:** `@/` → app root; `@/components/tw` → `vitest-tw-shim.ts`; `@/components/tw/image` → `vitest-tw-image-shim.ts`.
- **E2E:** `.maestro/` flows (onboarding, chat hire).
- **Typecheck:** `npm run typecheck` (`tsc --noEmit`) — clean as of 2026-05-29 audit.

---

## Strengths (production-aligned today)

1. **File-based auth funnel** — `(auth)` → `(onboarding)` → role-specific `(candidate)` / `(employer)` with pure `resolveAuthRedirect` + role mismatch guard in root layout.
2. **Supabase session persistence** — SecureStore vs web storage split; config validation in `getSupabaseConfigError`.
3. **Cross-platform observability** — Sentry wrap (native), PostHog screen capture on pathname change, push + notification deep link hooks in root layout.
4. **TanStack Query at root** — consistent place for cache defaults; hooks encapsulate Supabase reads/writes.
5. **TDD-friendly pure libs** — `lib/gesture.ts`, `lib/routing.ts`, `lib/auth-gate.ts` with dedicated `__tests__`.
6. **Web-first responsive polish** — `AppScreen`, `TabWebShell`, `lib/responsive-layout.ts` without forking route trees.
7. **Shared contracts** — Zod + DB types in `@hi-hired/shared` reduce drift with Edge/backend.
8. **Tab bar web crash guard** — `String(color)` on tab icons in candidate/employer tab layouts (React Native Web passes opaque color objects).

---

## Gaps (prioritized)

### P0 — reliability / ship blockers

| Gap | Notes |
|-----|--------|
| **Vitest suite partially red** | `happy-dom` fixes jsdom ESM pool crash (`ERR_REQUIRE_ESM`); 10/23 files pass, 51/63 tests pass. Remaining: missing `@testing-library/react-native`, some `@/components/tw` resolution in forked tests, `useChat` assertion failures. |
| **No route-level Error Boundary** | Uncaught render errors can white-screen; skill recommends boundary at root + heavy features (deck, chat). |
| **No offline / persistQueryClient** | Queries refetch on reconnect only; no TanStack persist or queue for swipes/messages offline. |

### P1 — performance & UX scale

| Gap | Notes |
|-----|--------|
| **FlatList only (no FlashList)** | Match inbox, job lists, message lists use RN `FlatList` / ScrollView — large lists will jank on low-end Android. |
| **`RoleTabLayout` unused duplicate** | `components/navigation/RoleTabLayout.tsx` duplicates tab config; candidate/employer layouts inline tabs (DRY debt). |
| **Lucide / vector tab icons** | Emoji `Text` icons work but aren’t theme-token driven; skill suggests `@expo/vector-icons` or lucide with `size` + `color` string. |
| **Expand `@hi-hired/shared` in hooks** | Several hooks duplicate inline types; could import schemas for parse/validate at boundaries. |

### P2 — polish & ops

| Gap | Notes |
|-----|--------|
| **Clerk deferred** | Documented only — stay on Supabase per product decision. |
| **Sentry on web** | Stub only; add `@sentry/react` if web production matters. |
| **Zustand minimal** | Present in `package.json`; most state is Context + Query — clarify when to use store (deck overlay UI, etc.). |
| **Maestro CI wiring** | Flows exist under `.maestro/`; not evident in default `npm test` gate. |

---

## Pattern mapping (skill → repo)

| Skill pattern | Status | Existing file(s) |
|---------------|--------|------------------|
| Expo Router `(auth)` group | ✅ | `app/(auth)/*` |
| Role-specific app segments | ✅ | `app/(candidate)/*`, `app/(employer)/*` |
| Tab navigators per role | ✅ | `app/(candidate)/(tabs)/_layout.tsx`, `app/(employer)/(tabs)/_layout.tsx` |
| Root `QueryClientProvider` | ✅ | `app/_layout.tsx` |
| Auth provider + protected routes | ✅ | `providers/AuthProvider.tsx`, `lib/auth-gate.ts`, root `useEffect` |
| SecureStore session (native) | ✅ | `lib/supabase.ts` |
| Modal / stack screens | ✅ | `app/(candidate)/job/[id].tsx`, `app/chat/[matchId].tsx` |
| Offline-first + persist | ❌ missing | — |
| FlashList lists | ❌ missing | lists in `MessageList`, `MatchInboxList`, `JobListItem` patterns |
| Error boundaries | ❌ missing | — |
| `lucide-react-native` tab icons | ⚠️ partial | Emoji `TabIcon`; `@expo/vector-icons` in deps unused in tabs |
| React Query persist dehydrate | ❌ missing | — |
| Zustand feature stores | ⚠️ partial | dependency only |
| NativeWind / design tokens | ✅ | `components/tw/*`, `global.css` |
| E2E Detox/Maestro | ⚠️ partial | `.maestro/*.yaml` |
| Shared monorepo types | ✅ | `packages/shared`, `@hi-hired/shared` in `package.json` |
| Clerk auth | 🚫 deferred | See `CLERK_EXPO_PATTERNS_2026.md` |
| vitest + happy-dom | ✅ (2026-05-29) | `vitest.config.mjs` `environment: 'happy-dom'` |
| Tab `String(color)` web fix | ✅ | candidate + employer `(tabs)/_layout.tsx` |

---

## Next 3 engineering moves (minimal scope)

1. **Green vitest gate (P0)** — Keep `happy-dom`; add devDependency `@testing-library/react-native` OR migrate `SwipeDeck.test.tsx` to `@testing-library/react`; ensure vitest aliases cover all `@/components/tw/*` subpaths. Target: 23/23 files, `npm test` in CI.
2. **Root ErrorBoundary (P0)** — Add `components/ui/RootErrorBoundary.tsx` and wrap `RootLayoutNav` children (or `Slot`) with fallback UI + `captureException`; one screen-level boundary on `SwipeDeck` route optional.
3. **FlashList on match inbox (P1)** — Replace `FlatList` in `components/chat/MatchInboxList.tsx` only; measure scroll FPS on Android mid-tier; defer deck/cards until list proven.

---

## Verification (2026-05-29)

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` in `apps/mobile` | Pass (TS5101 `baseUrl` deprecation warning only) |
| Candidate tab `String(color)` | Present in `app/(candidate)/(tabs)/_layout.tsx` |
| Vitest environment | `happy-dom` in `vitest.config.mjs` / `.ts`; jsdom ESM pool error resolved |
| `npm test` | 10 files / 51 tests pass; 13 files still fail (see P0) |

---

## Key file index

```
apps/mobile/
├── app/_layout.tsx              # Query + PostHog + Auth + gate
├── app/(auth)/login.tsx
├── app/(onboarding)/role.tsx
├── app/(candidate)/(tabs)/_layout.tsx
├── app/(employer)/(tabs)/_layout.tsx
├── app/chat/[matchId].tsx
├── providers/AuthProvider.tsx
├── lib/{routing,auth-gate,supabase,sentry,posthog,gesture}.ts
├── hooks/useAuth.ts
├── components/ui/{AppScreen,TabWebShell,LoadingScreen}.tsx
├── components/tw/{index,image}.tsx
├── vitest.config.mjs
├── vitest-tw-shim.ts
└── vitest-tw-image-shim.ts
```

*Audit: react-native-architecture skill applied to Hi-Hired `apps/mobile` 2026-05-29. No Clerk install; no large refactors.*
