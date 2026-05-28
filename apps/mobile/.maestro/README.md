# Maestro smoke flows (U8)

Maestro E2E smoke tests for Hi-Hired mobile.

**Status:** U8 — `onboarding-swipe-match.yaml` and `chat-hire.yaml` ship with env-injected auth links for CI/dev.

## Smoke flows

| Flow | File | Covers |
|------|------|--------|
| Onboarding + swipe | `onboarding-swipe-match.yaml` | Auth → role → deck swipe |
| Chat + hire | `chat-hire.yaml` | Interested → chat → message → hire bar |

## Local setup

```bash
# Install Maestro CLI — https://maestro.mobile.dev/getting-started/installing-maestro
export TEST_EMAIL="candidate@test.hihired.local"
export TEST_MAGIC_LINK="hi-hired://auth/callback?..."  # from supabase seed / test helper
export TEST_EMPLOYER_LINK="hi-hired://auth/callback?..."
export TEST_MATCH_ID="<uuid>"

maestro test apps/mobile/.maestro/
```

Run against an EAS **development** or **preview** build on a physical device (push requires real hardware). Simulator works for non-push UI flows.

## CI

Maestro runs on **macOS** runners only (see `.github/workflows/ci.yml`). EAS preview builds are optional and require `EXPO_TOKEN` in GitHub secrets.

## References

- [TESTING_STRATEGY.md](../../../TESTING_STRATEGY.md)
- [docs/plans/2026-05-27-001-feat-hi-hired-mvp-implementation-plan.md](../../../docs/plans/2026-05-27-001-feat-hi-hired-mvp-implementation-plan.md) — U8
