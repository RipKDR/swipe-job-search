# Hi-Hired Audit — FINDINGS.md

**Date:** 2026-05-28 | **Repo:** /home/admin/swipe-job-search | **Branch:** main
**Audit scope:** Architecture, dependencies, Expo/web compat, type safety, security

---

## P0 — Critical (Must Fix Before Expo Web)

| # | Finding | Path:Line | Remediation |
|---|---------|-----------|-------------|
| S1 | **PostHog PAT hardcoded in source** — `phx_ZQyhTyMD285zvZk84Kw5NuhSm7HpS5dgWPtJni3x8HygFK8P` grants API-level project access. Committed to git history. | `apps/mobile/app.config.ts:69` | Rotate key immediately. Move to non-EXPO_PUBLIC env var. Remove from git history with `git filter-branch` or BFG. |
| S2 | **Sentry auth token hardcoded** — `sntryu_37e89d02...` is a write-level token. Committed to git. | `apps/mobile/app.config.ts:70` | Rotate immediately. Move to non-EXPO_PUBLIC env var. |
| S3 | **EXPO_PUBLIC_ prefix on secrets** — `.env.local` uses `EXPO_PUBLIC_SENTRY_AUTH_TOKEN` and `EXPO_PUBLIC_POSTHOG_PERSONAL_ACCESS_TOKEN`. Expo inlines EXPO_PUBLIC_ vars into client JS bundles. | `apps/mobile/.env.local:5,10` | Rename to `SENTRY_AUTH_TOKEN` / `POSTHOG_PERSONAL_ACCESS_TOKEN` (no EXPO_PUBLIC_ prefix). |
| W1 | **PostHogProvider import crashes on web** — `posthog-react-native` has no web bundle. Root layout imports it unconditionally. | `apps/mobile/app/_layout.tsx:6` | Platform.OS gate or web shim (see W5). |
| W2 | **Sentry.wrap() crashes on web** — `@sentry/react-native` doesn't bundle for web. | `apps/mobile/app/_layout.tsx:13,147` | Use `@sentry/react` on web via Platform.OS gate. |
| W3 | **SecureStore import crashes on web** — `expo-secure-store` has no web impl. Supabase client uses it as auth storage. | `apps/mobile/lib/supabase.ts:5` | Platform.OS gate: localStorage adapter on web. |
| W4 | **expo-notifications import crashes on web** — Used in root layout via `usePushRegistration` + `useNotificationObserver`. | `apps/mobile/hooks/usePushRegistration.ts:3` | Platform.OS gate: early-return no-ops on web. |
| W5 | **PostHog constructor crashes on web** — `posthog-react-native` import in lib/posthog.ts. | `apps/mobile/lib/posthog.ts:1` | Platform.OS gate: lazy import or posthog-js swap on web. |
| W6 | **react-native-css useCssElement crashes on web** — 9 call sites in components/tw/. Nightly dep, no web transformer. | `apps/mobile/components/tw/index.tsx:22,40,47,57,67,74,84,108` + `image.tsx:31` | Platform.OS gate: on web, pass className directly to RN web style. |
| A1 | **mockJobs used as production fallback** — Real screens fall back to mock data instead of DB fetch. | `apps/mobile/hooks/useJobDeck.ts:15,25` + `app/(candidate)/job/[id].tsx:16` | Remove mock fallback; show empty state on fetch failure. |

---

## P1 — High (Fix Before Shipping)

