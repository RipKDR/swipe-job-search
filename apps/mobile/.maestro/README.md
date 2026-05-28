# Maestro smoke flows (U8)

Maestro E2E smoke tests for Hi-Hired mobile will live in this directory.

**Status:** Stub only — flows ship in U8 per [docs/plans/2026-05-27-001-feat-hi-hired-mvp-implementation-plan.md](../../../docs/plans/2026-05-27-001-feat-hi-hired-mvp-implementation-plan.md) and [STACK.md](../../../STACK.md) § Testing Stack (Maestro smoke; `TESTING_STRATEGY.md` still references Playwright — adapt during U8).

## Planned smoke flows

1. Onboarding: role selection → profile form → main app
2. Candidate: swipe deck → job detail
3. Employer: interested list → start chat
4. Match: send message → dual hire confirm

## Local setup (when flows exist)

```bash
# Install Maestro CLI — see https://maestro.mobile.dev/getting-started/installing-maestro
maestro test apps/mobile/.maestro/
```

Run against a dev build with local Supabase (`supabase start` from repo root) and valid `.env.local` per [apps/mobile/.env.example](../.env.example).

## References

- [TESTING_STRATEGY.md](../../../TESTING_STRATEGY.md) — test pyramid, Maestro scope
- [docs/plans/2026-05-27-001-feat-hi-hired-mvp-implementation-plan.md](../../../docs/plans/2026-05-27-001-feat-hi-hired-mvp-implementation-plan.md) — U8 verification
