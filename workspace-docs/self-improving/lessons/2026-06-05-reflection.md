# Sprint Reflection: 2026-06-03 to 2026-06-05

## Metrics

- **39 commits** over 2 days
- **262 files changed**
- **+12,820 insertions, -947 deletions**
- **8 fix commits** in a single session (2026-06-04) — a signal of reactive rather than systematic work

## What Was Built

A large feature sprint followed by a significant quality cleanup:

**Features shipped:**
- ThemeProvider system
- Applied Jobs tab with test coverage
- Enhanced job detail screen + employer dashboard stats
- Interested list with avatars + full profile view + employer profile screen
- Job editing functionality
- React error boundaries at key boundaries
- Melbourne multi-source job scraper service (job-aggregator)
- Agent SDK project: code-improver + meta-router agents

**Quality work:**
- Full Supabase database type stubs (replacing `as any` across 25 files)
- Full codebase audit: zero TS errors, zero lint errors (34 files, 50+ errors fixed)
- packages/shared cleanup: deleted dead schemas, scoped internal constants
- Multiple performance fixes: inverted chat list, memoization, useCallback, skip queries on background cards

## Key Anti-Patterns That Emerged

### 1. TypeScript Error Accumulation

**What happened:** 50+ TypeScript errors built up before a single bulk audit caught them (commit c5d3be0d, touching 34 files).

**Root cause:** Types were only verified at commit time, not after each logical change group.

**Going forward:** Run `pnpm typecheck` after every logical change group. Treat TS errors like failing tests — fix at point of introduction, never defer.

### 2. Incomplete Database Type Stubs

**What happened:** The initial DB type stub (25 files de-anyed) omitted `Relationships: []` from all 13 tables. This caused all insert/update operations to type as `never`. Required a follow-up fix commit.

**Root cause:** The `Relationships` field is easy to overlook when manually creating type stubs, and its absence only manifests as `never` types in insert/update operations — not immediately obvious.

**Going forward:** Always include `Relationships: []` for every table. Use the checklist in `feedback_db_field_completeness.md`.

### 3. as-any Accumulation in Hook Files

**What happened:** `as any` casts appeared in useCandidateProfile, useMyJobs, useInterestedList, useMatchInbox. Required a dedicated refactor pass.

**Root cause:** When Supabase query return types were unclear, `as any` was used as a shortcut instead of fixing the underlying type issue.

**Going forward:** Never use `as any` in hook files. Use inferred types from the typed Supabase client. For complex FK traversals, use explicit typed assertions with comments.

### 4. Reactive Sequential Fix Commits

**What happened:** 8 separate `fix(mobile)` commits in one session — PostHog token leak, memo, queryKey ref, PII removal, hook safety, N+1 query, query invalidation, memoize gesture.

**Root cause:** Issues were discovered and fixed one at a time as they were encountered, rather than running a full diagnostic first.

**Going forward:** Run `pnpm typecheck && pnpm lint` at the start of any bug-fix session to get a complete picture. Group fixes by domain (security, data, performance, UX) into 3–4 commits instead of 8.

### 5. Incomplete Refactor Left in Stash

**What happened:** The AvatarPicker refactor was started, then abandoned to a `git stash` when 8 merge conflicts arose. The stash is invisible to future sessions.

**Root cause:** When blocked by merge conflicts, the path of least resistance was to stash and move on.

**Going forward:** Never stash an incomplete refactor at session end. Use a WIP branch (`wip/refactor-avatar-picker`) or revert cleanly. Stashes are invisible across sessions.

### 6. Dead Code Allowed to Accumulate

**What happened:** `match.ts`, `swipe.ts`, `ProfileSchema`, `JobCreateSchema`, `isValidJobType`, and several internal constants were left as dead code until a dedicated cleanup session.

**Root cause:** Dead code was noticed but deferred to "later."

**Going forward:** Remove dead code at the moment of discovery. If a grep for consumers returns nothing, delete immediately and typecheck.

### 7. Merge Conflicts from Branch Divergence

**What happened:** 8 merge conflicts in one session (2026-06-05 13:20).

**Root cause:** Local branch diverged from main without syncing.

**Going forward:** `git pull` is the first command of every session.

### 8. New DB Columns Missing from Types

**What happened:** `bulk_swipe_consent` and `consent_granted_at` were in the migration but missing from `database.types.ts` and the `PROFILE_SELECT` constant.

**Root cause:** No checklist for "what to update when adding a column."

**Going forward:** Use the column addition checklist: migration → Row/Insert/Update types (both files) → any select constants.

## What Worked Well

1. **Systematic audit-first approach**: The single full audit commit (c5d3be0d) was highly effective. Running `typecheck + lint` upfront revealed all problems at once.
2. **Parallel agent work**: Used effectively for discovery phases.
3. **Informative commit messages**: Detailed commit bodies explaining the WHY — this was consistently good throughout the sprint.
4. **Methodical packages/shared cleanup**: Verified zero consumers before each deletion. No broken imports.
5. **Supabase typed client**: Eliminating `(supabase as any)` by passing the `Database` generic to `createClient` was the right architectural fix.
6. **typecheck + lint as verification gates**: Consistently running these after changes prevented regressions.

## Structural Recommendations for Next Sprint

1. **Adopt the incremental typecheck habit** — after every file group, not just at commit.
2. **Complete the AvatarPicker refactor** — pop the stash early in the next session.
3. **Set up EAS Build** — the app can't ship without it.
4. **Add E2E tests** — zero E2E coverage is a gap given the complexity of the swipe + match flow.
5. **Validate Agent SDK agents** — code-improver and meta-router are scaffolded but untested.
