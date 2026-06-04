# Codebase Fix Plan

> **For Hermes:** Use subagent-driven-development to implement this plan phase-by-phase, task-by-task.

**Goal:** Fix all 44 issues identified in the exhaustive code review — security holes, data leakage, broken builds, correctness bugs, dead code, and CI/CD misconfigurations across mobile app, backend, shared packages, edge functions, and infrastructure.

**Architecture:** Phased approach by severity + dependency order. Phase 0 unblocks builds and development. Phase 1 patches security/privacy issues. Phases 2-3 fix correctness bugs. Phases 4-5 clean up debt and polish CI/CD.

**Tech Stack:** TypeScript (Expo/React Native), Python (FastAPI), Deno (Edge Functions), Helm/K8s, GitHub Actions

---

## Phase 0 — Build & Infrastructure (unblocks everything)

### Task 0.1: Fix `packages/shared/package.json` dependency versions

**Objective:** Replace non-existent package versions with real ones so `pnpm install` works.

**Files:**
- Modify: `packages/shared/package.json:10-20`

**Details:**
The review found three version numbers that don't exist on npm:
- `zod: "4.4.3"` → change to `"~3.23.8"` (latest 3.x)
- `typescript: "6.0.3"` → change to `"~5.7.3"` (latest 5.x)
- `vitest: "4.1.7"` → change to `"~2.1.8"` (latest 2.x)

Also fix `main` and `types` fields — they point to raw `.ts` source but `tsconfig.json` has `noEmit: true`. Either:
- Change `main`/`types` to point to `./dist/index.js`/`.d.ts` and configure build script, OR
- Change `tsconfig.json` to `noEmit: false` with proper `outDir`, OR
- Keep source references but add a `package.json` `"exports"` field for `./src/index.ts`

**Simplest fix:**
```
  "main": "./src/index.ts",
  "types": "./src/index.ts",
```
(some consumers can handle raw TS via ts-node or bundler)

And versions:
```
  "zod": "^3.23.8",
  "typescript": "^5.7.3",
  "vitest": "^2.1.8"
```

**Verification:**
```bash
cd /home/admin/swipe-job-search && pnpm install 2>&1 | tail -20
# Should succeed without 404 errors
```

### Task 0.2: Fix `backend/src/core/config.py` corruption

**Objective:** Remove the literal `@property` text embedded in the `redis_url` Pydantic field default value.

**Files:**
- Modify: `backend/src/core/config.py:14`

