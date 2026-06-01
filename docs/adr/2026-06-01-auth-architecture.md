# ADR: Auth Architecture — Stay on Supabase for MVP Release

**Date:** 2026-06-01
**Status:** Accepted
**Deciders:** H F (product owner), Claw (engineering)

## Context

The mobile app needs session management for three roles (candidate, employer, provider). Two architectural paths exist:

### Path A: Supabase Auth (current implementation)
- Supabase Auth with PKCE OAuth (Google), email/password, and Apple Sign-In (stubbed)
- Session stored in SecureStore via the Supabase React Native adapter
- AuthProvider wrapping the app root, driven by `supabase.auth.onAuthStateChange`
- Backend auth middleware validates Supabase JWTs

### Path B: Custom JWT / OAuth2 Service
- Separate backend auth service issuing custom JWTs
- Bearer-token interception on every API call
- Full migration of all auth state management

## Decision

**Stay on Supabase Auth for the MVP release.** Reason:

1. **It works end-to-end today.** PKCE callback, Google OAuth, session recovery, and route gating are all implemented and tested (9 unit tests in `(auth)/__tests__`).
2. **No proven need for custom auth.** The MVP doesn't require multi-domain SSO, tenant isolation, or non-Supabase backend sessions. Supabase Auth fully covers email/password, social OAuth, and role-based access.
3. **Migration cost is high with zero current ROI.** A custom JWT service means: new token refresh logic, bearer-token interception, new session storage strategy, rebuild of AuthProvider callbacks, and frontend-backend contract changes. All for no current benefit.
4. **Reversible later.** If custom auth is needed post-MVP, the `AuthProvider` boundary is the only file that changes — the rest of the app reads `session` and `profile` from context, which is implementation-agnostic.

### Path B is deferred to post-MVP

The custom JWT/OAuth2 model remains documented as a future option. It will be implemented as a separate `backend/auth-service` program when needed — never mixed into the current session flow.

## Session Boundaries

| Concern | Owner |
|---------|-------|
| Session source of truth | Supabase Auth (SecureStore) |
| Auth state provider  | `providers/AuthProvider.tsx` |
| OAuth callbacks      | `app/(auth)/callback.tsx` |
| Token for backend    | `supabase.auth.getSession().access_token` (Bearer) |
| Backend validation   | `backend/src/api/middleware/auth.py` (Supabase JWT) |
| Route gating         | `lib/auth-gate.ts` |
| Sign out             | `supabase.auth.signOut()` + query client reset |

## Consequences

- Google OAuth integration via `WebBrowser.openAuthSessionAsync` continues to work.
- Apple Sign-In is stubbed until App Store credentials are provisioned.
- No need for `axios` or custom HTTP client — direct Supabase calls work.
- When custom auth is eventually needed, only `AuthProvider` and `lib/auth/*` need rewriting; no screen-level changes.
