# Jordan Architecture Handoff: Saved Jobs / Bookmarks

**Feature:** Saved Jobs — Candidate bookmarking + employer interest signal
**Product Area:** Swipe Deck → Saved Jobs Screen
**Status:** ✅ Architecture ready — sequenced for implementation
**Date:** 2026-06-07
**Author:** Jordan (Technical Architecture + Delivery Strategy)

---

## Table of Contents

1. [Source Handoff Reconciliation](#1-source-handoff-reconciliation)
2. [Database Design](#2-database-design)
3. [TanStack Query Strategy](#3-tanstack-query-strategy)
4. [Hook Contracts](#4-hook-contracts)
5. [Component Tree & Props](#5-component-tree--props)
6. [File Inventory](#6-file-inventory)
7. [Implementation Sequence + Estimates](#7-implementation-sequence--estimates)
8. [Risk Register](#8-risk-register)
9. [Appendix: Migration SQL](#9-appendix-migration-sql)
10. [Appendix: TypeScript Types Update](#10-appendix-typescript-types-update)

---

## 1. Source Handoff Reconciliation

### Key Decisions (from Product + UX)

| Decision | Alex (Product) | Maya (UX) | Jordan (Architecture) | Rationale |
|---|---|---|---|---|
| **Table name** | `saved_jobs` | `bookmarks` | **`bookmarks`** | Shorter, SQL-familiar, matches existing junction-table pattern. `user_id` columns are conventional across codebase. |
| **Icon (UI)** | Star (☆/★) | Bookmark (🔖) | **Bookmark (🔖)** | Maya's UX reasoning: bookmark is universal "save for later," heart is overloaded, star implies importance. UI owns this. |
| **Tab position** | Option A: Replace Settings | Jobs → Saved → Matches → Applied → Profile | **Jobs → Saved → Matches → Applied → Profile** | Both agree. Settings moves into Profile tabs (gear icon + sign-out already accessible there). |
| **Toggle pattern** | Edge Function `toggle-bookmark` | Direct Supabase CRUD | **RPC (recommended) + direct fallback** | Atomic server-side toggle avoids race conditions from rapid tapping. See §2.4. |
| **Swipe-to-remove** | Yes, with undo toast | Yes, with `react-native-gesture-handler` Swipeable | **Swipeable + TanStack optimistic** | Matches existing gesture-handler dependency. Undo calls API reinsert. |
| **Saved job card layout** | Single-column list | Single-column phone, 2-column tablet | **Single-column list MVP, 2-col grid post-MVP** | Single column keeps it simple for MVP. Grid can be swapped in without prop changes. |

### Overruled or Deferred

| Candidate Idea | Decision | Reason |
|---|---|---|
| `notified` column with bookmark default | **Defer** | Not used at MVP. Add later with migration if needed. |
| Save folders / wishlist groups | **Defer** | Seek-style folders over-engineered at this stage. |
| Real-time bookmark count for employers | **Defer** | Page-load query is sufficient for MVP. |
| Offline-first bookmark (persist queue) | **Defer** | Optimistic update with rollback covers 99% of cases. AsyncStorage offline queue is P2. |

---

## 2. Database Design

### 2.1 New Table: `bookmarks`

```sql
create table public.bookmarks (
  id         uuid          primary key default gen_random_uuid(),
  user_id    uuid          not null references public.profiles(id) on delete cascade,
  job_id     uuid          not null references public.jobs(id) on delete cascade,
  created_at timestamptz   not null default now(),

  constraint bookmarks_unique_user_job unique (user_id, job_id)
);
```

**Design notes:**
- Junction table: a bookmark is a statement "user X saved job Y at time T"
- No `updated_at` — bookmark toggle is delete + reinsert. Each creation gets a fresh `created_at`
- `on delete cascade` on both FK references — deleting a job or a profile cleans up bookmarks automatically
- UNIQUE constraint prevents duplicates at the DB level (defence-in-depth alongside client guard)

### 2.2 Indexes

```sql
-- Primary query: "all my bookmarks, newest first" (candidate's saved screen)
create index idx_bookmarks_user_created
  on public.bookmarks (user_id, created_at desc);

-- Secondary query: "how many people saved this job" (employer insight page)
create index idx_bookmarks_job_id
  on public.bookmarks (job_id);
```

**Why these indexes:**
- `(user_id, created_at desc)` covers the ORDER BY without an extra sort step — the B-tree already maintains descending order
- `(job_id)` supports the aggregate COUNT. A covering index isn't needed since we only count rows

### 2.3 Row-Level Security

```sql
alter table public.bookmarks enable row level security;

create policy "bookmarks_select_own"
  on public.bookmarks for select
  using (user_id = auth.uid());

create policy "bookmarks_insert_own"
  on public.bookmarks for insert
  with check (user_id = auth.uid());

create policy "bookmarks_delete_own"
  on public.bookmarks for delete
  using (user_id = auth.uid());
```

**No UPDATE policy** — bookmarks are immutable after insert. Toggle is delete + insert.

**Employer access:** At MVP, employers see only aggregate count (via `get_bookmark_count` RPC). No direct table access. The RPC is created as `security invoker` (default) so it respects the caller's permissions — any authenticated user can call it, but the result is just a number, not who saved it.

### 2.4 RPC: `toggle_bookmark` (recommended)

```sql
create or replace function public.toggle_bookmark(p_job_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_bookmarked boolean;
begin
  if v_user_id is null then
    return json_build_object('error', 'Not authenticated', 'bookmarked', false);
  end if;

  select exists(
    select 1 from public.bookmarks
    where user_id = v_user_id and job_id = p_job_id
  ) into v_bookmarked;

  if v_bookmarked then
    delete from public.bookmarks
    where user_id = v_user_id and job_id = p_job_id;
    return json_build_object('bookmarked', false);
  else
    insert into public.bookmarks (user_id, job_id)
    values (v_user_id, p_job_id);
    return json_build_object('bookmarked', true);
  end if;
end;
$$;
```

**Why RPC over client-side read-then-write:**
1. **Atomicity** — client-side would need: (a) SELECT to check, (b) conditional INSERT/DELETE. Between (a) and (b), another tap could race. RPC is a single operation.
2. **Reduced latency** — one round-trip instead of two.
3. **Debounce is still needed** — RPC doesn't eliminate rapid-tap from the UI. Add 300ms debounce on the `toggle` call (handled in the hook).

**Client call:** `supabase.rpc('toggle_bookmark', { p_job_id: jobId })`

### 2.5 RPC: `get_bookmark_count`

```sql
create or replace function public.get_bookmark_count(p_job_id uuid)
returns integer
language sql
stable
set search_path = public
as $$
  select count(*)::integer
  from public.bookmarks
  where job_id = p_job_id;
$$;
```

**Client call:** `supabase.rpc('get_bookmark_count', { p_job_id: jobId })`

### 2.6 Schema Change to `jobs` Table

**Decision: NO `saved_count` column at MVP.**

The `bookmark_count` is computed via `SELECT count(*) FROM bookmarks WHERE job_id = $1`. For MVP scale (hundreds of bookmarks per job, not millions), a live COUNT is fast and avoids stale data risk.

**Add `saved_count` later if:**
- Query profiling shows COUNT taking >50ms on the employer job insights page
- The employer dashboard page loads more than 50 jobs at once, each needing a count

When added, use a trigger:
```sql
create or replace function public.increment_bookmark_count()
returns trigger language plpgsql as $$
begin
  update public.jobs set saved_count = saved_count + 1 where id = new.job_id;
  return new;
end;
$$;
-- (and a corresponding decrement trigger for delete)
```

---

## 3. TanStack Query Strategy

### 3.1 Cache Key Hierarchy

```
['bookmarks', userId]              → Full saved jobs list (saved screen)
['bookmark-state', jobId, userId]   → Single job check (job detail, swipe card)
['bookmark-count', jobId]           → Aggregate count (employer insight)
```

**Naming convention:** Use `'bookmarks'` prefix (matching the DB table name), not `'saved-jobs'`.

### 3.2 Cache Configuration

| Query | staleTime | gcTime (cacheTime) | refetchOnWindowFocus |
|---|---|---|---|
| `['bookmarks', userId]` | 30s | 5 min | true |
| `['bookmark-state', jobId, userId]` | 60s | 5 min | false |
| `['bookmark-count', jobId]` | 120s | 10 min | false |

**Rationale:**
- Saved list: 30s stale time means pull-to-refresh is the primary refresh mechanism. Background refetch on focus catches stale data without blocking the UI.
- Single job state: 60s stale because this is read from a tiny query (single row check). Optimistic updates handle the instant toggle case.
- Bookmark count: 120s stale — this is an employer insight, not latency-sensitive.

### 3.3 Optimistic Update Strategy

**Toggle (add/remove bookmark):**

```typescript
onMutate: async (jobId) => {
  // Cancel outgoing refetches (so they don't overwrite optimistic state)
  await queryClient.cancelQueries({ queryKey: ['bookmarks', userId] });

  // Snapshot previous state
  const previousBookmarks = queryClient.getQueryData(['bookmarks', userId]);

  // Optimistically update the saved list
  queryClient.setQueryData(['bookmarks', userId], (old: SavedJob[] | undefined) => {
    if (!old) return old;
    const isCurrentlySaved = old.some(b => b.job_id === jobId);
    if (isCurrentlySaved) {
      // Remove from list
      return old.filter(b => b.job_id !== jobId);
    } else {
      // Cannot optimistically ADD because we don't have the full job data.
      // The 'else' case is handled by invalidating after mutation settles.
      return old;
    }
  });

  return { previousBookmarks };
},

onError: (err, jobId, context) => {
  // Rollback to snapshot
  if (context?.previousBookmarks) {
    queryClient.setQueryData(['bookmarks', userId], context.previousBookmarks);
  }
  // Show error toast
},

onSettled: () => {
  // Always refetch to ensure server-client sync
  queryClient.invalidateQueries({ queryKey: ['bookmarks', userId] });
  queryClient.invalidateQueries({ queryKey: ['bookmark-state'] }); // generic prefix
},
```

**Key insight:** For the "add bookmark" optimistic case, we can't add the job to the full list because we don't have the joined job data (title, employer, etc.) at toggle time. So for removal we optimistically update; for addition we rely on the `onSettled` invalidation to populate the list. This is fast enough (<300ms for a single-row insert) that the user won't perceive a delay.

For the `['bookmark-state', jobId, userId]` query, optimistic toggle works perfectly in both directions:

```typescript
onMutate: async (jobId) => {
  await queryClient.cancelQueries({ queryKey: ['bookmark-state', jobId, userId] });
  const previous = queryClient.getQueryData(['bookmark-state', jobId, userId]);
  queryClient.setQueryData(['bookmark-state', jobId, userId], (old) => !old);
  return { previous };
},
```

### 3.4 Query Invalidation Map

| User Action | Invalidate |
|---|---|
| Bookmark a job (RPC success) | `['bookmarks', userId]`, `['bookmark-state', jobId, userId]` |
| Unbookmark a job (RPC success) | `['bookmarks', userId]`, `['bookmark-state', jobId, userId]` |
| Apply from saved list | `['bookmarks', userId]`, `['bookmark-state', jobId, userId]` |
| Pull-to-refresh on saved list | `['bookmarks', userId]` |
| Employer views job detail | `['bookmark-count', jobId]` |

---

## 4. Hook Contracts

### 4.1 `useBookmarks` (Primary Hook)

**File:** `apps/mobile/hooks/useBookmarks.ts`

```typescript
// ─── Types ──────────────────────────────────────────────────────────────────

export interface SavedJob {
  /** Bookmark row ID (not job ID) */
  id: string;
  /** The bookmarked job's ID */
  job_id: string;
  /** When the user saved this job */
  saved_at: string;
  /** Joined job data */
  title: string;
  employer_name: string | null;
  suburb: string;
  pay_display: string;
  pay_amount: number;
  job_type: 'casual' | 'part_time' | 'permanent';
  /** Job status — 'active' | 'hired' | 'expired' | 'paused' */
  status: string;
  hours_text: string;
  /** Employer ID for employer profile link */
  employer_id: string;
}

export interface BookmarkState {
  /** Full list of saved jobs (joined with jobs table) */
  savedJobs: SavedJob[];
  /** Is initial data loading */
  isLoading: boolean;
  /** Error from last fetch */
  error: Error | null;
  /** Is background refetch in progress */
  isRefetching: boolean;
}

export interface BookmarkActions {
  /** Toggle bookmark for a job. Returns the new state (true = saved). */
  toggleBookmark: (jobId: string) => Promise<boolean>;
  /** Remove a specific bookmark (alias for toggle with known state). */
  removeBookmark: (jobId: string) => Promise<void>;
  /** Check if a job is currently bookmarked (O(1) Set lookup). */
  isBookmarked: (jobId: string) => boolean;
  /** Force-refetch the saved jobs list. */
  refresh: () => Promise<void>;
}

export type UseBookmarksReturn = BookmarkState & BookmarkActions;

// ─── Hook signature ────────────────────────────────────────────────────────

export function useBookmarks(): UseBookmarksReturn;
```

**Design decisions:**
- Single hook returns both state and actions (matching existing `useStreak` pattern)
- `isBookmarked` uses a `Set<string>` derived from `savedJobs` — O(1) check
- `toggleBookmark` uses the RPC for atomicity; fallback to direct CRUD if RPC unavailable
- `refresh` wraps `queryClient.invalidateQueries` + `refetch`

### 4.2 `useBookmarkState` (Lightweight Single-Job Hook)

**File:** `apps/mobile/hooks/useBookmarkState.ts`

```typescript
export interface BookmarkStateResult {
  /** Is this job currently bookmarked? */
  isBookmarked: boolean;
  /** Is the initial query loading? */
  isLoading: boolean;
  /** Toggle bookmark for this specific job */
  toggle: () => Promise<void>;
}

export function useBookmarkState(jobId: string | undefined): BookmarkStateResult;
```

**Design decisions:**
- Uses `['bookmark-state', jobId, userId]` query key
- For the quick single-row check, queries: `supabase.from('bookmarks').select('id').eq('user_id', userId).eq('job_id', jobId).maybeSingle()`
- Optimistic toggle: flips `isBookmarked` immediately, rolls back on error
- Used on `JobCard` and job detail screen where only one job's state matters
- Falls back to `useBookmarks()` context if parent already has the data (avoids duplicate fetch)

### 4.3 `useBookmarkCount` (Employer Hook)

**File:** `apps/mobile/hooks/useBookmarkCount.ts`

```typescript
export interface BookmarkCountResult {
  count: number;
  isLoading: boolean;
}

export function useBookmarkCount(jobId: string | undefined): BookmarkCountResult;
```

**Design decisions:**
- Caches for 2 minutes (employer insights are not real-time)
- Calls `supabase.rpc('get_bookmark_count', { p_job_id: jobId })`
- Returns 0 if jobId is undefined

---

## 5. Component Tree & Props

### 5.1 Component Hierarchy

```
app/(candidate)/(tabs)/
├── _layout.tsx                    # Tab layout — deck → saved → matches → applied → profile
├── saved.tsx                      ★ NEW — full saved jobs screen
│   ├── SavedSearchBar             # Search input + clear button
│   ├── FilterChips                # Horizontal scrollable job type chips
│   ├── FlatList<SavedJobCard>     # Pull-to-refresh, swipe-to-remove
│   │   ├── Swipeable              # react-native-gesture-handler Swipeable
│   │   │   └── SavedJobCard       # Card with job info
│   │   └── (right actions)        # "Remove" button (revealed on swipe)
│   ├── UndoToast                  # Bottom toast with Undo action
│   ├── SavedJobsSkeleton          # 4-card shimmer skeleton (loading)
│   └── SavedJobsEmptyState        # Empty state with CTA to browse

components/bookmark/
├── BookmarkButton.tsx             # Tappable bookmark icon with spring animation
├── SavedJobCard.tsx               # Individual saved job card
├── SavedJobsSkeleton.tsx          # Loading shimmer skeleton
├── SavedJobsError.tsx             # Error state with retry
├── SavedJobTypeBadge.tsx          # Job type pill (casual / part-time / perm)

components/deck/
├── JobCard.tsx                    # ★ MODIFIED — add BookmarkButton in content area
├── SwipeCard.tsx                  # ★ MODIFIED — pass bookmark state props if needed

app/(candidate)/job/[id].tsx       # ★ MODIFIED — add BookmarkButton to header actions

components/screens/
├── ProfileScreen.tsx              # ★ MODIFIED — add "Saved Jobs" shortcut row
```

### 5.2 `BookmarkButton` Props

```typescript
interface BookmarkButtonProps {
  jobId: string;
  /** Current bookmark state (filled vs outline) */
  isBookmarked: boolean;
  /** Called when user taps. Parent handles API call + optimistic update. */
  onToggle: (jobId: string) => Promise<void> | void;
  /** Size preset */
  size?: 'sm' | 'md' | 'lg';      // Default: 'md'
  /** Visual variant */
  variant?: 'card' | 'header';     // Default: 'card'
  /** Disable interaction (during loading) */
  disabled?: boolean;
}
```

**States:**
| State | Visual | Behaviour |
|---|---|---|
| Idle (unsaved) | Outline bookmark icon | Tappable. On press → spring scale → toggle → filled |
| Idle (saved) | Filled accent bookmark icon | Tappable. On press → spring scale → toggle → outline |
| Loading | Disabled, 0.5 opacity | Mutation in flight. Block taps. |
| Error | Return to previous state | Rollback via TanStack `onError`. Error toast shown by parent. |

### 5.3 `SavedJobCard` Props

```typescript
interface SavedJobCardProps {
  job: SavedJob;
  onPress: (jobId: string) => void;
  onRemove: (jobId: string) => void;
}
```

**Layout (phone — single column):**
```
┌─────────────────────────────────────────────┐
│ [64×64]  Job Title                     🔖   │
│  rounded  Employer Name                     │
│  photo    Suburb                            │
│           $32/hr  [CASUAL]                  │
└─────────────────────────────────────────────┘
```

- Photo area: 64×64 rounded square, `colors.photoBase` background, job emoji fallback
- Bookmark icon visible (redundant but shows state clearly)
- Swipe left reveals "Remove" action button
- Touch area opens job detail

### 5.4 `SavedSearchBar` Props

```typescript
interface SavedSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;             // Default: "Search saved jobs..."
}
```

- 300ms debounce before filtering the local list
- Clear button (✕) when text is non-empty
- Filters client-side by title, employer_name, and suburb

### 5.5 `SavedJobsSkeleton` Props

```typescript
// No props — self-contained
export function SavedJobsSkeleton(): React.ReactElement;
```

- 4 shimmer cards using Reanimated pulse animation (opacity 0.3 ↔ 0.7)
- Matches actual card layout (photo + 3 text lines)
- Accessible as `progressbar` with `accessibilityLabel="Loading saved jobs"`

### 5.6 `SavedJobsError` Props

```typescript
interface SavedJobsErrorProps {
  onRetry: () => void;
  /** If cached data exists and is stale, show warning banner instead of blocking */
  hasCachedData?: boolean;
}
```

- Full-screen error state with emoji ⚠️
- "Try again" button calls `onRetry`
- If `hasCachedData` is true, renders a yellow warning banner above the cached list instead of replacing it

### 5.7 `UndoToast` Props

```typescript
interface UndoToastProps {
  visible: boolean;
  onUndo: () => void;
  onDismiss: () => void;
  /** Message text. Default: "Removed from saved" */
  message?: string;
}
```

- Slides up from bottom (above tab bar) with spring animation
- Shows message + "Undo" button in accent color
- Auto-dismisses after 4 seconds
- "Undo" re-inserts the bookmark via API + restores card in list

### 5.8 `FilterChip` Props

```typescript
interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}
```

Filters: `All | Casual | Part-time | Perm`

---

## 6. File Inventory

### 6.1 New Files

| # | File Path | Est. Size | Purpose |
|---|---|---|---|
| 1 | `supabase/migrations/202606070004_bookmarks.sql` | ~150 lines | Migration: table + indexes + RLS + RPCs |
| 2 | `apps/mobile/hooks/useBookmarks.ts` | ~180 lines | Primary hook: fetch, toggle, Set lookup |
| 3 | `apps/mobile/hooks/useBookmarkState.ts` | ~60 lines | Lightweight single-job bookmark check |
| 4 | `apps/mobile/hooks/useBookmarkCount.ts` | ~40 lines | Employer aggregate count hook |
| 5 | `apps/mobile/components/bookmark/BookmarkButton.tsx` | ~120 lines | Animated bookmark toggle |
| 6 | `apps/mobile/components/bookmark/SavedJobCard.tsx` | ~80 lines | Saved job card component |
| 7 | `apps/mobile/components/bookmark/SavedJobsSkeleton.tsx` | ~100 lines | Loading skeleton (4 shimmer cards) |
| 8 | `apps/mobile/components/bookmark/SavedJobsError.tsx` | ~40 lines | Error state with retry |
| 9 | `apps/mobile/components/bookmark/SavedJobTypeBadge.tsx` | ~30 lines | Job type pill chip |
| 10 | `apps/mobile/app/(candidate)/(tabs)/saved.tsx` | ~250 lines | Full saved jobs screen |

### 6.2 Modified Files

| # | File Path | Change |
|---|---|---|
| 11 | `apps/mobile/app/(candidate)/(tabs)/_layout.tsx` | Add `saved` tab; remove `settings` tab |
| 12 | `apps/mobile/components/deck/JobCard.tsx` | Add `BookmarkButton` absolute-positioned in content section |
| 13 | `apps/mobile/app/(candidate)/job/[id].tsx` | Add `BookmarkButton` to `ScreenHeader` `actions` slot |
| 14 | `apps/mobile/components/screens/ProfileScreen.tsx` | Add "Saved Jobs" `ActionButton` row |
| 15 | `apps/mobile/lib/database.types.ts` | Add `bookmarks` table type + `toggle_bookmark` function type |
| 16 | `packages/shared/src/types/database.ts` | Add `bookmarks` table type to shared package |

### 6.3 Removed from Tab Nav

| # | File Path | Action |
|---|---|---|
| 17 | `apps/mobile/app/(candidate)/(tabs)/settings.tsx` | Remove from tab navigator (keep file for deep-link access if needed) |

### 6.4 Optional / Future

| # | File Path | When |
|---|---|---|
| 18 | `apps/mobile/hooks/__tests__/useBookmarks.test.ts` | Phase 5 — unit tests |
| 19 | `apps/mobile/components/bookmark/__tests__/BookmarkButton.test.tsx` | Phase 5 — component tests |

---

## 7. Implementation Sequence + Estimates

### Phase 1: Foundation (2h)

| Step | Description | Files | Est. Time |
|---|---|---|---|
| 1.1 | Run migration SQL on Supabase | `202606070004_bookmarks.sql` | 15 min |
| 1.2 | Update type definitions (local + shared) | `database.types.ts` (×2) | 20 min |
| 1.3 | Write `useBookmarks` hook + `useBookmarkState` | `hooks/useBookmarks.ts`, `hooks/useBookmarkState.ts` | 1h |
| 1.4 | Write `useBookmarkCount` hook | `hooks/useBookmarkCount.ts` | 15 min |

**Verification gate:** `useBookmarks` correctly fetches saved jobs, `toggleBookmark` RPC works via `supabase.rpc`, `isBookmarked` returns correct state.

### Phase 2: BookmarkButton + Card Integration (1.5h)

| Step | Description | Files | Est. Time |
|---|---|---|---|
| 2.1 | Build `BookmarkButton` with spring animation + haptics | `components/bookmark/BookmarkButton.tsx` | 45 min |
| 2.2 | Build `SavedJobTypeBadge` | `components/bookmark/SavedJobTypeBadge.tsx` | 15 min |
| 2.3 | Integrate `BookmarkButton` into `JobCard.tsx` content area | `JobCard.tsx` | 30 min |

**Critical check:** BookmarkButton tap does NOT interfere with SwipeCard's Pan gesture. See Risk #5.

### Phase 3: Saved Screen (3h)

| Step | Description | Files | Est. Time |
|---|---|---|---|
| 3.1 | Build `SavedJobCard` component | `components/bookmark/SavedJobCard.tsx` | 30 min |
| 3.2 | Build `SavedJobsSkeleton` + `SavedJobsError` | `components/bookmark/` | 30 min |
| 3.3 | Build `saved.tsx` screen — FlatList, search, filter chips, pull-to-refresh | `app/(candidate)/(tabs)/saved.tsx` | 1h |
| 3.4 | Implement swipe-to-remove with `Swipeable` + `UndoToast` | `saved.tsx` (inline) | 1h |

**Verification gate:** Saved screen loads, shows skeleton → populated list, swipe removes + shows undo, search/filter works.

### Phase 4: Navigation & Integration (1h)

| Step | Description | Files | Est. Time |
|---|---|---|---|
| 4.1 | Update tab layout — add saved, remove settings | `_layout.tsx` | 15 min |
| 4.2 | Add `BookmarkButton` to job detail header | `job/[id].tsx` | 20 min |
| 4.3 | Add "Saved Jobs" row to profile | `ProfileScreen.tsx` | 10 min |
| 4.4 | Test navigation flow: deck→saved, saved→detail, profile→saved | — | 15 min |

**Verification gate:** 5-tab layout renders correctly, bookmark state syncs across all surfaces, profile links to saved.

### Phase 5: Polish & Tests (1.5h)

| Step | Description | Est. Time |
|---|---|---|
| 5.1 | Write `useBookmarks` unit tests (mock RPC + Supabase) | 30 min |
| 5.2 | Write `BookmarkButton` component test (snapshot + interaction) | 20 min |
| 5.3 | Test swipe gesture compatibility on physical device | 15 min |
| 5.4 | Test all 5 themes + light mode | 10 min |
| 5.5 | Screen reader audit (VoiceOver / TalkBack) | 15 min |
| 5.6 | Edge case: expired job in saved list, rapid toggle, empty search results | 10 min |

**Total estimate:** ~9 hours (spans ~2 sprints with review).

---

## 8. Risk Register

| # | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| 1 | **Rapid bookmark toggle races** | UI shows wrong state | Medium | 300ms debounce in hook + atomic RPC. TanStack optimistic rollback. |
| 2 | **BookmarkButton interferes with swipe gesture** | Cards not swipeable | Medium | `stopPropagation()` on Pressable + `e.stopPropagation`. Test on physical device. If persists, wrap in `Gesture.Native()` with `simultaneousWithExternalGesture`. |
| 3 | **Large saved list causes slow rendering** | 60fps drop on scroll | Low (MVP) | FlatList with `getItemLayout` + `windowSize={5}`. Virtualization handles this. |
| 4 | **Employer bookmark count query is slow** | Employer page load >2s | Low (MVP) | COUNT query on indexed column is sub-millisecond at MVP scale. Monitor and add denormalised column if needed. |
| 5 | **Tab bar overflow on small phones** | Some tabs hidden | Low | 5 tabs is the standard max. iPhone SE fits 5 tabs. Falls back to "More" tab on Android if needed. |
| 6 | **Settings content lost when tab removed** | Users can't find theme/sign-out | Medium | Move ThemePicker and sign-out to Profile tab BEFORE removing Settings tab. Verify both are accessible. |
| 7 | **Undo toast dismisses before user reads it** | User can't undo removal | Medium | 4s auto-dismiss. Toast is interactive (tap keeps it). Add subtle animation entrance to draw attention. |
| 8 | **RLS policy misconfig exposes other users' bookmarks** | Data leak | Low | RLS policies tested in migration verification block. Add integration test that queries as user A and expects 0 rows for user B. |

---

## 9. Appendix: Migration SQL

The full migration file has been written to:

**`/home/admin/swipe-job-search/supabase/migrations/202606070004_bookmarks.sql`**

Contents:
- `bookmarks` table with FK references to `profiles(id)` and `jobs(id)`
- UNIQUE constraint on `(user_id, job_id)`
- Indexes: `idx_bookmarks_user_created`, `idx_bookmarks_job_id`
- RLS: SELECT/INSERT/DELETE policies for own bookmarks
- RPC: `toggle_bookmark(p_job_id)` — returns `{ bookmarked: boolean }`
- RPC: `get_bookmark_count(p_job_id)` — returns integer
- Verification block (table exists, RLS enabled, indexes exist)

### Quick Reference

```sql
-- Run migration
-- cd supabase && npx supabase migration up

-- Or apply directly
-- psql "$SUPABASE_DB_URL" -f supabase/migrations/202606070004_bookmarks.sql

-- Toggle a bookmark (client-side)
const { data, error } = await supabase.rpc('toggle_bookmark', {
  p_job_id: 'some-job-uuid',
});
// data.bookmarked === true | false

-- Get bookmark count (employer page)
const { data: count } = await supabase.rpc('get_bookmark_count', {
  p_job_id: 'some-job-uuid',
});

-- Direct query (fallback if RPC unavailable)
const { data } = await supabase
  .from('bookmarks')
  .select('id')
  .eq('user_id', userId)
  .eq('job_id', jobId)
  .maybeSingle();
const isBookmarked = data !== null;
```

---

## 10. Appendix: TypeScript Types Update

### 10.1 Local Types (`apps/mobile/lib/database.types.ts`)

Add to `Tables`:

```typescript
bookmarks: {
  Row: {
    id: string;
    user_id: string;
    job_id: string;
    created_at: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    job_id: string;
    created_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    job_id?: string;
    created_at?: string;
  };
  Relationships: [
    {
      type: 'foreignKey';
      columns: ['user_id'];
      referencedRelation: 'profiles';
      referencedColumns: ['id'];
    },
    {
      type: 'foreignKey';
      columns: ['job_id'];
      referencedRelation: 'jobs';
      referencedColumns: ['id'];
    },
  ];
};
```

Add to `Functions`:

```typescript
toggle_bookmark: {
  Args: { p_job_id: string };
  Returns: { bookmarked: boolean; error?: string };
};
get_bookmark_count: {
  Args: { p_job_id: string };
  Returns: number;
};
```

### 10.2 Shared Types (`packages/shared/src/types/database.ts`)

Add the same `bookmarks` table entry to the `Tables` object.

---

## Appendix B: Key Integration Patterns

### Deck Page — Fetching Bookmark IDs for Overlay

The swipe deck needs to know which jobs are already bookmarked to show the filled icon. The efficient approach:

```typescript
// In useJobDeck hook (or deck screen):
const { data: bookmarkIds } = useQuery({
  queryKey: ['bookmark-ids', userId],
  queryFn: async () => {
    const { data } = await supabase
      .from('bookmarks')
      .select('job_id')
      .eq('user_id', userId);
    return new Set((data ?? []).map(b => b.job_id));
  },
  staleTime: 30_000,
});

// Pass bookmarkIds Set to each JobCard via props
// Lookup: bookmarkIds.has(job.id) — O(1)
```

This fetches only `job_id` (no JOIN) — minimal payload. For consistency, `useJobDeck` can pass `isBookmarked: (jobId: string) => boolean` down to `JobCard`.

### Applying from Saved — Auto-Cleanup

When a user applies to a job from the saved list (AC-08), the bookmark should be removed:

```typescript
// In saved.tsx, after successful apply:
await supabase.from('bookmarks').delete().eq('user_id', userId).eq('job_id', jobId);
queryClient.invalidateQueries({ queryKey: ['bookmarks', userId] });
```

The existing apply flow in `useCreateMatch.ts` or `performSwipe` with `direction: 'applied'` can be extended to also delete the bookmark row. Add this as a follow-up mutation.

---

*End of Handoff — Jordan. Questions → route to Jordan for clarification.*