**Details:**
Current: `redis_url: str = "redis://localhost:***@property"`
Fix: `redis_url: str = ""`
(The actual URL comes from env vars via Pydantic's `SettingsConfigDict(env_prefix="HH_")`)

Also verify the full Settings class parses correctly after fix by checking if lines between 14-39 are intact (review flagged C6 about incomplete config).

**Verification:**
```bash
cd /home/admin/swipe-job-search && python3 -c "from src.core.config import get_settings; s = get_settings(); print('redis_url:', s.redis_url)"
# Should print 'redis_url: ' (empty) or the env var value
```

### Task 0.3: Fix root `tsconfig.json` strict null checks

**Objective:** Enable `strictNullChecks: true` so null/undefined errors are caught at compile time.

**Files:**
- Modify: `tsconfig.json:6`

**Details:**
The root tsconfig inherits from `expo/tsconfig.base` which likely has `strictNullChecks: false`. Either override it in our tsconfig or check if the expo base has a `strict: true` option. The best practice is:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true
  }
}
```

**Verification:**
```bash
cd /home/admin/swipe-job-search/apps/mobile && npx tsc --noEmit 2>&1 | head -30
# May surface new errors that were previously hidden — triage per-file
```

---

## Phase 1 — Security & Privacy (must fix first)

### Task 1.1: Remove `sendDefaultPii: true` from Sentry config

**Objective:** Stop sending user PII (email, name, suburb) to Sentry on every error. AU Privacy Act risk.

**Files:**
- Modify: `apps/mobile/lib/sentry.ts:31`

**Details:**
Change `sendDefaultPii: true` → `sendDefaultPii: false`.
Add `beforeSend` hook that explicitly scrubs any PII fields from error events before sending.

**Verification:** TypeScript compiles clean. Confirm Sentry config doesn't expose PII.

### Task 1.2: Fix compliance-export PDF data leakage

**Objective:** Each provider should only receive a PDF containing their own candidates' data, not all candidates.

**Files:**
- Modify: `supabase/functions/compliance-export/index.ts:130-175`

**Details:**
The bug: `generateCompliancePdf(reportData)` is called ONCE for all candidates (line 158), but then the same `pdfBytes` is uploaded to every provider's storage bucket (line 162-174). Each provider gets the full report.

Fix: Move PDF generation inside the provider-group loop. For each provider group, extract only that group's candidate data, generate a separate PDF, and upload it separately.

**Steps:**
1. Extract candidate grouping by provider (already done at line 162)
2. For each provider group, filter `reportData` to only include that group's candidates
3. Call `generateCompliancePdf` inside the loop with filtered data
4. Upload the per-provider PDF to the correct bucket

**Verification:** Review the logic to confirm each provider-group gets only its own data.

### Task 1.3: Fix Edge Function non-null assertions on env vars

**Objective:** Replace `!` assertions with explicit validation that surfaces clear errors on startup.

**Files:**
- Modify: `supabase/functions/compliance-export/index.ts:22-23`
- Modify: `supabase/functions/notification-processor/index.ts:32-33`
- Modify: `supabase/functions/expire-jobs/index.ts:14-15`

**Details:**
Replace:
```typescript
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
```
With:
```typescript
function requireEnv(name: string): string {
  const val = Deno.env.get(name);
  if (!val) throw new Error(`FATAL: ${name} is not set`);
  return val;
}
const supabaseUrl = requireEnv('SUPABASE_URL');
```

**Verification:** Function rejects with clear error when env vars are missing. Accepts when present.

### Task 1.4: Fix backend rate limiter behind proxy

**Objective:** Rate limiting breaks behind reverse proxy because `request.client.host` returns proxy IP.

**Files:**
- Modify: `backend/src/api/middleware/rate_limit.py:138`

**Details:**
Replace `request.client.host` with proper X-Forwarded-For parsing:
```python
forwarded = request.headers.get("X-Forwarded-For", "")
ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
```

**Verification:** Review logic handles multiple X-Forwarded-For proxies correctly (first IP is the real client).

### Task 1.5: Fix Helm chart AWS credentials and CORS

**Objective:** Remove long-lived AWS credentials from K8s secrets (contradicts IRSA). Fix wildcard CORS.

**Files:**
- Modify: `infra/helm/backend/values.yaml:81,89-94`

**Details:**
1. Remove `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` from `values.yaml` `secrets` section — IRSA handles this
2. Change `CORS_ORIGINS: "*"` → `CORS_ORIGINS: ""` (empty = read from env at deploy time)

**Verification:** No AWS credentials in values.yaml. CORS default is safe.

### Task 1.6: Make critical secrets non-optional in Helm templates

**Objective:** Pods should fail-fast when critical secrets are missing, not start with empty values.

**Files:**
- Modify: `infra/helm/backend/templates/deployment.yaml:56-85`

**Details:**
Change `optional: true` to `optional: false` (or remove the `optional` key) for:
- `SUPABASE_SERVICE_KEY`
- `OPENAI_API_KEY`

Leave `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` as-is (they'll be removed in Task 1.5).

**Verification:** Pod fails to start if expected K8s Secret is missing.

---

## Phase 2 — Backend Correctness

### Task 2.1: Fix `asyncio.run()` in Celery task

**Objective:** Replace `asyncio.run()` which creates a new event loop per invocation and crashes in thread-pool workers.

**Files:**
- Modify: `backend/src/workers/processing.py:54`

**Details:**
Current: `checked, expired = asyncio.run(pruner.verify_active_jobs(supabase))`

Fix: Use `asyncio.get_event_loop().run_until_complete()` or restructure the Celery task to be async-native. The cleanest fix for a Celery task that needs async:
```python
loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)
try:
    checked, expired = loop.run_until_complete(pruner.verify_active_jobs(supabase))
finally:
    loop.close()
