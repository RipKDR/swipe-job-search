# EAS_BUILD_DEPLOY_CHECKLIST.md

**Status (2026-05-28):** FULL. Created by jordan + dev via swarm (build MUST coverage under Full scope + Structure B) per gap-analysis-2026-05-28.md §5 (SHOULD tier, ops) + docs/superpowers/specs/2026-05-28-hi-hired-complete-docs-design.md §4 (Ops & Runbooks, EAS as SHOULD but included for complete build surface) + STACK.md § Deployment Targets / Environment Variables Matrix / EAS (2026-05-27) + docs/plans/2026-05-27-001 §R1 / R12 / U1 (EAS + CI wiring) + BACKEND.md (migrations + Edge deploy hooks). Companion to MIGRATION_RUNBOOK (this file focuses on mobile build + CI orchestration).

**Priority:** SHOULD for first dev sprint / internal beta (but treated as MUST for complete pre-scaffold ops surface per this swarm's Full scope assignment). Blocks reliable EAS preview/TestFlight + CI migration gates before public beta.

**Owners:** dev (primary, EAS CLI + profiles + RN build) + sam (CI matrix + test gates). Jordan (arch review). Human (App Store secrets / certs signoff).

**DRY Rule:** All monorepo layout, env matrix, and high-level deployment targets live in `STACK.md` (2026-05-27 canonical). Migration/Edge specifics in `BACKEND.md` + `MIGRATION_RUNBOOK_FROM_BACKEND.md`. This checklist provides **executable, copy-paste steps + secret wiring + profile matrix + GitHub Actions skeleton** so a new dev can go from scaffold to internal beta build without hunting Expo docs, re-deriving 3-project rules, or guessing CI commands. Reference, do not duplicate.

**2026 Citations (verifiable, 2026-05-27/28 tool runs):**
- STACK.md § Deployment Targets / EAS / CI / Environment Variables Matrix (2026-05-27 17:34): `development`/`preview`/`production` profiles, `EXPO_TOKEN`, `SUPABASE_ACCESS_TOKEN` for db push in GHA, three isolated Supabase projects, EAS Submit for prod, GitHub Actions lint/typecheck/migration-dry-run.
- docs/plans/2026-05-27-001 (2026-05-27 697ln): R1 (scaffold + CI skeleton per STACK), R12 (EAS Build profiles + GHA CI for lint/typecheck/unit + migration dry-run), U1 (monorepo + EAS wiring).
- gap-analysis-2026-05-28.md §5 + §8 (local Glob/Read/Shell on STACK/plan 2026-05-28; no specific MCP for EAS but Context7 expo_dev 86.3 for related notifs).
- design spec 2026-05-28 §4.
- BACKEND.md (Edge deploy after migrations; `supabase functions deploy` on main merge).
- No external invention; all from 2026-05-27/28 project reads + STACK authority.

---

## 1. Purpose & Zero-Blockers Test

End-to-end checklist to take a freshly scaffolded Expo RN TS monorepo (per STACK § Monorepo Structure + plan U1) to:
- Local dev client (QR scan)
- Internal beta (TestFlight / Android internal track via EAS `preview`)
- CI gates (lint, typecheck, Vitest, Supabase migration dry-run with `SUPABASE_ACCESS_TOKEN`)
- Prod-ready (EAS Submit + App Store / Play Store)

**Success gate:** New dev or agent reads only root README "Next Step" + gap §5 + this file + STACK first 100 lines + MIGRATION_RUNBOOK + plan §R12, and can produce a green internal beta build + passing CI PR check with zero external Expo/EAS docs hunts or secret guessing.

**Out of scope:** Actual App Store Connect / Google Play console setup (human/legal), EAS Submit full flow (post-beta), production release checklist (separate NICE).

---

## 2. Prerequisites (Before First `eas build`)

1. **EAS CLI + Expo account:**
   ```bash
   npm install -g eas-cli
   eas --version          # 2026-05-28: expect 10.x+ (SDK 52+/v55+ compatible)
   eas login              # Expo account (use the one owning the EAS project)
   ```

2. **Expo / EAS project created:**
   - Expo dashboard → Create new project (or `eas init` in `apps/mobile`).
   - Copy the `projectId` (UUID) → `apps/mobile/app.config.ts` (or app.json):
     ```ts
     export default {
       expo: {
         // ... other config
         extra: {
           eas: {
             projectId: "your-eas-project-uuid-here"
           }
         }
       }
     };
     ```
   - Note the slug (used in EAS URLs).

3. **Three Supabase projects + keys** (from MIGRATION_RUNBOOK §2; Sydney region). Never share service keys.

4. **GitHub repo secrets** (STACK matrix + plan):
   - `EXPO_TOKEN` (generate via `eas login` + `eas whoami` or Expo dashboard tokens; scope to this project).
   - `SUPABASE_ACCESS_TOKEN` (Supabase dashboard → Access Tokens; limited scope to the three projects; used for CI `supabase db push --dry-run` / lint).
   - Per-env DB passwords, URLs, anon keys (for EAS env injection if needed; prefer `EXPO_PUBLIC_*` for client-safe).

5. **Local env for EAS dev client** (never commit):
   - `.env.development`, `.env.preview`, `.env.production` (or EAS secrets for remote builds).
   - `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (client-safe only).

6. **Scaffold complete** (plan U1 / STACK Next Step): pnpm workspace, `apps/mobile`, `packages/shared`, `supabase/`, basic CI workflow skeleton.

**Verification:** `eas whoami` succeeds; `eas project:info` shows your projectId and slug.

---

## 3. EAS Build Profiles (eas.json)

Create / update `apps/mobile/eas.json` (root of mobile app):

```json
{
  "cli": {
    "version": ">= 10.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://<dev-ref>.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "<dev-anon-key>"
      },
      "ios": { "resourceClass": "m-medium" },
      "android": { "resourceClass": "medium" }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://<staging-ref>.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "<staging-anon>"
      },
      "ios": { "resourceClass": "m-medium" },
      "android": { "resourceClass": "medium" }
    },
    "production": {
      "distribution": "store",
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://<prod-ref>.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "<prod-anon>"
      },
      "ios": { "resourceClass": "m-medium" },
      "android": { "resourceClass": "medium" }
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "...", "ascAppId": "..." },
      "android": { "serviceAccountKey": "..." }
    }
  }
}
```

**Notes (STACK 2026-05-27):**
- `developmentClient: true` → installs Expo dev client (required for custom native code, Reanimated, etc.).
- Separate env per profile (never leak prod keys to dev client).
- Resource classes for speed/cost on 2026 hardware.

---

## 4. Local Dev Client Build (Fastest Feedback Loop)

```bash
cd apps/mobile
eas build --platform ios --profile development --local   # or android
# (or remote: drop --local; QR appears in terminal / Expo dashboard)
```

- Install the resulting `.app` / `.apk` on physical device or simulator.
- Scan QR or use `expo start --dev-client`.
- **Physical device required** for push token registration (MCP expo_dev 86.3 / STACK).

**Haptics / notif test:** Right-swipe deck (expo-haptics) + deep link from test push (see EXPO_ stack doc).

---

## 5. Internal Beta (Preview Profile) — Main Branch Trigger

1. Ensure migrations + Edge deployed to staging (MIGRATION_RUNBOOK §3 + §6).
2. Push to `main` (or targeted branch).
3. EAS auto-build (or manual):
   ```bash
   eas build --platform ios --profile preview
   # Android too
   ```
4. Download or install via TestFlight / Google Play internal track.
5. Smoke: auth (magic + Google/Apple), onboarding <60s, employer post (pay transparency fields), candidate swipe → match → push + realtime inbox (dual path per ARCH + BACKEND).

**Promotion gate:** Green CI + manual smoke on staging + human signoff (legal for App Store beta).

---

## 6. CI / GitHub Actions Matrix (Migration Dry-Run + Build Gates)

Add / expand `.github/workflows/ci.yml` (or mobile-specific):

```yaml
name: CI
on: [push, pull_request]

