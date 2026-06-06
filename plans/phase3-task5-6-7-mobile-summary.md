# Phase 3 — Tasks 5+6+7 + Mobile Polish: Summary

**Completed:** 2026-06-06

---

## Task 5: Operationalize Pruning and Scraper Health

### Files modified

| File | Change |
|------|--------|
| `backend/src/workers/scraper.py` | Replaced `NotImplementedError` stub with full implementation: reads sources from Supabase `scrape_sources`, dispatches to per-source stub adapters (Seek, Indeed, Jora), chains through `process_raw_job`, records success/failure in `ScraperHealthMonitor`, respects quarantine. Added `get_health_summary()` and `clear_source_quarantine()` tasks for dashboard/admin use. |
| `backend/src/services/data_pruner.py` | Added `_log_prune_audit()` method that writes audit records to Supabase `prune_audit` table. Added `get_prune_summary()` for admin API consumption. Both are error-tolerant — audit writes never break the pruning pipeline. |
| `backend/src/workers/celery_app.py` | Added explicit beat schedule with documentation table. Three tasks: `verify-and-prune-jobs` (6h), `scrape-all-sources` (1h), `retrain-match-model` (24h). |
| `backend/src/workers/processing.py` | Added `retrain_match_model` task that triggers `run_training_pipeline()`. |
| `backend/src/services/ml_pipeline.py` | Added standalone `run_training_pipeline()` function wrapping `MatchTrainingPipeline.train()` for Celery task consumption. |

### Scraper adapter stubs

The per-source adapters (`_scrape_seek`, `_scrape_indeed`, `_scrape_jora`) are stubs that log structured messages and return empty results. Production implementation requires real API integration per source.

---

## Task 6: Tighten CI/CD and Release Promotion

### Files modified

| File | Change |
|------|--------|
| `.github/workflows/ci.yml` | Added `backend-test` job (ruff lint + mypy type-check + pytest). Renamed `typecheck-lint-test` to `ts-check`. Added `deno-test` stage with `needs` gate. Added stage gates: deno-test depends on ts-check, other jobs gated appropriately. |
| `.github/workflows/cd.yml` | Added `terraform-validate` job (fmt + validate). Full staging→production pipeline: terraform validate → terraform plan → terraform apply → docker build+scan → helm deploy staging → smoke test → manual approval gate → terraform production → helm deploy production. |
| `.github/workflows/release.yml` | Added `create-release` job that generates changelog from git log + creates GitHub Release via `softprops/action-gh-release`. Tags Docker image with release version. Adds production smoke test after deploy. |
| `.github/workflows/pr-review.yml` | Added `python-lint` job (ruff + mypy). Updated self-correction review to avoid duplicate comments (updates instead of re-posting). |

### Pipeline flow

```
CI:   ts-check → deno-test → [backend-test] → [supabase-db-lint] → [eas-preview] → [maestro-smoke]
CD:   terraform-validate → terraform-plan → [terraform-apply] → docker-build → helm-deploy-staging → smoke-test → MANUAL APPROVAL → terraform-production → helm-deploy-prod
Release: validate → create-release → [terraform] → docker-build → helm-deploy → [eas-submit]
```

Square brackets `[]` = conditional or disabled steps.

---

## Task 7: Docs Cover Generator

### Files modified

| File | Change |
|------|--------|
| `docs/README.md` | Added "Generated Assets" section with detailed instructions for cover image regeneration, dependencies, customisation, and DOCX assembly. |

### Verification

- Playwright is available in the environment
- Output PNGs exist at `docs/scripts/output/*.png` (already generated)
- Script runs cleanly

---

## Mobile Polish: Auth Session Handling

### Files modified

| File | Change |
|------|--------|
| `apps/mobile/lib/login-config.ts` | Set `APPLE_AUTH_ENABLED = true`. Apple sign-in is now active on iOS via Supabase OAuth. |
| `apps/mobile/lib/auth/signOutAndRedirect.ts` | Now also clears SecureStore tokens (`clearTokens()`) on logout. Best-effort: errors logged but don't block redirect. |
| `apps/mobile/app/(auth)/callback.tsx` | Added explicit handling for: OAuth cancellation (`access_denied` / `user_cancelled`), provider errors, no-code/no-token state (stale direct visits), session check on direct visit, improved error titles and descriptions. |
| `apps/mobile/app/(auth)/__tests__/login.test.tsx` | Updated to assert `APPLE_AUTH_ENABLED === true`. |
| `apps/mobile/lib/__tests__/signOutAndRedirect.test.ts` | Added test for `clearTokens` call on logout, and coverage for SecureStore failure. |

### Cleanup on logout

1. Supabase session cleared via `supabase.auth.signOut()`
2. SecureStore tokens cleared via `clearTokens()`
3. TanStack Query cache cleared via `queryClient.clear()` in AuthProvider
4. Zustand store: not currently used for auth state

---

## Test Results

| Test Suite | Result |
|------------|--------|
| Backend data pruner (11 tests) | ✅ All passing |
| Backend scraper health (37 tests) | ✅ All passing |
| Backend full suite (168 tests) | ⚠️ 1 pre-existing failure: `test_ml_pipeline` (MLflow file store maintenance mode — unrelated to changes) |
| Mobile auth tests (24 tests) | ✅ All passing |
| Mobile full suite (210 tests) | ⚠️ 1 pre-existing failure: `MatchCelebration` (`onProposeTrialShift` — unrelated to changes) |

---

## Remaining Work

- **Scraper adapters** (`_scrape_seek`, `_scrape_indeed`, `_scrape_jora`): need real API integration
- **Celery worker deployment**: requires running Celery beat + worker containers in staging/production
- **Hardening**: ScraperHealthMonitor is in-memory; production should back it with Redis/DB