```

But better: extract the async work into a sync wrapper so Celery's sync worker model is happy.

**Verification:** Celery task runs without `RuntimeError: There is no current event loop`.

### Task 2.2: Fix synchronous Supabase calls in async endpoints

**Objective:** The Supabase Python SDK uses synchronous `requests` under the hood. All `.execute()` calls in async route handlers block the event loop.

**Files:**
- Modify: `backend/src/api/endpoints/compliance.py:137-168,379-393,406-418,448-462,468-475,481-487,492-498,501-508,511-517,576-581,585-592,640-641,708-714,720-728,733,766-770`
- Modify: `backend/src/api/middleware/auth/__init__.py:149-156`

**Strategy:**
Option A (recommended): Run Supabase queries in a thread pool using `asyncio.to_thread()` to avoid blocking the event loop:
```python
async def _query_supabase(client, table, select, ...):
    return await asyncio.to_thread(
        lambda: client.table(table).select(select).execute()
    )
```

Option B: Use the async Supabase client if available, or switch to `httpx`-based raw requests.

**Simplest fix:** Wrap each `.execute()` call group in `asyncio.to_thread()`. This is a mechanical change that preserves all existing code.

**Note:** The review flagged ~40+ call sites. Group them by endpoint and fix in batches:
- Task 2.2a: Fix `compliance.py` (15+ call sites)
- Task 2.2b: Fix `auth/__init__.py` (1 call site, runs on every request)
- Task 2.2c: Fix remaining files

**Verification:** Endpoints respond without blocking. Event loop remains available for other requests during DB queries.

### Task 2.3: Fix EventSubscriber Redis connection leak

**Objective:** Stop creating new Redis connections on every loop iteration without closing old ones.

**Files:**
- Modify: `backend/src/services/event_subscriber.py:36-37`

**Details:**
Move Redis connection creation outside the retry loop. Old connections should be closed in a `finally` block:
```python
r = None
while self._running:
    try:
        if r is None:
            r = aioredis.from_url(self.redis_url, decode_responses=True)
        ...
    except Exception:
        if r:
            await r.close()
            r = None
        await asyncio.sleep(1)
```

Also fix the `stop()` method to interrupt the `ps.listen()` call — set `self._running = False` AND close the Redis connection to unblock the listener.

**Verification:** No connection count growth in Redis `CLIENT LIST` during repeated connection failures.

### Task 2.4: Fix cache stampede lock race condition

**Objective:** Lock deletion must verify ownership to prevent one process deleting another's lock.

**Files:**
- Modify: `backend/src/services/cache_manager.py:340`

**Details:**
Replace `await r.delete(lock_key)` with a Lua script that compares the stored value:
```python
DELETE_IF_OWNED = """
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
else
    return 0
end
"""
await r.eval(DELETE_IF_OWNED, 1, lock_key, lock_value)
```

Where `lock_value` is a unique identifier per process (e.g., `f"{os.getpid()}-{id(compute_fn)}"`).

**Verification:** When compute takes longer than lock TTL, a fast process acquiring the new lock is not deleted by the slow process's cleanup.

### Task 2.5: Fix data_pruner sequential URL verification

**Objective:** Use `asyncio.gather()` with semaphore for concurrent URL verification.

**Files:**
- Modify: `backend/src/services/data_pruner.py:159-193`

**Details:**
Replace:
```python
for job in jobs:
    is_active, reason = await self.verify_job_url(url)
```
With:
```python
sem = asyncio.Semaphore(20)  # 20 concurrent verifications
async def check(job):
    async with sem:
        return await self.verify_job_url(job.url)

