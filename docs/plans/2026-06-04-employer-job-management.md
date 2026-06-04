# Employer Job Management Implementation Plan

Goal: let employers manage existing job posts without leaving the app: edit details, pause active jobs, and reopen paused/expired jobs.

Architecture: keep this as a mobile-side vertical slice against the existing `jobs` table and current RLS. Reuse `JobForm` for create/edit. Keep ownership enforcement via Supabase filters and existing RLS (`employer_id = auth.uid()`).

Tech Stack: Expo Router, React Native, TanStack Query, Supabase JS, Vitest.

---

## Technical Schema

- Data source: `jobs` rows owned by `profile.id`.
- Editable fields: `title`, `job_type`, `pay_amount`, `pay_period`, `pay_display`, `hours_text`, `suburb`, `description`, `photo_url`.
- Status controls:
  - `active` future expiry -> `paused`
  - `paused` -> `active`
  - expired/past-expiry -> `active` and extend `expires_at` 30 days
  - `hired` -> no pause/reopen action
- Cache invalidation: `['my-jobs', profile.id]` after edits/status changes.
- Routes:
  - list: `/(employer)/(tabs)/jobs`
  - edit: `/(employer)/(tabs)/jobs/[id]/edit`

## Tasks

### Task 1 — Component contract tests
- Add `JobForm.test.tsx` for edit initial values, edit submit, and no reset in edit mode.
- Add `JobListItem.test.tsx` for Edit + Pause/Reopen callbacks and hired action suppression.
- Verify tests fail before production changes.

### Task 2 — Reusable job form
- Add `initialValues`, `submitLabel`, `errorFallback`, and `resetOnSubmit` props to `JobForm`.
- Preserve current create-mode behavior.

### Task 3 — Shared job submit helpers
- Create `apps/mobile/lib/job-submit.ts` for `buildPayDisplay`, `uploadJobPhoto`, and payload builders.
- Use from post-job and edit-job screens.

### Task 4 — Edit screen
- Create `apps/mobile/app/(employer)/(tabs)/jobs/[id]/edit.tsx`.
- Fetch owned job by id, prefill form, update editable fields, invalidate jobs cache, return to jobs.

### Task 5 — List controls and status mutation
- Add Edit + Pause/Reopen handlers in `jobs.tsx`.
- Add buttons/status display in `JobListItem`.
- Hide status action for hired jobs.

### Task 6 — Verification
- Run targeted tests.
- Run lint on touched files.
- Run typecheck and confirm no errors in touched files, noting existing baseline.
- Commit and push if clean.