| # | Finding | Path:Line | Remediation |
|---|---------|-----------|-------------|
| D1 | **@sentry/react-native version mismatch** — Installed `^8.12.0`, Expo SDK 52 expects `~6.10.0`. expo-doctor confirms. | `apps/mobile/package.json:19` | Downgrade to `~6.10.0` or add to `expo.install.exclude`. |
| D2 | **react-native-css nightly (0.0.0-nightly.5ce6396)** — Zero semver guarantees, untested on New Architecture. | `apps/mobile/package.json:46` | Evaluate pinning to stable release or removing dependency. |
| D3 | **9 native-only deps with no web polyfills** — expo-secure-store, expo-notifications, expo-haptics, expo-device, expo-application, expo-file-system, expo-localization, expo-image-picker, posthog-react-native. | `apps/mobile/package.json:25-41` | Platform.OS gates or web shims for each (see W1-W6). |
| D4 | **Duplicate @sentry/react-native** — Declared in both root and mobile package.json. | Root `package.json:44` + `apps/mobile/package.json:19` | Remove from root package.json (app-level dep). |
| D5 | **expo version misalignment** — Root: `~52.0.49`, app: `~52.0.0`. | Root `package.json:45` + `apps/mobile/package.json:24` | Align to same range. |
| A2 | **PlaceholderScreen.tsx dead code** — Never imported anywhere. | `apps/mobile/components/screens/PlaceholderScreen.tsx` | Delete. |
| A3 | **mocks/jobs.ts leaked into prod** — Imported in production code paths, not just tests. | `apps/mobile/lib/mocks/jobs.ts` | Remove prod imports; mock only in test setup. |
| T1 | **35 `as any` casts in source** — Undermines strict TypeScript. Concentrated in hooks/ and Supabase calls. | `apps/mobile/hooks/useInterestedList.ts`, `useMyJobs.ts`, `app/(employer)/`, `app/(onboarding)/` | Type Supabase return types properly using Database types from @hi-hired/shared. |
| W7 | **Haptics import crashes on web** — `expo-haptics` in lib/swipe.ts. | `apps/mobile/lib/swipe.ts:1` | Platform.OS gate: no-op on web. |
| W8 | **8 usePostHog hook imports** — posthog-react-native hook in 7+ files crashes on web. | Multiple (hooks, app routes) | Web shim for usePostHog returning no-op capture. |
| W9 | **Expo plugins fire unconditionally** — secure-store, notifications, image-picker plugins in app.config.ts. | `apps/mobile/app.config.ts:36-50` | Filter plugins by platform or wrap in conditional. |
| S4 | **Edge functions with verify_jwt=false** — notification-processor and expire-jobs skip JWT verification. | `supabase/config.toml:378,381` | Review if unauthenticated callers can trigger data modifications. |

---

## P2 — Medium (Fix When Convenient)

| # | Finding | Path:Line | Remediation |
|---|---------|-----------|-------------|
| A4 | **20+ unused shared exports** — Schemas and constants never imported by apps/mobile. Premature scaffolding. | `packages/shared/src/` | Keep (likely needed for future API/admin); document as planned. |
| A5 | **tw/animated.tsx and tw/image.tsx orphaned** — Scaffolded but never imported outside tw/. | `apps/mobile/components/tw/animated.tsx`, `image.tsx` | Delete or wire up usage. |
| D6 | **nativewind 5.0.0-preview.2** — Preview/unstable. | `apps/mobile/package.json:40` | Evaluate stable release when available. |
| D7 | **clsx marked unmaintained** — Low practical risk. | `apps/mobile/package.json:23` | Consider replacing with `cn()` utility using tailwind-merge. |
| W10 | **global.css Tailwind v4 syntax** — `@import "tailwindcss/theme.css" layer(theme)` may not resolve in Metro web CSS pipeline. | `apps/mobile/global.css:1-30` | Test with Metro web; fallback to PostCSS-based Tailwind if needed. |
| W11 | **`@media android/ios` non-standard** — Won't match on web. | `apps/mobile/global.css:6-22` | Add web fallback or accept defaults. |
| W12 | **app.config.ts missing `web.output: 'single'`** — Expo Router web needs SPA output mode. | `apps/mobile/app.config.ts:29-32` | Add `web: { output: 'single' }`. |
| W13 | **expo-image-picker no web impl** — Only on onboarding route. | `apps/mobile/app/(onboarding)/candidate-profile.tsx:13` | Platform.OS gate: `<input type="file">` on web. |
| T2 | **2 @ts-expect-error comments** — In tw/image.tsx for style remapping. | `apps/mobile/components/tw/image.tsx:10,22` | Low priority; cosmetic. |

---

## Summary

| Severity | Count | Blocks Expo Web? |
|----------|------:|:---:|
| P0 | 11 | Yes (W1-W6, A1) + Security (S1-S3) |
| P1 | 14 | Partially (D1-D5, W7-W9) |
| P2 | 9 | No |

**Top 3 highest-leverage simplifications:**
1. **Platform.OS gates on native-only imports** (W1-W8) — unblocks web boot
2. **Remove secrets from app.config.ts** (S1-S3) — security + bundle size
3. **Remove mockJobs production fallback** (A1) — correctness

**Which most directly unblocks Expo web:** Platform.OS gates on the 6 crash-on-web imports (W1-W6). Without these, the app cannot render a single screen on web.