results = await asyncio.gather(*[check(job) for job in jobs])
```

**Verification:** With 1000 jobs, verification completes ~20x faster than before.

### Task 2.6: Fix ML scoring CPU-bound blocking in async endpoints

**Objective:** ML model prediction (`model.predict()`) is CPU-bound and blocks the event loop.

**Files:**
- Modify: `backend/src/services/match_scorer.py:62`
- Modify: `backend/src/api/endpoints/forecast.py:196`

**Details:**
Run CPU-bound predictions in a thread pool:
```python
import asyncio
score = await asyncio.to_thread(model.predict, features)
```

**Verification:** Prediction endpoint doesn't block other concurrent requests.

### Task 2.7: Fix compliance.py date handling and query

**Objective:** Fix fragile `periodEnd + 'T23:59:59Z'` concatenation and unused `.or_()` wrapper.

**Files:**
- Modify: `backend/src/api/endpoints/compliance.py:109,149`

**Details:**
1. Date handling: Use proper ISO datetime construction via `datetime.fromisoformat()` or `dateutil.parser`
2. Query: Replace `.or_()` with direct `.eq()`

**Verification:** Date boundary queries are correct. No unnecessary OR wrappers.

---

## Phase 3 — Mobile App Correctness

### Task 3.1: Fix `(supabase as any)` pattern — typed queries

**Objective:** All ~30+ Supabase queries bypass TypeScript checking. The `Database` type parameter already exists but is never used.

**Files:**
Modify every file that uses `(supabase as any).from(...)` or `(supabase.from('...') as any)`:
- `apps/mobile/hooks/useChat.ts`
- `apps/mobile/hooks/useCreateMatch.ts`
- `apps/mobile/hooks/useHireConfirm.ts`
- `apps/mobile/hooks/useInterestedList.ts`
- `apps/mobile/hooks/useMatchInbox.ts`
- `apps/mobile/hooks/useMyJobs.ts`
- `apps/mobile/hooks/useJobDeck.ts`
- `apps/mobile/hooks/useJobsPipeline.ts`
- `apps/mobile/hooks/useSalaryAggregate.ts`
- `apps/mobile/lib/moderation.ts`
- `apps/mobile/lib/notifications.ts`
- Various screen files

**Strategy:**
1. Remove all `as any` casts from Supabase queries
2. Type the `supabase` client as `SupabaseClient<Database>` — the type is already created in `lib/supabase.ts` but unused
3. Fix any TypeScript errors that surface from proper typing

**This is a large task (>30 files).** Recommended approach:
1. Fix the type export in `lib/supabase.ts` to correctly export typed client
2. Fix hooks one at a time, compiling after each
3. Some dynamic queries may need `as never` or explicit type annotations if the types are incomplete

**Verification:** `npx tsc --noEmit` surfaces zero `as any` supabase errors. All queries are type-checked.

### Task 3.2: Fix SwipeDeck optimistic rollback bug

**Objective:** When swipe API call fails, the swiped card is permanently lost from the local deck because `SwipeDeck` manages its own `localJobs` state independently from parent.

**Files:**
- Modify: `apps/mobile/components/deck/SwipeDeck.tsx:64-71`
- Modify: `apps/mobile/hooks/useJobDeck.ts:158-162`

**Strategy:**
The root cause is dual state — `SwipeDeck` has `localJobs` and the parent has `jobs`. On error, `useJobDeck` rolls back its state but `SwipeDeck` doesn't re-sync.

**Fix:** Make `SwipeDeck` a controlled component — derive its display state entirely from the parent `jobs` prop instead of maintaining `localJobs`. Remove the `updateLocalJobs` optimistic removal and instead let the parent handle removal on success:
1. Remove `localJobs` state from `SwipeDeck` — use `jobs` prop directly
2. Parent calls `setJobs(prev => prev.slice(1))` only after successful API call
3. On error, parent simply doesn't update, so the card remains

**Verification:** Simulate network error during swipe — card stays in deck. Successful swipe removes card.

### Task 3.3: Fix chat pagination

**Objective:** `loadMore` in `useChat.ts` fetches the wrong page for sparse conversations because `Math.floor(current.length / PAGE_SIZE)` is not a stable page counter.

**Files:**
- Modify: `apps/mobile/hooks/useChat.ts:138-151`

**Details:**
Replace the `Math.floor(current.length / PAGE_SIZE)` approach with a proper `pageNumber` counter that increments on each "load more" call:

```typescript
const [pageNumber, setPageNumber] = useState(0);

async function loadMore() {
  const nextPage = pageNumber + 1;
  const { data } = await chatQuery(matchId, nextPage, PAGE_SIZE);
  if (data?.length) {
    setMessages(prev => [...data, ...prev]);
    setPageNumber(nextPage);
  }
}
```

**Verification:** Load more fetches correct pages regardless of conversation size.

### Task 3.4: Fix AppState stale closure in useJobsPipeline

**Objective:** `AppState.addEventListener('change', ...)` captures `currentPage` in its closure at setup time. After page changes, the foreground handler pre-fetches the wrong page.

**Files:**
- Modify: `apps/mobile/hooks/useJobsPipeline.ts:139-151`

**Details:**
Replace the effect-based `addEventListener` with a `useRef` to track current page:

```typescript
const currentPageRef = useRef(currentPage);
currentPageRef.current = currentPage;