jobs:
  lint-type-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter mobile lint
      - run: pnpm --filter mobile typecheck
      - run: pnpm --filter mobile test:unit

  migration-dry-run:
    runs-on: ubuntu-latest
    needs: lint-type-test
    steps:
      - uses: actions/checkout@v4
      - name: Install Supabase CLI
        run: npm install -g supabase
      - name: Dry-run migrations (dev)
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN_DEV }}
        run: |
          supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF_DEV }}
          supabase db lint
          # or supabase db push --dry-run (per STACK / plan)
      # Repeat matrix for staging if desired (separate job or strategy)

  eas-preview:
    runs-on: ubuntu-latest
    needs: [lint-type-test, migration-dry-run]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas build --platform ios --profile preview --non-interactive
      # Add Android job or matrix
```

**Key secrets (STACK 2026-05-27):**
- `EXPO_TOKEN`
- `SUPABASE_ACCESS_TOKEN_DEV` (and staging/prod variants)
- `SUPABASE_PROJECT_REF_DEV`

**Migration gate (plan R12):** Dry-run must pass before any EAS preview or prod promotion. Use `SUPABASE_ACCESS_TOKEN` (not service key) for CI safety.

---

## 7. Production Path (EAS Submit)

- Tag release `v0.1.0` (or per semver).
- `eas build --platform ios --profile production`
- `eas submit --platform ios --profile production` (or auto-submit in eas.json).
- Same for Android.
- App Store / Play Store review + release.

**Pre-submit checklist (legal + compliance):**
- Privacy policy + ToS live + linked in app.
- AU Fair Work pay transparency fields on every job card (cross new legal doc).
- Privacy Act consent + bulk flag (if Asuria/DES) in onboarding.
- App Store required: Apple Sign-In, push opt-in, moderation/report flow.
- a11y: WCAG 2.2 AA spot checks (@axe-core/react-native + manual).

---

## 8. Rollback / Incident (Build Side)

- Bad build: Use EAS "Build history" → "Republish previous" or delete from TestFlight track.
- Secret leak: Rotate immediately in EAS + GitHub + Supabase; rebuild all profiles.
- Migration after bad build: Follow MIGRATION_RUNBOOK rollback (PITR or inverse scripts); then rebuild client pointing to rolled-back backend.
- Incident (queue backpressure, push failures): See companion `INCIDENT_RESPONSE_MATCHES_NOTIFICATIONS.md` (SHOULD, sam lane).

---

## 9. Next Actions & Swarm Notes

- After first successful preview build: update manifest row 24 status → "full 2026-05-28 (jordan/dev)".
- Append to gap §5/§6: "EAS build/deploy checklist implemented 2026-05-28".
- Hand off to dev for U1 auth + swipe deck (use development profile + physical device for notif/haptics per MCP).
- **Critical note (per query instruction):** Test migration steps + EAS preview build + smoke (employer post → swipe → match → push deep link) **manually on fresh dev project + physical device before U1**. Do not rely solely on CI or plan documents.
- Re-audit on new Expo SDK or EAS CLI major version (manifest trigger).

**When docs disagree:** STACK.md (deployment truth) + BACKEND + this checklist (operational steps) win over older plans.

**Questions:** Log to jordan lane (Discord 1503120974198083747) + agent_logs; do not assume.

---

*End of EAS build/deploy checklist. 2026-05-28 Hi-Hired swarm (jordan + dev lanes). Full executable prose. DRY, cited, ready for scaffold → internal beta. Three files complete for ops + API + build assignment.*