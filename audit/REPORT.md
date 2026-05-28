# Hi-Hired Audit & Expo Web Bring-Up — Final Report

**Date:** 2026-05-28 | **Repo:** /home/admin/swipe-job-search | **Branch:** main
**Commits:** `5982070` (web baseline) + `d72b2e0` (simplification)

---

## Executive Summary

The Hi-Hired Expo monorepo (84 TS/TSX source files, ~4,700 LOC) has been audited, web-enabled, and simplified across 5 phases. The app now boots on Expo web with **zero runtime errors** and **zero console errors**.

---

## What Was Found (Phase 1 Audit)

- **34 findings** across architecture, dependencies, web-compat, type safety, and security
- **11 P0 critical** (web blockers + security)
- **14 P1 high** (dependencies, dead code, type safety)
- **9 P2 medium** (styling, config completeness)

Key findings:
- 6 native-only imports crash on web (PostHog, Sentry, SecureStore, notifications, haptics, react-native-css)
- PostHog PAT and Sentry auth token hardcoded in app.config.ts (P0 security)
- mockJobs used as production fallback instead of real DB fetch
- 35 `as any` casts undermining type safety
- Pre-existing vitest config issue (22 test files fail)

Full findings: `audit/FINDINGS.md`

---

## What Was Fixed

### Web Bring-Up (12 files, 467 insertions)

| File | Change | Root Cause |
|------|--------|-----------|
| `lib/supabase.ts` | Platform.OS gate → localStorage on web | SecureStore has no web impl |
| `lib/posthog.ts` | Platform.OS gate → no-op stub on web | PostHog RN SDK doesn't bundle for web |
| `lib/notifications.ts` | Platform.OS gate → early-return no-ops | Push notifications don't exist on web |
| `lib/sentry.ts` | Platform.OS gate → no-op stub on web | @sentry/react-native doesn't bundle for web |
| `lib/swipe.ts` | Platform.OS gate → haptics no-op on web | Haptics don't exist on web |
| `components/tw/index.tsx` | useCssElement passthrough on web | react-native-css nightly doesn't resolve for web |
| `app/_layout.tsx` | SafePostHogProvider + wrapApp() | Direct native imports crash on web |
| `hooks/usePostHog.ts` | New web-safe hook | 7 files had direct posthog-react-native imports |
| `hooks/usePushRegistration.ts` | Platform.OS gate | expo-notifications doesn't bundle for web |
| `metro.config.js` | resolveRequest interceptor with Proxy stub | Metro statically resolves ALL require() calls |
| `global.css` | Web font fallbacks | @media android/ios don't match on web |
| `app.config.ts` | web.output: 'single' | Expo Router web needs SPA output mode |

### Simplification (3 files, 112 insertions)

| File | Change | Finding |
|------|--------|---------|
| `hooks/useJobDeck.ts` | Replaced mockJobs with Supabase fetch | A1: production fallback to mock data |
| `app/(candidate)/job/[id].tsx` | Fetch job by ID from Supabase | A1: mockJobs lookup in production |
| `components/screens/PlaceholderScreen.tsx` | Deleted | A2: never imported, dead code |

---

## What Was NOT Fixed (Deferred)

| Item | Reason Deferred |
|------|----------------|
| PostHog PAT / Sentry auth token rotation | Requires user action (rotate keys in PostHog/Sentry dashboards) |
| EXPO_PUBLIC_ prefix on secrets in .env.local | Requires env var rename + deploy config update |
| @sentry/react-native version mismatch (8.12 vs 6.10) | Requires careful version downgrade, may break native |
| react-native-css nightly dep | No stable alternative yet; working via metro shim |
| 35 `as any` casts | Requires Supabase Database type completion for all tables |
| Tailwind CSS web styling | PostCSS processing needs tuning for Metro web |
| Vitest test failures | Pre-existing config issue (react-native-web alias) |
| PostHog web analytics | Needs posthog-js addition for web SDK |
| Sentry web error tracking | Needs @sentry/react addition for web SDK |

---

## Metrics

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Web boots | ❌ Crash | ✅ Zero errors | — |
| Console errors | N/A | 0 | — |
| Bundle size | N/A | 9.7MB | First build, unoptimized |
| Source files modified | — | 15 | +467 -91 lines |
| Dead code deleted | — | 1 file | PlaceholderScreen.tsx |
| Mock data in prod | 2 files | 0 files | Eliminated |
| Direct posthog-react-native imports | 8 files | 0 files | All routed through usePostHog |

---

## Commits

```
5982070 chore(web): expo web baseline — app boots with zero runtime errors
d72b2e0 fix: replace mockJobs prod fallback with Supabase fetch, remove dead code
```

---

## Next Steps (Recommended Priority)

1. **Rotate secrets** — PostHog PAT + Sentry auth token (P0 security)
2. **Fix vitest config** — resolve react-native-web alias for test suite
3. **Add posthog-js** — web analytics via Platform.OS conditional import
4. **Add @sentry/react** — web error tracking via Platform.OS conditional import
5. **Complete Database types** — eliminate 35 `as any` casts
6. **Tune Tailwind web** — PostCSS processing for proper styling on web
7. **Reduce bundle size** — tree-shaking, code splitting for web