useEffect(() => {
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      preFetchPage(currentPageRef.current + 1);
    }
  });
  return () => sub.remove();
}, []); // No deps — uses ref for latest value
```

**Verification:** After advancing pages, app-foreground event pre-fetches the correct next page.

### Task 3.5: Fix `errors.ts` getErrorMessage fallback

**Files:**
- Modify: `apps/mobile/lib/errors.ts:3`

**Details:**
Current: `String((error as { message: unknown }).message)` produces `"[object Object]"` when message is an object.
Fix: Check if message is a string first, fall back to JSON.stringify for objects, then `String(error)`.

**Verification:** Error messages are always human-readable strings.

### Task 3.6: Fix `CommuteBadge` flicker

**Files:**
- Modify: `apps/mobile/components/deck/CommuteBadge.tsx:22-33`

**Details:**
The fade animation resets opacity to 0 before fading to 1 on every `minutes` change. Skip the reset when the value change is minor (< 5 minute difference).

**Verification:** Small time changes don't cause visible flicker.

---

## Phase 4 — Dead Code & Maintainability

### Task 4.1: Remove dead code files

**Files:**
- Delete: `apps/mobile/lib/analytics.ts` (both exported functions, never imported)
- Delete: `apps/mobile/lib/gesture.ts` (entire file, only imported in its own test)
- Delete: `apps/mobile/lib/auth/oauth.ts` (entire file — login screen calls supabase directly)
- Delete: `apps/mobile/components/deck/SwipeOverlay.tsx` (entire component)
- Delete: `apps/mobile/lib/login-config.ts` (2 constants about Apple auth, could inline)

**Verification:** Search confirms no remaining imports reference deleted files. Tests pass.

### Task 4.2: Remove dead code functions

**Files:**
- Modify: `apps/mobile/lib/onboarding-submit.ts`

**Details:**
Remove functions:
- `buildEmployerProfileUpdate()` (only called in test files)
- `buildEmployerProfileInsert()` (never called anywhere)

**Verification:** Tests that use these functions are updated or removed.

### Task 4.3: Fix inconsistent code style

**Objective:** Standardize quoting, semicolons, and import paths across the codebase.

**Files:** Multiple — best addressed via linter auto-fix rather than manual edits.

**Steps:**
1. Configure ESLint with consistent rules (quotes, semicolons)
2. Run `eslint --fix` across `apps/mobile/`
3. Fix relative imports like `../../lib/errors` to use `@/lib/errors` alias

**Verification:** Linter passes with zero style violations.

### Task 4.4: Extract overlong files

**Objective:** Split files exceeding recommended length thresholds.

**Files to split:**
1. `apps/mobile/app/(provider)/compliance/index.tsx` (465 lines) → Extract `ReportCard` component
2. `apps/mobile/hooks/useJobDeck.ts` (213 lines) → Extract pipeline management into separate service
3. `apps/mobile/components/deck/JobCard.tsx` (280 lines) → Extract sub-components
4. `backend/src/api/endpoints/compliance.py:328-540` → Extract pipeline steps

**Verification:** Each extracted file is < 200 lines. Tests pass.

---

## Phase 5 — CI/CD & Infrastructure

### Task 5.1: Fix Helm deploy in release.yml

**Objective:** Currently sets `image.repository` to the full URI (`repo:tag`) which produces `repo:tag:tag` in the deployment template.

**Files:**
- Modify: `.github/workflows/release.yml:195-206`

**Details:**
The `docker-build` job outputs `image_tag` as the full URI (`registry/repo:tag`). The Helm deploy then sets `image.repository=${{ needs.docker-build.outputs.image_tag }}` which is already the full URI. Since `deployment.yaml` appends `:{{ .Values.image.tag }}`, the result is `registry/repo:tag:tag`.

Fix: Change the Helm deploy to use correct values:
```yaml
--set image.repository=$ECR_REGISTRY/$ECR_REPOSITORY \
--set image.tag=$IMAGE_TAG
```

Where `ECR_REGISTRY`, `ECR_REPOSITORY`, and `IMAGE_TAG` are extracted from the docker-build output separately.

**Verification:** Helm template produces `registry/repo:tag` (single tag).

### Task 5.2: Fix CodeQL config for JavaScript

**Objective:** Change `build-mode: none` to `build-mode: autobuild` so security taint-tracking queries run on JS/TS code.

**Files:**
- Modify: `.github/workflows/codeql.yml:49`

**Details:**
```yaml
- name: Initialize CodeQL
  uses: github/codeql-action/init@v3
  with:
    languages: ${{ matrix.language }}
    build-mode: ${{ matrix.language == 'javascript-typescript' && 'autobuild' || 'none' }}
