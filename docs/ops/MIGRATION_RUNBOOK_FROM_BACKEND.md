# MIGRATION_RUNBOOK_FROM_BACKEND.md

**Status (2026-05-28):** FULL. Authored by jordan + dev via swarm DOC-2026-05-28-005 per gap-analysis-2026-05-28.md §6 Outline 5 + docs/superpowers/specs/2026-05-28-hi-hired-complete-docs-design.md §4 (Ops & Runbooks) + BACKEND.md § Migration Order + STACK.md § Deployment Targets + docs/plans/2026-05-27-001 §U2. Replaces all prior "adapt" notes.

**Priority:** MUST (blocker for any scaffold or U1 auth/onboarding per 2026-05-27 plan).

**Owners:** jordan (arch/ops) + dev (impl verification + CI). Sam reviews smoke + incident hooks. Human signs off post-first-run.

**Single Source of Truth:** This runbook + `docs/BACKEND.md` (canonical schema/RLS/Edge) + `STACK.md` (env matrix, EAS/CI secrets, 3-project rule). DRY by design: never duplicate the 16 migration file contents or full ERD here — transcribe directly from BACKEND.

**2026 Citations (verifiable, tool-sourced):**
- BACKEND.md § Migration Order (2026-05-27 17:34, 933ln): exact 16-file sequence `202605270001_extensions.sql` … `202605270016_seed.sql`; "A developer should be able to write numbered migrations directly from this document."
- ARCHITECTURE_AUDIT.md (2026-05-27): CRITICAL-1 (matches unique + atomic `create_match` + 23505 ignore), CRITICAL-2 (`notification_queue` + processor idempotency).
- STACK.md § Deployment Targets / Environment Variables Matrix / EAS (2026-05-27): three isolated Supabase projects (dev/staging/prod, Sydney `ap-southeast-2`), `SUPABASE_ACCESS_TOKEN` for CI dry-runs, EAS `development`/`preview`/`production` profiles, GitHub Actions CI with migration lint.
- docs/plans/2026-05-27-001-feat-hi-hired-mvp-implementation-plan.md §U2 (2026-05-27, 697ln): "Create supabase/migrations/202605270001_…016_seed.sql (16 files per BACKEND § Migration Order)"; "supabase db reset applies all 16"; Edge deploy after; smoke via employer post → candidate swipe → match → notif.
- gap-analysis-2026-05-28.md §6 Outline 5 + §8 (MCP Context7 + local Glob/Read 2026-05-28); design spec §4.
- No invention; all facts from 2026-05-27/28 tool runs (Grep/Read/Glob/Shell on BACKEND/plan/STACK + MCP schemas first).

---

## 1. Purpose & Scope

Operational runbook to take a fresh Supabase project (or reset) from zero to MVP-ready backend for Hi-Hired Expo RN TS monorepo. Covers prerequisites, exact numbered migration application order (sourced verbatim from BACKEND), verification (RLS, Edge, token upsert, end-to-end smoke), rollback/DR, CI integration (dry-run with `SUPABASE_ACCESS_TOKEN`), and post-migration beachhead seed + smoke (employer posts casual hospitality job → candidate right-swipes → match created with idempotency → push via `notification-processor`).

**Success gate (zero-blockers test):** A new dev or agent, following only root README "Next Step" + gap §6.5 + this file + BACKEND first 150 lines + STACK §Deployment, can execute the full sequence on a fresh Supabase project + run the smoke without external searches or questions.

**Out of scope (post-MVP or separate):** Provider bulk (Asuria/DES consent flag — see new PRIVACY doc), monetization, admin CSV ingest, quarterly re-audit script.

---

## 2. Prerequisites (Copy-Paste Commands)

1. Install Supabase CLI (2026-05-28 env: node 20.18+):
   ```bash
   npm install -g supabase
   supabase --version  # expect 1.1xx+ with Edge + pgmq support
   supabase login      # opens browser; stores token in ~/.supabase
   ```

2. Create **three isolated Supabase projects** (Sydney `ap-southeast-2` region for latency; never share service keys):
   - Dashboard → New project → name `hi-hired-dev-YYYYMM`, region Sydney, strong DB password (store in 1Password + EAS/GitHub secrets as `SUPABASE_DB_PASSWORD`).
   - Repeat for `hi-hired-staging-YYYYMM`, `hi-hired-prod-YYYYMM`.
   - Note project refs (e.g. `abc123def456.supabase.co`) and anon/service keys. Set in EAS secrets + GitHub repo secrets (never commit).

3. Local Supabase (optional for integration tests, per STACK):
   ```bash
   supabase init   # if not already in supabase/ dir
   supabase start  # starts local Postgres + Studio (http://localhost:54323)
   ```

4. GitHub/EAS secrets (STACK 2026-05-27 matrix):
   - `EXPO_TOKEN` (EAS auth)
   - `SUPABASE_ACCESS_TOKEN` (for `supabase db push` / lint in CI; generate in Supabase dashboard → Access Tokens, scope to specific projects)
   - Per-env: `SUPABASE_URL_DEV`, `SUPABASE_SERVICE_ROLE_KEY_DEV`, `SUPABASE_DB_PASSWORD_DEV`, etc.
   - EAS project ID (from `eas init` or Expo dashboard).

