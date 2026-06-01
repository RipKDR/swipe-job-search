# CLAUDE.md — Hi-Hired

Project memory for Claude Code sessions. Read this before making changes.

## Overview
Hi-Hired is a swipe-based local casual job marketplace (Australia). It's an **Expo
SDK 56 + React Native 0.85 + React 19** mobile app with a Supabase backend. The
repo is a **pnpm monorepo**; the mobile app is the primary deliverable.

## Layout
- `apps/mobile` — the Expo app (`@hi-hired/mobile`). **This is the real app.**
- `packages/shared` — shared TypeScript (`@hi-hired/shared`, e.g. DB types).
- `supabase/` — migrations + edge functions (Deno).
- `backend/` — Python services.
- Root-level docs (`*.md`) — product/strategy specs.

## Package manager
- **pnpm** (`pnpm-lock.yaml`, `pnpm-workspace.yaml`). Pinned `pnpm@8.15.9`.
- Do **not** switch package managers or add `package-lock.json` / `yarn.lock`.
- `.npmrc` uses `shamefully-hoist=true` + public-hoist patterns for RN native modules. Keep it.

## Dev commands
Run from repo root:
- `pnpm dev:mobile` — start Expo dev server (`apps/mobile`).
- `pnpm start` / `pnpm android` / `pnpm ios` — delegate to `apps/mobile`.
- `pnpm typecheck` — `tsc --noEmit` across workspaces.
- `pnpm lint` — eslint across workspaces.
- `pnpm test` — vitest (mobile) + others.
- `pnpm doctor` — `expo-doctor` for the mobile app.

From `apps/mobile` directly: `pnpm dev`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm doctor`, `pnpm web`.

## Expo SDK rules (IMPORTANT)
- SDK is **56**. Treat Expo's bundled versions as the source of truth for native modules.
- Prefer `npx expo install` and `npx expo install --check` over raw `pnpm add` for
  Expo/RN packages. Do **not** blindly upgrade to npm "latest".
- Intentionally pinned ahead of SDK and excluded from `expo install` validation
  (`apps/mobile/package.json` → `expo.install.exclude`):
  - `react-native-reanimated@4.4.0` (needs `react-native-worklets@0.9.x`).
  - `react-native-worklets@0.9.1` (must track Reanimated 4, not SDK's 0.8.x).
  - `react-native-css@3.0.7` (paired with NativeWind 5 preview).
- `nativewind@5.0.0-preview.4` is a **preview** release wired up via custom
  `metro.config.js` + `postcss.config.mjs`. Don't "upgrade" or restructure it casually.
- Reanimated's babel transform comes from `babel-preset-expo` automatically *because*
  `react-native-worklets` is a direct dependency. Keep it declared.

## Native workflow
- This is a **prebuild/CNG project with committed native folders** (`apps/mobile/ios`,
  `apps/mobile/android`). When native folders exist, EAS Build ignores many
  `app.config.ts` fields (orientation, icon, scheme, android, plugins, ios).
  If you change those config fields, you must `npx expo prebuild` (or edit native
  files) for them to take effect.
- Identifiers: iOS `au.com.hihired.app`, Android `com.hihired.app`.
- There is **no** root-level Expo app, `app.json`, or root `ios/`/`android/`. The old
  duplicate scaffold was removed — do not recreate it.

## Routing (Expo Router, typed routes)
- File-based under `apps/mobile/app/`. Entry is `expo-router/entry` (package `main`).
- `app/_layout.tsx` is the root: providers (QueryClient → PostHog → Auth) + an auth
  gate that redirects based on session/profile/role (`lib/auth-gate.ts`, `lib/routing.ts`).
- Route groups: `(auth)`, `(onboarding)`, `(candidate)/(tabs)`, `(employer)/(tabs)`,
  `(provider)`, plus `chat`. `app/index.tsx` shows a loader; the root layout redirects.
- `GestureHandlerRootView` wraps the candidate tabs (swipe deck). `SafeAreaProvider`
  comes from expo-router by default.
- Don't rename routes/groups without updating `lib/routing.ts` and the auth gate.

## Environment variables
- Client env is `EXPO_PUBLIC_*`, read via `process.env.EXPO_PUBLIC_*` (inlined at build)
  and/or `Constants.expoConfig.extra`. See `apps/mobile/.env.example`; copy to `.env.local`.
- Supabase: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- PostHog: `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_POSTHOG_HOST`.
- Sentry: `EXPO_PUBLIC_SENTRY_DSN`, etc.
- Never commit real secrets. `.env.local` is gitignored.

## Conventions
- TypeScript is **strict** in `apps/mobile/tsconfig.json` — keep it. Fix at the root
  cause; avoid `// @ts-ignore`. Cross-platform shims may cast at a clearly-commented boundary.
- Web build stubs native-only modules via `metro.config.js`; analytics/secure-store/etc.
  must stay guarded by `Platform.OS` checks and web-safe wrappers (see `lib/posthog.ts`,
  `SafePostHogProvider`).
- Path aliases: `@/*` → `apps/mobile/*`, `@hi-hired/shared` → `packages/shared/src`.

## Things future sessions must NOT do
- Don't recreate a root-level Expo app / `app.json` / root `ios`/`android`.
- Don't run `npx expo install --fix` blindly — it will fight the intentional pins above.
- Don't upgrade `react-native-reanimated`, `react-native-worklets`, `react-native-css`,
  or `nativewind` without checking the pairing constraints in this file.
- Don't switch package managers or disable `shamefully-hoist`.
- Don't weaken TypeScript strictness to silence errors.

## Known environment limitation (cloud sessions)
`npx expo install --check`, expo-doctor's config-schema check, and the React Native
Directory check require `api.expo.dev` / `reactnative.directory`, which the cloud
network policy may block (`Host not in allowed list`). Run those locally to validate.