```

**Verification:** CodeQL analysis includes security-relevant queries for JS/TS.

### Task 5.3: Fix disabled workflow jobs

**Objective:** Enable or remove jobs disabled with `if: false`.

**Files:**
- Modify: `.github/workflows/ci.yml:57,73`

**Details:**
Either remove the disabled Maestro smoke test and EAS preview jobs, or add proper conditions:
```yaml
if: github.ref == 'refs/heads/main' && github.event_name == 'push'
```

**Verification:** CI config is clean with no dead jobs.

### Task 5.4: Fix outdated Deno imports

**Objective:** Update pinned Deno std versions from `@0.168.0` to current stable.

**Files:**
- Modify: `supabase/functions/compliance-export/index.ts:20`
- Modify: `supabase/functions/notification-processor/deno.json`

**Details:**
Update import map version to `@0.224.0` or whatever is current.

**Verification:** Edge Functions deploy and run without deprecation warnings.

---

## Execution Order

```
Phase 0 (Build)     → unblocks development
  ├── 0.1 package.json versions
  ├── 0.2 config.py corruption
  └── 0.3 tsconfig strictNullChecks

Phase 1 (Security)  → must fix before any release
  ├── 1.1 Sentry PII
  ├── 1.2 Compliance PDF leak
  ├── 1.3 Edge Function validation
  ├── 1.4 Rate limiter proxy fix
  ├── 1.5 Helm CORS/creds
  └── 1.6 Secret optional flags

Phase 2 (Backend)   → correctness + performance
  ├── 2.1 asyncio.run fix
  ├── 2.2 Sync Supabase calls (3 sub-tasks)
  ├── 2.3 EventSubscriber leak
  ├── 2.4 Cache lock race
  ├── 2.5 Sequential URL verification
  ├── 2.6 CPU-bound ML in async
  └── 2.7 Compliance.py date handling

Phase 3 (Mobile)    → correctness + stability
  ├── 3.1 Typed Supabase queries
  ├── 3.2 SwipeDeck rollback
  ├── 3.3 Chat pagination
  ├── 3.4 AppState stale closure
  ├── 3.5 errors.ts fallback
  └── 3.6 CommuteBadge flicker

Phase 4 (Cleanup)   → debt reduction
  ├── 4.1 Dead files
  ├── 4.2 Dead functions
  ├── 4.3 Code style
  └── 4.4 Large file extraction

Phase 5 (CI/CD)     → deployment reliability
  ├── 5.1 Helm deploy
  ├── 5.2 CodeQL config
  ├── 5.3 Disabled jobs
  └── 5.4 Deno imports
```

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|:---:|:---:|------------|
| Phase 3.1 (typed Supabase) surfaces deep type issues requiring schema regeneration | Medium | High | Run `supabase gen types` first to ensure types are current. If types are incomplete, fix DB migration before code. |
| Phase 2.2 (async Supabase) large blast radius — 40+ call sites | Medium | High | Fix in `asyncio.to_thread()` wrapper batches. Test each batch. |
| Phase 1.2 (PDF data leakage) — fix could introduce new bug in grouping logic | Medium | High | Add unit tests for the provider-grouping logic before refactoring. |
| Phase 0.3 (strictNullChecks) may surface hundreds of new TS errors | High | Medium | Fix incrementally — one module at a time — rather than enabling globally. |
| Phase 4.1 file deletions might break imports we missed | Low | Medium | Search for remaining import references before deleting. |