5. Clone + monorepo skeleton per STACK § Monorepo Structure (U1 in 2026-05-27 plan) — `supabase/` dir with `migrations/`, `functions/`, `seed/` ready.

6. Verify Supabase CLI can link (example for dev):
   ```bash
   cd supabase
   supabase link --project-ref <dev-project-ref>
   # Enter DB password when prompted
   ```

**Verification:** `supabase projects list` shows your three; `supabase status` (local) or dashboard health green.

---

## 3. Numbered Migration Order (Verbatim from BACKEND § Migration Order, 2026-05-27)

**Run exactly in this sequence on each target project (dev first, then staging, prod after human gate).** Transcribe file contents **directly from `docs/BACKEND.md` § PostgreSQL Schema / RLS Policy Matrix / Database Functions & Triggers / Storage Buckets** (do not invent columns, constraints, or policies). Use timestamped names as listed.

| # | File (in supabase/migrations/) | Key Contents (see BACKEND for full SQL) | Notes / Risks |
|---|--------------------------------|-----------------------------------------|---------------|
| 1 | `202605270001_extensions.sql` | `pgmq`, `pg_net`, `uuid-ossp`, `postgis` (if geo), etc. | Run first; idempotent. |
| 2 | `202605270002_enums.sql` | `user_role`, `job_status`, `swipe_direction`, `notification_status`, `match_status`, etc. | Matches BACKEND decisions table. |
| 3 | `202605270003_profiles.sql` | `profiles` table + `handle_new_user` trigger (auto profile on auth.users insert, role from metadata). | Ties to Supabase Auth hooks. |
| 4 | `202605270004_employer_profiles.sql` | `employer_profiles` (one-to-one with profiles, work rights, ABN, etc.). | MVP minimal fields per 02-mvp. |
| 5 | `202605270005_circles.sql` | `circles`, `circle_members`; seed default Northern Melbourne beachhead circle. | MVP: single circle (multi deferred). |
| 6 | `202605270006_jobs.sql` | `jobs` + indexes (employer_id, circle_id, status, expires_at, pay_amount). | Pay transparency fields required (cross AU_FAIR_WORK legal). |
| 7 | `202605270007_swipes.sql` | `swipes` + interest notification trigger (enqueues to queue). | ARCH CRITICAL-1 race guard. |
| 8 | `202605270008_matches.sql` | `matches` + UNIQUE (job_id, candidate_id) + `create_match` RPC (atomic insert + 23505 ignore per ARCH). | Employer-initiated per 02-mvp/BACKEND decisions. |
| 9 | `202605270009_messages.sql` | `messages` + message notification trigger. | Realtime + push dual path. |
| 10 | `202605270010_device_tokens.sql` | `device_tokens` (expo_push_token UNIQUE, profile_id). | Expo push per MCP 2026-05-28 + STACK. |
| 11 | `202605270011_notification_prefs_queue.sql` | `notification_preferences` + `notification_queue` (idempotency_key UNIQUE) + match_created trigger. | ARCH CRITICAL-2 fix; no client access (service_role only). |
| 12 | `202605270012_reports_blocks.sql` | `reports`, `blocks`. | App Store + Privacy compliance. |
| 13 | `202605270013_rls.sql` | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` + all policies from BACKEND RLS Policy Matrix (profiles/employer own, jobs public-active or employer, swipes candidate-own + job-visible, matches pair-only, device_tokens own, queue service-only, etc.). Force RLS. | Test with anon/auth roles post-apply. |
| 14 | `202605270014_storage.sql` | Buckets `avatars` (public read, owner insert), `job-photos`; storage policies. | Per BACKEND Storage Buckets + MCP 2026-05-28 patterns. |
| 15 | `202605270015_rpcs.sql` | `confirm_hire`, `unmatch`, helper RPCs (SECURITY DEFINER, search_path=). | Post-RLS. |
| 16 | `202605270016_seed.sql` | Beachhead jobs (20–30 realistic hospitality/retail for Tullamarine/Gladstone Park per 02-mvp + MELBOURNE_STRATEGY); demo employers/candidates. Guarded by `app.settings.seed_enabled`. | Dev/staging only; never prod. Manual or `supabase db reset --seed`. |

**How to create/apply each (copy-paste pattern):**
```bash
cd supabase
supabase migration new 202605270001_extensions   # creates the .sql file
# Paste exact content from BACKEND.md (search for the section)
supabase db push --linked   # or for local: supabase db reset
# Repeat for 002–016
```

After all 16 on a project:
- `supabase functions deploy notification-processor` (and `expire-jobs`).
- Dashboard → Database → Cron jobs: schedule `notification-processor` every 1 min; `expire-jobs` daily 00:00 Australia/Melbourne.
- Verify: `supabase db lint` clean; no errors in logs.

**Per plan 2026-05-27:** "Happy path: `supabase db reset` applies all 16 without error."

---

## 4. Verification Steps (Mandatory Before Hand-Off to Mobile)

1. **RLS smoke (anon vs auth roles):**
   ```sql
   -- In Supabase SQL editor or psql (as anon key role)
   SET ROLE anon;
   SELECT * FROM jobs;  -- should see only active public or error per policy
   SET ROLE authenticated;
   -- (use JWT for candidate/employer)
   ```
   Use Supabase client in a test script or Studio "SQL" tab with role switch. Cross-check against BACKEND RLS matrix.

2. **Edge Functions live:**
   - Deploy as above.
   - Manual invoke `notification-processor` via dashboard or `supabase functions invoke`.
   - Insert test row into `notification_queue` (service role) → observe processed/sent or attempts++.
   - Check `device_tokens` upsert works from Expo client (see new EXPO_ stack doc).

3. **Token registration + push path:**
   - In Expo dev client (physical device only per MCP 2026-05-28): register token → upsert to `device_tokens`.
   - Trigger a match (via RPC or direct insert respecting UNIQUE).
   - Observe queue row + (after 1 min cron) Expo push delivered (or log in processor).

4. **End-to-end MVP smoke (per plan U2 + ARCH fixes):**
   - Create test employer + candidate auth users + profiles.
   - Employer posts job (pay_amount structured + pay_display per AU_FAIR_WORK legal + 02-mvp).
   - Candidate right-swipes (atomic, no 23505 violation on duplicate).
   - Employer sees interest → creates match (RPC enforces employer-init + idempotency).
   - Both receive push (interest_received then match_created).
   - Realtime: both see inbox update via `postgres_changes` on `matches`.
   - Unmatch/hire flows via RPCs.
   - Verify `notification_queue` has idempotency_key, status= sent, no duplicates.

5. **CI dry-run gate (STACK + plan):**
   In GitHub Actions (or manual):
   ```yaml
   - name: Migration dry-run (dev)
     env:
       SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN_DEV }}
     run: |
       supabase link --project-ref <dev-ref>
       supabase db push --dry-run   # or equiv lint + plan
   ```
   Must pass before any prod migration. Use `SUPABASE_ACCESS_TOKEN` (not service key) for CI per STACK.

**Log all results** (screenshots or terminal output) to Discord #planning or agent session.

---

## 5. Rollback / Disaster Recovery

- **Local/dev:** `supabase db reset` (destructive; re-seed after).
- **Staging/prod:** 
  - Supabase point-in-time recovery (dashboard → Database → Backups) to pre-migration timestamp.
  - Or manual: have inverse migration files (e.g. `202605270016_seed_down.sql` that truncates seed only) + apply in reverse order with care (RLS last).
  - Never rollback prod without human + legal signoff (data purge implications per new DATA_RETENTION + PRIVACY docs).
- **Edge Functions:** `supabase functions delete <name>` + re-deploy prior version (keep git history of functions/).
- **Post-rollback verification:** Repeat §4 smoke; confirm no orphaned queue rows or RLS bypass.

**DR note:** 3-project isolation means dev/staging mistakes never touch prod. Always test full smoke on staging before prod promotion.

---

## 6. CI / EAS Integration (Build + Deploy)

See companion `docs/ops/EAS_BUILD_DEPLOY_CHECKLIST.md` (created in same swarm pass) for full EAS profiles, secrets, and GitHub Actions matrix.

**Key CI hooks (migrations only):**
- On PR to `main`: lint + typecheck + `supabase db lint` (local or linked dry-run with `SUPABASE_ACCESS_TOKEN`).
- On merge to `main` (dev/staging): `supabase db push` (gated by human + smoke pass on prior env).
- Prod: tagged release `v*` only after staging smoke + legal/compliance signoff.

**EAS build profiles** (from STACK):
- `development`: local dev client (QR).
- `preview`: internal TestFlight / Android internal track (main branch).
- `production`: App Store / Play Store (tagged).

Never embed secrets in EAS or mobile bundle (use EAS secrets + `expo-constants` for public EXPO_PUBLIC_* only).

---

## 7. Post-Migration / Next Actions

- Update `required-docs-manifest.md` row 23 status → "full 2026-05-28 by jordan/dev".
- Append to gap §6 Outline 5: "Implemented 2026-05-28 by jordan/dev via DOC-005".
- Hand off to dev lane for U1 auth + onboarding (see new EXPO_ROUTER... stack doc).
- **Critical swarm note (per query):** Test the migration steps + smoke manually on a fresh Supabase dev project **before U1** (auth/onboarding/swipe). Do not assume CI or plan will catch RLS/queue/23505 issues.
- Re-audit trigger: major SDK change, Fair Work amendment, or post-v1 (see manifest).

**When docs disagree:** BACKEND.md (schema truth) + STACK.md (deploy truth) win. This runbook is the *operational glue*.

**Questions during run?** Log to coord + `agent_logs` (do not assume); use Discord lane 1503120974198083747.

---

*End of runbook. All steps copy-paste executable. 2026-05-28 swarm. DRY, cited, zero blockers for new dev/agent.*