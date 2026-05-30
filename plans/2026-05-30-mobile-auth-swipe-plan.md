# Mobile UX, Swipe Performance, and Session Strategy Implementation Plan

> **For Hermes:** Use `software-development/subagent-driven-development` to execute this plan task-by-task.

**Goal:** Preserve the 60FPS swipe deck, formalize predictive buffering, and settle the auth/session path without introducing a second state system.

**Architecture:** The mobile app already uses Expo Router + `components/` + `hooks/` + `lib/` + `providers/`. Keep that shape. Reanimated and Gesture Handler already power the deck; TanStack Query owns server state; Supabase currently owns session state. The only acceptable split is: either keep Supabase end-to-end or explicitly migrate auth in one dedicated phase. Do not half-migrate.

**Tech Stack:** Expo 56, React Native 0.85, Reanimated 4, Gesture Handler 3, TanStack Query 5, SecureStore, Supabase, Expo Router, React Hook Form, optionally MMKV/Zustand if a measured need emerges.

---

## Blueprint

- **Intent:** keep the swipe UX fast and the auth/session model explicit.
- **Constraints:** no frame drops in the active deck, no regressions in current swipe overlay behavior, native session storage must remain secure, and auth logic must stay reversible if the architecture decision changes later.
- **Data Contract:** swipe direction callbacks, jobs page/index state, session payloads, auth callback payloads, refresh events, and manual prefetch triggers.
- **Success Criteria:** deck behavior matches the current UX on device, the auth decision is recorded, predictive buffering has explicit tests, and logout/callback behavior is deterministic.

## Technical Schema

- **Data Flow:** auth callback -> provider -> query client -> jobs pipeline -> swipe -> match/apply -> revalidation.
- **Component Boundaries:** `app/(auth)`, `app/(onboarding)`, `app/(candidate)`, `providers/AuthProvider.tsx`, `components/deck`, `hooks/useJobsPipeline.ts`, `lib/auth/*`.
- **Algorithm Selection:** keep the 3-card visual stack, use the existing 50% prefetch threshold, use spring-based fly-off/reset for gestures, and keep direct Supabase access unless the auth migration is approved.
- **State Management:** QueryClient for server state, AuthProvider for session state, local component state for gesture animation, and no new store layer unless there is a measured need.
- **Interfaces:** swipe callbacks, `useJobsPipeline` inputs/outputs, auth callback return values, sign-out side effects, and prefetch helper semantics.

## Tasks

### Task 1: Record the auth architecture decision

**Objective:** Decide whether this release stays on Supabase auth or migrates to the prompt doc’s custom JWT/OAuth2 model.

**Files:**
- Create: `docs/adr/2026-05-30-auth-architecture.md`
- Update: `apps/mobile/providers/AuthProvider.tsx`
- Update: `apps/mobile/lib/supabase.ts` or `apps/mobile/lib/auth/*` depending on the decision
- Update: `backend/src/api/middleware/auth.py` only if the custom-token path is selected

**Plan:**
- Default recommendation: stay on Supabase for this release.
- If the custom token model is chosen, keep it in a separate backend/auth program and do not mix it with the current session flow.
- Record the decision, the reasons, and the files that own the session boundary.

**Verification:**
- The decision is written as an ADR.
- No mixed auth branches remain in the mobile app.
- The implementation owner can point to one primary session source of truth.

### Task 2: Lock the swipe deck contract with tests

**Objective:** Protect the 60FPS swipe behavior and stack invariants with focused regression coverage.

**Files:**
- Create: `apps/mobile/components/deck/__tests__/SwipeCard.test.tsx`
- Update: `apps/mobile/components/deck/SwipeCard.tsx`
- Update: `apps/mobile/components/deck/SwipeDeck.tsx`
- Update: `apps/mobile/components/deck/SwipeOverlay.tsx` only if overlay copy or thresholds need alignment

**Plan:**
- Verify threshold fly-off and spring reset behavior.
- Verify `runOnJS` callbacks fire exactly once per swipe direction.
- Verify the deck never exposes more than three mounted cards.
- Verify the active swipe overlay text stays aligned with the chosen product language.

**Verification:**
- `pnpm --filter @hi-hired/mobile test -- SwipeCard`
- `pnpm --filter @hi-hired/mobile typecheck`
- `pnpm --filter @hi-hired/mobile lint`

### Task 3: Formalize the predictive buffering boundary

**Objective:** Make the jobs pipeline easier to reason about and easier to test under reconnect/page-transition edge cases.

**Files:**
- Update: `apps/mobile/hooks/useJobsPipeline.ts`
- Create: `apps/mobile/hooks/usePrefetchUpcoming.ts` if a reusable helper is needed
- Create: `apps/mobile/lib/apiClient.ts` only if the team chooses to move away from direct Supabase calls

**Plan:**
- Keep the current 50% prefetch trigger and 20-card page contract.
- Add a manual prefetch path for reconnect/foreground events.
- Explicitly test page exhaustion, page swaps, and swiped-job exclusion.
- Do not add an axios stack unless the auth migration needs bearer-token interception.

**Verification:**
- `pnpm --filter @hi-hired/mobile test -- useJobsPipeline`
- The next page is available before the current deck empties.
- A refresh does not re-show already-swiped jobs.

### Task 4: Finish auth/session polish for the chosen path

**Objective:** Make login, callback, logout, and token persistence deterministic on native and web.

**Files:**
- Update: `apps/mobile/app/(auth)/login.tsx`
- Update: `apps/mobile/app/(auth)/callback.tsx`
- Update: `apps/mobile/lib/auth/oauth.ts`
- Update: `apps/mobile/lib/auth/signOutAndRedirect.ts`
- Update: `apps/mobile/lib/auth/token-refresh.ts`
- Update: `apps/mobile/providers/AuthProvider.tsx`

**Plan:**
- For the current Supabase path, complete Apple sign-in and logout cache clearing.
- Keep session recovery and route gating stable after app restart.
- Ensure callback failure modes are visible and testable.

**Verification:**
- `pnpm --filter @hi-hired/mobile test -- oauth authCallback signOutAndRedirect`
- Logout clears the cached session and query data.
- Callback handling works for success, cancellation, and error paths.

### Task 5: Align terminology and documentation

**Objective:** Keep the docs aligned with the product language and the actual implementation.

**Files:**
- Update: `docs/README.md` or the chosen ADR note
- Update: any prompt collection or design note that still describes the old contract

**Plan:**
- Decide whether the deck language is `PASS` / `APPLY` or `NOPE` / `LIKE` and make docs match the UI.
- Note that MMKV/Zustand and the prompt’s custom token model are deferred unless the architecture decision changes.

**Verification:**
- The plan and the UI use the same vocabulary.
- No stale architecture note implies both auth paths are active.

## Risks

- Mixing Supabase auth and custom JWT/OAuth2 in the same release will create two session models and make bugs hard to isolate.
- Adding MMKV or Zustand before a measured need exists will add maintenance burden without proving value.
- Changing deck copy without updating the design note will create a product mismatch.
