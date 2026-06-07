# Sam Handoff: Saved Jobs / Bookmarks — QA, Analytics & Release Readiness

**Author:** Sam (QA + Release + Analytics + Growth Operations)
**Date:** 2026-06-07
**Target:** Hi-Hired — Expo/React Native mobile app + Supabase backend
**Feature:** Saved Jobs (Bookmarks) — Candidate bookmarking + employer interest signal

**Related docs:**
- [Product Handoff](bookmarks-alex-handoff.md)
- [UX Handoff](bookmarks-maya-handoff.md)
- [Architecture Handoff](bookmarks-jordan-handoff.md)
- [Migration](file:///home/admin/swipe-job-search/supabase/migrations/202606070004_bookmarks.sql)

---

## Table of Contents

1. [QA Test Plan](#1-qa-test-plan)
   - [Functional Tests](#11-functional-tests)
   - [Edge Cases](#12-edge-cases)
   - [Integration Tests](#13-integration-tests)
   - [Regression Tests](#14-regression-tests)
   - [Automated Test Plan (Vitest)](#15-automated-test-plan)
   - [Accessibility Tests](#16-accessibility-tests)
   - [Performance Tests](#17-performance-tests)
   - [Security Tests](#18-security-tests)
2. [Analytics Event Schemas](#2-analytics-event-schemas)
3. [Success Criteria Checklist](#3-success-criteria-checklist)
4. [Release Notes Draft](#4-release-notes-draft)

---

## 1. QA Test Plan

### 1.1 Functional Tests

#### 1.1.1 Bookmark Button — Swipe Card (AC-01)

| ID | Scenario | Prerequisites | Steps | Expected Result | Priority | Type |
|----|----------|---------------|-------|-----------------|----------|------|
| BKMK-FUNC-001 | Bookmark button visible on SwipeCard | Auth as candidate, deck loaded with jobs | 1. Open deck<br>2. Observe top card | Bookmark icon visible in top-right of content area (absolute positioned, z-index: 10). Default state = outline (unfilled). Touch target ≥ 44×44pt. | P0 | Manual + Automated |
| BKMK-FUNC-002 | Tap bookmark fills icon | Candidate, deck with ≥1 job | 1. Tap bookmark icon on top card | Icon animates from outline to filled: spring scale (1→1.2) then back to 1 over ~300ms. Haptic (Light) fires. `isBookmarked` returns true immediately (optimistic). | P0 | Manual + Automated |
| BKMK-FUNC-003 | Tap bookmark toggles to unfilled | Candidate, job currently bookmarked | 1. Open deck on a bookmarked job (filled icon visible)<br>2. Tap bookmark | Icon animates from filled to outline. Haptic fires. `isBookmarked` returns false. | P0 | Manual + Automated |
| BKMK-FUNC-004 | Bookmark persists after app restart (AC-04) | Candidate with ≥1 bookmark | 1. Bookmark a job<br>2. Force-close app<br>3. Reopen app<br>4. Navigate to deck card for that job | Bookmark icon appears filled. Bookmark state loaded from Supabase (`bookmark-state` query). | P0 | Manual |
| BKMK-FUNC-005 | Bookmark icon shows on all stacked cards | Deck with 3 visible cards | 1. Open deck<br>2. Observe cards behind top card | Bookmark icon visible on all stacked cards. Only top card's icon is interactive. | P1 | Manual |
| BKMK-FUNC-006 | Bookmark from card does not trigger swipe (critical — AC-01) | Deck card loaded | 1. Tap bookmark<br>2. Observe card position | Card does NOT swipe, does NOT animate off-screen. Only bookmark icon changes. Swipe gesture must be unaffected. | P0 | Manual (device test) |

#### 1.1.2 Bookmark Button — Job Detail Screen (AC-02)

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| BKMK-FUNC-010 | Bookmark button on job detail header | 1. Navigate to job detail (from deck, saved list, or deep link)<br>2. Observe header | Bookmark icon visible in `ScreenHeader` `actions` slot (right-side, next to Expired badge if present). Size: `md` (28×28 icon, 48×48 touch target). | P0 |
| BKMK-FUNC-011 | Toggle bookmark from detail screen | 1. Job detail loaded<br>2. Tap bookmark icon | Optimistic toggle. Icon animates fill/unfill. Haptic fires. State synced with deck card for same job. | P0 |
| BKMK-FUNC-012 | Bookmark state synced between deck and detail (AC-07) | 1. Bookmark job from deck (icon fills)<br>2. Navigate to that job's detail screen | Bookmark icon in header already shows filled state. Unbookmark from detail → deck card shows unfilled on return. Single source of truth via TanStack Query cache. | P0 |
| BKMK-FUNC-013 | Bookmark state synced between detail and saved list | 1. Job bookmarked, visible in saved list<br>2. Open job detail, unbookmark<br>3. Go back to saved list | Job removed from saved list immediately (optimistic) or after invalidation (<300ms). | P0 |

#### 1.1.3 Saved Jobs Screen — List Display (AC-03)

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| BKMK-FUNC-020 | Saved screen shows bookmarked jobs | Candidate with ≥1 bookmark | 1. Navigate to Saved tab (🔖)<br>2. Observe list | FlatList renders all bookmarked jobs. Sorted by `saved_at` descending (newest first). Each card shows: title, employer name, suburb, pay rate, job type badge. | P0 |
| BKMK-FUNC-021 | Saved screen uses single-column list on phone | Phone device (<640px) | 1. Open saved screen | Single-column list layout. Cards full-width with padding. | P0 |
| BKMK-FUNC-022 | Saved screen uses 2-column grid on tablet | Tablet device (≥640px) | 1. Open saved screen | Two-column grid layout using `FlatList numColumns={2}` with `columnWrapperStyle={{ gap: 12 }}`. | P1 |
| BKMK-FUNC-023 | Tap saved job opens job detail | Saved screen with jobs | 1. Tap a saved job card | `router.push(`/job/${job.id}`)` navigates to job detail screen. Standard back navigation returns to saved list. | P0 |
| BKMK-FUNC-024 | Pull-to-refresh on saved list (AC-10) | Saved screen | 1. Pull down on list | `isRefetching` = true. Spinner visible. List refreshes. Data fetched from Supabase server. | P0 |

#### 1.1.4 Saved Jobs — Swipe-to-Remove

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| BKMK-FUNC-030 | Swipe left reveals remove action | Saved screen with ≥1 job | 1. Swipe a saved job card left | Card animates to reveal right action area. "Remove" button visible (red background, trash icon). Uses `react-native-gesture-handler` `Swipeable`. | P0 |
| BKMK-FUNC-031 | Swipe-to-remove removes bookmark | Saved screen | 1. Swipe left on a card to threshold<br>2. Release | Card animates off-screen (spring, 200ms). Item removed from list optimistically. API call to delete bookmark. Undo toast appears. | P0 |
| BKMK-FUNC-032 | Swipe-to-remove does NOT remove on partial swipe | Saved screen | 1. Partially swipe left but release before threshold | Card snaps back to position. No removal. No API call. No toast. | P0 |

#### 1.1.5 Undo Toast

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| BKMK-FUNC-040 | Undo toast appears after removal | After swipe-to-remove | 1. Remove a saved job via swipe | Toast slides up from bottom (above tab bar): "Removed from saved" + [Undo] button in accent color. Spring animation (damping: 15, stiffness: 150). | P0 |
| BKMK-FUNC-041 | Undo toast auto-dismisses after 4s | Toast visible | 1. Wait 4 seconds | Toast animates down. Card stays removed. API deletion is permanent. | P0 |
| BKMK-FUNC-042 | Tap Undo restores bookmark | Toast visible | 1. Tap [Undo] | Toast dismissed. Card slides back into list. API call re-inserts bookmark. TanStack Query invalidated. | P0 |
| BKMK-FUNC-043 | Undo works only once (subsequent taps ignored) | Undo triggered | 1. Tap Undo once<br>2. Tap Undo again while API in flight | Second tap ignored (debounced). No duplicate API call. | P1 |
| BKMK-FUNC-044 | Tap toast area itself keeps it visible (interactive) | Toast visible | 1. Tap toast body (not Undo) | Toast remains visible. Does not auto-dismiss timer. Timer resets? (Design decision needed — current: timer independent.) | P2 |

#### 1.1.6 Unbookmark from Swipe Card on Deck

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| BKMK-FUNC-050 | Unbookmark from deck card | Deck with bookmarked job visible | 1. Tap filled bookmark icon on top card | Icon toggles to unfilled. Bookmark removed from DB. Saved list updated (invalidation). Undo toast does NOT appear from deck (only from saved screen). | P0 |
| BKMK-FUNC-051 | Re-bookmark from deck after unbookmark | Deck, job was just un-bookmarked | 1. Tap unfilled bookmark icon again | Icon fills. Bookmark re-created. No error. | P0 |

#### 1.1.7 Search Within Saved Jobs

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| BKMK-FUNC-060 | Search bar visible on saved screen | Saved screen | 1. Observe header area | Search bar shown below header, above filter chips. Magnifying glass emoji (🔍) + placeholder: "Search saved jobs…" Clear button (✕) not visible initially. | P0 |
| BKMK-FUNC-061 | Search filters by title | Saved screen with ≥2 jobs with different titles | 1. Type a partial title match | List filtered to only jobs whose title contains the search text. Case-insensitive. Debounced at 300ms. | P0 |
| BKMK-FUNC-062 | Search filters by employer name | Saved screen | 1. Type employer name | Jobs matching employer name shown. | P0 |
| BKMK-FUNC-063 | Search filters by suburb | Saved screen | 1. Type suburb name | Jobs matching suburb shown. | P0 |
| BKMK-FUNC-064 | Search with no matches shows message | Saved screen | 1. Type text matching zero jobs | Shows "No saved jobs match" text. "Clear filters" secondary action (or clear search via ✕). | P0 |
| BKMK-FUNC-065 | Clear search restores full list | Search with results filtered | 1. Tap ✕ clear button | Search text empty. Full list restored. | P0 |
| BKMK-FUNC-066 | Search debounce is functional | Saved screen | 1. Type rapidly "b a r i s t a" in <1s | Only one filter operation after 300ms pause. Do NOT fire filter on every keystroke. | P0 |

#### 1.1.8 Filter Chips

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| BKMK-FUNC-070 | Filter chips render horizontally | Saved screen with jobs | 1. Observe below search bar | Horizontal scrollable chip row: All (default active) | Casual | Part-time | Perm. Active chip: filled accent background. Inactive: outline. | P0 |
| BKMK-FUNC-071 | "Casual" filter shows only casual jobs | Saved screen with mixed job types | 1. Tap "Casual" chip | Only jobs with `job_type = 'casual'` shown. Active chip highlighted. | P0 |
| BKMK-FUNC-072 | "Part-time" filter shows only part-time | Saved screen | 1. Tap "Part-time" | Jobs with `job_type = 'part_time'` shown. | P0 |
| BKMK-FUNC-073 | "Perm" filter shows only permanent | Saved screen | 1. Tap "Perm" | Jobs with `job_type = 'permanent'` shown. | P0 |
| BKMK-FUNC-074 | "All" shows full list | Filter applied | 1. Tap "All" | All bookmarked jobs shown (respecting search text if any). | P0 |
| BKMK-FUNC-075 | Filter + search work together | Saved screen | 1. Type search text<br>2. Apply filter | Results satisfy BOTH conditions (intersection, not union). | P0 |
| BKMK-FUNC-076 | Filter with no matches shows message | Saved screen | 1. Apply filter with no matching jobs | Empty state message: "No saved jobs match" with option to clear filter. | P0 |
| BKMK-FUNC-077 | Results count shows correct number | Saved screen, filtered or searched | 1. Observe text: "{n} jobs saved" | Count reflects filtered (not total) results when filter/search active. | P1 |

#### 1.1.9 Empty State (AC-06)

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| BKMK-FUNC-080 | Empty state for new user | New candidate, zero bookmarks | 1. Navigate to Saved tab | Shows: 📑 emoji (48px), "No saved jobs yet" heading, description: "Jobs you bookmark will appear here. Start browsing to save roles you're interested in." CTA: "Browse jobs" button. | P0 |
| BKMK-FUNC-081 | "Browse jobs" CTA navigates to deck | Empty state visible | 1. Tap "Browse jobs" | Navigates to deck tab `/(candidate)/(tabs)/deck`. | P0 |
| BKMK-FUNC-082 | Empty state disappears after first bookmark | 0 bookmarks → 1 bookmark | 1. Bookmark a job from deck<br>2. Navigate to Saved tab | Empty state replaced by card list with ≥1 item. | P0 |
| BKMK-FUNC-083 | Zero results from search shows distinct empty state | Search with no matches | 1. Search for non-existent job | Shows "No saved jobs match" (different from the full empty state). Clear search action available. | P0 |

#### 1.1.10 Loading Skeleton

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| BKMK-FUNC-090 | Loading skeleton on first load | Cold start, slow network | 1. Navigate to Saved tab<br>2. Observe initial render | 4-card shimmer skeleton visible. Reanimated pulse animation (opacity 0.3↔0.7, 1000ms cycle). Accessibility: `role="progressbar"`, `accessibilityLabel="Loading saved jobs"`. | P0 |
| BKMK-FUNC-091 | Skeleton shows header shimmer | Loading state | 1. Observe skeleton | Screen header skeleton (title + subtitle). Search bar skeleton. 4 card skeletons with 64×64 rounded square + text line placeholders. | P0 |
| BKMK-FUNC-092 | Skeleton transitions to content or error | After load | 1. Wait for query to resolve | Skeleton fades out (or replaced). Content or error state appears. No flash of empty state between skeleton and data. | P0 |

#### 1.1.11 Error State

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| BKMK-FUNC-100 | Full error state on fetch failure | Network disconnected, cold start | 1. Open Saved tab | ⚠️ emoji, "Couldn't load saved jobs" title, description with retry instruction, "Try again" button. | P0 |
| BKMK-FUNC-101 | Retry button re-fetches | Error state | 1. Tap "Try again" | Query re-fetches. If successful → content shown. If fails → stays on error state. | P0 |
| BKMK-FUNC-102 | Stale data graceful degradation | Network failure but cached data exists | 1. Previously loaded saved jobs<br>2. Go offline<br>3. Navigate to Saved tab | Shows cached data (from TanStack gcTime) with yellow warning banner: "⚠️ Couldn't refresh — showing saved jobs from earlier. Pull down to retry." Does NOT block with full error state. | P0 |

#### 1.1.12 Employer Bookmark Count (AC-09 — SAVE-09)

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| BKMK-FUNC-110 | Employer sees bookmark count on job detail | Auth as employer, job has ≥1 bookmark | 1. View own job detail/insights | Shows "⭐ 23 saved by candidates" metric alongside "Applied" count. Clearly labelled as "Saved" (not "Applied"). | P0 |
| BKMK-FUNC-111 | Zero state shows "0 saved" | Job with zero bookmarks | 1. Employer views job detail | Shows "0 saved" — metric is visible, not hidden. | P0 |
| BKMK-FUNC-112 | Employer cannot see individual savers (AC-09) | Employer viewing saved count | 1. Attempt to query `bookmarks` table directly (via API) | RLS policy blocks SELECT for non-owners. Function `get_bookmark_count` only returns total, not user IDs. | P0 |

#### 1.1.13 Tab Navigation

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| BKMK-FUNC-120 | Saved tab exists in bottom nav | Any candidate screen | 1. Observe bottom tab bar | 5 tabs: Jobs (💼) | Saved (🔖) | Matches (💬) | Applied (📋) | Profile (👤). "Saved" tab is second position. | P0 |
| BKMK-FUNC-121 | Settings tab removed | Any candidate screen | 1. Observe bottom tab bar | Settings tab (⚙️) is NOT present in tab bar. Gear icon accessible from Profile screen. | P0 |
| BKMK-FUNC-122 | Tab switch to saved preserves scroll state | Tab switch cycle | 1. Scroll saved list<br>2. Switch to deck tab<br>3. Switch back to saved | Scroll position preserved (Expo Router default lazy loading). | P1 |
| BKMK-FUNC-123 | Profile screen has "Saved jobs" shortcut | Profile screen | 1. Navigate to Profile tab<br>2. Observe actions | "Saved jobs" row with 🔖 emoji visible in actions section. Tapping navigates to saved tab. | P0 |

#### 1.1.14 Apply from Saved List (AC-08 — SAVE-05)

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| BKMK-FUNC-130 | Apply from saved list proceeds normally | Saved screen with bookmarked job | 1. Tap job card → detail<br>2. Apply (swipe right or tap apply) | Standard application flow. Match created. | P0 |
| BKMK-FUNC-131 | Bookmark auto-removed after successful apply (AC-08) | Apply from saved list | 1. Apply to a bookmarked job<br>2. Check bookmark state | Bookmark row deleted. Job no longer in saved list. Bookmark icon on deck card shows unfilled. | P0 |
| BKMK-FUNC-132 | Apply failure does NOT remove bookmark | Failed apply | 1. Apply to job where API<br>call fails (simulate network error) | Bookmark preserved. Job remains in saved list. Error toast about application failure, not bookmark failure. | P0 |

#### 1.1.15 RPC: `toggle_bookmark`

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| BKMK-FUNC-140 | RPC toggles bookmark on → off | Job currently bookmarked | 1. Call `supabase.rpc('toggle_bookmark', { p_job_id })` | Returns `{ bookmarked: false }`. Row deleted from `bookmarks`. | P0 |
| BKMK-FUNC-141 | RPC toggles bookmark off → on | Job not bookmarked | 1. Call RPC | Returns `{ bookmarked: true }`. Row inserted. | P0 |
| BKMK-FUNC-142 | RPC returns error for unauthenticated | No auth session | 1. Call RPC without auth | Returns `{ error: 'Not authenticated', bookmarked: false }`. No mutation. | P0 |
| BKMK-FUNC-143 | RPC is idempotent (multiple calls same state) | Job bookmarked | 1. Call RPC for bookmarked job → off<br>2. Call RPC again | First call: off. Second call: on. Toggle is deterministic. | P0 |

#### 1.1.16 RPC: `get_bookmark_count`

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| BKMK-FUNC-150 | Count returns correct number | Job with 5 bookmarks | 1. Call `get_bookmark_count({ p_job_id })` | Returns 5. | P0 |
| BKMK-FUNC-151 | Count returns 0 for unbookmarked job | Job with 0 bookmarks | 1. Call | Returns 0. | P0 |
| BKMK-FUNC-152 | Count works for any authenticated user | Any auth'd user | 1. Call RPC | Returns count. No RLS restriction on this RPC (returns only integer). | P0 |

### 1.2 Edge Cases

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| BKMK-EDGE-001 | Bookmark an expired job | Job with `status = 'expired'` still in deck | 1. Tap bookmark on expired job | Bookmark created. In saved list, card shows muted style + "This job has been filled" (or expired badge). Not removed — user may want to see what they missed. | P0 |
| BKMK-EDGE-002 | Bookmark a deleted job (race) | Job deleted by employer between card render and bookmark tap | 1. Bookmark a job that's deleted server-side | RPC's FK constraint (`on delete cascade` on `job_id`) prevents inserting orphan. RPC returns error. UI rolls back. Error toast: "Could not save — this job is no longer available." | P0 |
| BKMK-EDGE-003 | Rapid bookmark/unbookmark tapping | Deck card with bookmark icon | 1. Tap bookmark 5 times rapidly (<500ms) | First tap fires (toggle). Subsequent taps within 300ms debounce are ignored. Only one API call. No race condition (atomic RPC handles any concurrent calls). | P0 |
| BKMK-EDGE-004 | Rapid bookmark from different surfaces simultaneously | Deck + detail open (split/multi-window) | 1. Tap bookmark on deck card<br>2. Immediately tap bookmark on detail screen | Two RPC calls. Both arrive at server. Since RPC is a toggle, second call may reverse first. **Mitigation:** Debounce at hook level (300ms per jobId). Worst case: brief mismatch fixed by `onSettled` invalidation. | P1 |
| BKMK-EDGE-005 | Offline: optimistic bookmark | Airplane mode | 1. Tap bookmark while offline | UI toggles immediately (optimistic). No error shown immediately. When connectivity returns, `onSettled` fires → API call made. If fails → optimistic rollback + toast: "Couldn't save — check your connection." | P0 |
| BKMK-EDGE-006 | Offline: optimistic unbookmark | Airplane mode, bookmarked job | 1. Tap bookmark (unbookmark) while offline | Same as above. Rollback if API fails. | P0 |
| BKMK-EDGE-007 | User bookmarks 100+ jobs | User with 100+ bookmarks | 1. Open saved list<br>2. Scroll through all | FlatList virtualisation handles this. No performance degradation. Pagination via Supabase query with limit/offset if needed (initial MVP: single query). | P1 |
| BKMK-EDGE-008 | Bookmark appears on second device | Phone bookmarked, first time opening on tablet | 1. Bookmark on phone<br>2. Sign in on tablet<br>3. Open saved tab | Bookmarks loaded from server (single source of truth). AsyncStorage is per-device but Supabase fetch overrides. | P0 |
| BKMK-EDGE-009 | Account deletion cascades bookmarks | User deletes account | 1. Delete account | `ON DELETE CASCADE` from `profiles` → `bookmarks` rows cleaned up. | P0 |
| BKMK-EDGE-010 | Job deleted by employer: bookmarks cascade | Employer deletes a job | 1. Employer deletes job that 5 users bookmarked | `ON DELETE CASCADE` from `jobs` → `bookmarks` rows for that job removed. On next saved-list fetch, those jobs no longer appear. If user is viewing saved list and a job is deleted: next pull-to-refresh removes it. | P0 |
| BKMK-EDGE-011 | Same job bookmarked twice via concurrent taps | Rapid double-tap on bookmark | 1. Double-tap bookmark rapidly | Debounce + UNIQUE constraint prevents duplicate. Second insert attempt violates UNIQUE constraint → RPC returns error → rollback to bookmarked=false. | P0 |
| BKMK-EDGE-012 | Bookmark on job user already applied to | Job with existing application | 1. Bookmark a job user already applied to | Allowed. Bookmark row independent from application. Bookmark persists after apply. (Apply auto-removes bookmark per AC-08, but manually re-bookmarking after apply is fine.) | P1 |
| BKMK-EDGE-013 | Bookmark on job user swiped left on | Left-swiped job | 1. Return job to deck via filter change<br>2. Bookmark it | Allowed. Left swipe is "not right now," not "never." Bookmark icon toggleable. | P1 |
| BKMK-EDGE-014 | Bulk swipes by provider agent (Asuria) | User with `bulk_swipe_consent` | 1. Provider bulk-swipes on user's behalf<br>2. Check bookmarks | Provider action creates bookmark row with candidate's `user_id`. If provider bookmarks for candidate, each bookmark is a row. | P2 |
| BKMK-EDGE-015 | Anonymous / not-logged-in user | No auth session | 1. Tap bookmark icon | Bookmark disabled. Show tooltip: "Log in to save jobs" (via existing `require-auth` wrapper). No API call. | P0 |
| BKMK-EDGE-016 | Saved list with only expired jobs | User bookmarked jobs that all expired | 1. Open saved screen | Each card shows muted style with expiry note. Empty state? **Decision:** Show list (expired cards) rather than empty state — user may still want to reference. | P1 |
| BKMK-EDGE-017 | Cold start: first bookmark ever | New user, no existing bookmarks | 1. Bookmark first job | RPC inserts row. `['bookmarks', userId]` query populates. No prior cache → first-time load shows skeleton then populated list. | P0 |
| BKMK-EDGE-018 | Bookmark for a job that was already shown with stale bookmark state | Bookmark created in session A, card for same job appears in session B | 1. Bookmark job in session A<br>2. Force-close app<br>3. Open app (session B) | `['bookmark-state', jobId, userId]` fetches fresh state (staleTime: 60s, so initial fetch). Card shows correct filled state. | P0 |
| BKMK-EDGE-019 | Tab bar overflow on iPhone SE | iPhone SE (smallest screen) | 1. Open app on iPhone SE | 5 tabs fit. No "More" overflow tab. Tab labels may be truncated. | P1 |
| BKMK-EDGE-020 | AsyncStorage corruption of bookmark cache | Corrupted value | 1. Corrupt stored bookmark IDs set | On mount, `useBookmarks` re-fetches from Supabase. AsyncStorage is cache only. No data loss. | P1 |
| BKMK-EDGE-021 | "Undo" expired before network request completes | Slow network | 1. Swipe remove card<br>2. Tap Undo immediately<br>3. First API delete call completes after Undo | Potential race: Undo inserts bookmark, then stale delete call removes it. **Mitigation:** Undo call cancels the pending delete mutation (TanStack query cancellation on re-mutation). Or use a toggle RPC rather than separate delete/insert calls for undo. | P1 |
| BKMK-EDGE-022 | Server returns 409 on concurrent bookmark insert (unique violation) | Two RPC calls arrive concurrently | 1. Rapid double-tap not caught by debounce | RPC catches unique violation in its exception block. Returns `{ bookmarked: false }`. Frontend rolls back optimistic update. | P1 |

### 1.3 Integration Tests

| ID | Scenario | What to Verify | Priority |
|----|----------|----------------|----------|
| BKMK-INT-001 | BookmarkButton on SwipeCard: gesture compatibility | `stopPropagation()` on Pressable prevents Pan gesture from consuming tap. Test on physical device. If conflict: use `Gesture.Native()` with `simultaneousWithExternalGesture(panGesture)`. | P0 |
| BKMK-INT-002 | Tab layout: 5 tabs render correctly | Deck → Saved → Matches → Applied → Profile. All icons display. All tabs navigable. Settings removed. | P0 |
| BKMK-INT-003 | Profile: Saved count badge | Profile screen shows "Saved jobs" shortcut. (No count badge on tab icon at MVP.) | P1 |
| BKMK-INT-004 | Job detail: Bookmark in header | BookmarkButton renders in `ScreenHeader` `actions` slot next to Expired badge. Does not conflict with scroll. | P0 |
| BKMK-INT-005 | Hook sharing: `useBookmarks` used by JobCard, detail, saved screen | All three surfaces share same TanStack Query cache. Toggling on one immediately updates others (optimistic + invalidation). | P0 |
| BKMK-INT-006 | Deck page: Bookmark IDs fetched for overlay set | Deck screen fetches `['bookmark-ids', userId]` as a `Set<string>` of `job_id`. Passed to JobCard. O(1) lookup per card. | P0 |
| BKMK-INT-007 | Apply flow: clear bookmark on successful apply | Integration with `useCreateMatch.ts` or `performSwipe("applied")`. After successful apply, delete bookmark row. | P0 |
| BKMK-INT-008 | Expired badge in saved list: job status check | Saved job query joins `jobs` and checks `status`. Cards with non-active status show muted style + badge. | P0 |
| BKMK-INT-009 | Theme system: all 5 accent themes | Bookmark filled color uses `colors.accent` per theme. Test midnight (indigo), coast (teal), bloom (rose), hustle (amber), slate (slate). | P1 |
| BKMK-INT-010 | Light mode rendering | All bookmark components render correctly in light mode. Colors adapt via `useTheme()`. | P1 |

### 1.4 Regression Tests

| ID | Scenario | Steps | Priority |
|----|----------|-------|----------|
| BKMK-REGR-001 | All 228+ existing tests pass | Run `npx vitest run` — zero failures | P0 |
| BKMK-REGR-002 | Swipe deck still works | Left swipe, right swipe, swipe-up (Super Apply) — all animate, record data, show next card | P0 |
| BKMK-REGR-003 | Tab navigation still works | All 5 tabs navigable. Deck → Saved → Matches → Applied → Profile. No route errors. | P0 |
| BKMK-REGR-004 | Job detail still works | Job detail loads correctly for all access paths (deck tap, saved tap, match chat, deep link). Bookmark addition does not break layout. | P0 |
| BKMK-REGR-005 | Profile still works | All existing profile features intact (edit, verification badge, sign-out, theme picker, pricing). New "Saved jobs" row doesn't break existing layout. | P0 |
| BKMK-REGR-006 | Settings content still accessible from profile | Theme picker, sign-out, edit profile all reachable from Profile tab. | P0 |
| BKMK-REGR-007 | Streak features unaffected | Streak indicator, streak hooks, milestone overlays still work. Swipe counter increments. | P0 |
| BKMK-REGR-008 | Match flow unaffected | Right-swipe → match → notification → chat — all work. | P0 |
| BKMK-REGR-009 | Auth flow unaffected | Login, signup, logout, token refresh. | P0 |
| BKMK-REGR-010 | Employer job posting unaffected | Create, edit, pause, reactivate jobs. | P0 |
| BKMK-REGR-011 | Realtime subscriptions (chat, match) still work | New messages appear in realtime. Match indicators update. | P0 |
| BKMK-REGR-012 | Offline mode (non-bookmark) | Cached deck, queued swipes unchanged. Bookmark-specific offline handled by BKMK-EDGE-005/006. | P1 |

### 1.5 Automated Test Plan (Vitest)

#### New test files

| Test File | Location | Est. Tests | Description |
|-----------|----------|-----------|-------------|
| `useBookmarks.test.ts` | `hooks/__tests__/` | 15-20 | Unit tests for primary bookmark hook |
| `useBookmarkState.test.ts` | `hooks/__tests__/` | 5-8 | Unit tests for single-job bookmark check |
| `BookmarkButton.test.tsx` | `components/bookmark/__tests__/` | 6-10 | Component render + interaction tests |

#### `hooks/__tests__/useBookmarks.test.ts` — Proposed Tests

```typescript
// describe('fetchSavedJobs')
//   - returns array of SavedJob objects
//   - throws on Supabase error
//   - returns empty array for user with 0 bookmarks
//   - filters out jobs where jobs.status is not 'active'
//
// describe('isBookmarked')
//   - returns true for job_id in the set
//   - returns false for job_id not in the set
//   - returns false for empty set (no bookmarks)
//   - O(1) lookup: doesn't iterate full list
//
// describe('toggleBookmark')
//   - optimistically removes from list if currently bookmarked
//   - does NOT optimistically add (TODO: or does it via bookmark-state key?)
//   - rolls back on API error
//   - invalidates ['bookmarks', userId] on settle
//   - invalidates ['bookmark-state'] on settle
//   - calls supabase.rpc('toggle_bookmark', { p_job_id })
//   - rejects if unauthenticated (user.id is undefined)
//
// describe('refresh')
//   - calls queryClient.invalidateQueries + refetch
```

#### `hooks/__tests__/useBookmarkState.test.ts` — Proposed Tests

```typescript
// describe('query key')
//   - uses ['bookmark-state', jobId, userId]
//   - enabled when both jobId and userId are truthy
//   - not enabled when jobId is undefined
//
// describe('return value')
//   - isBookmarked = true when Supabase returns a row
//   - isBookmarked = false when Supabase returns null
//   - isBookmarked = false when jobId is undefined
//   - isLoading = true initially, false after fetch
```

#### `components/bookmark/__tests__/BookmarkButton.test.tsx` — Proposed Tests

```typescript
// describe('render states')
//   - renders outline icon when isBookmarked=false
//   - renders filled icon when isBookmarked=true
//   - renders correct size (sm=20px, md=24px, lg=28px)
//   - renders disabled state with 0.5 opacity
//   - has correct accessibilityLabel ("Save job for later" / "Remove job from saved")
//   - has accessibilityRole="button" and accessibilityState.selected
//
// describe('interaction')
//   - calls onToggle with jobId and !isBookmarked on press
//   - does NOT call onToggle when disabled
//   - hitSlop applied and doesn't break layout
//   - stopPropagation called on press event
//
// describe('animation')
//   - scale animation fires on press (verify via Animated mock)
//   - fillProgress syncs with isBookmarked prop changes (withTiming 200ms)
```

#### Test mocks needed

```typescript
// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage');

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
          order: vi.fn(),
        })),
      })),
      delete: vi.fn(),
      insert: vi.fn(),
    })),
  },
}));

// Mock TanStack Query (useQueryClient, useMutation)
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: vi.fn(() => ({
      cancelQueries: vi.fn(),
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      invalidateQueries: vi.fn(),
    })),
    useMutation: vi.fn(),
    useQuery: vi.fn(),
  };
});

// Mock expo-haptics
vi.mock('expo-haptics', () => ({
  impactAsync: vi.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'test-user-id' } })),
}));

// Mock Reanimated (useSharedValue, useAnimatedStyle, withSpring)
vi.mock('react-native-reanimated', () => ({
  ...vi.importActual('react-native-reanimated/mock'),
  default: {
    ...vi.importActual('react-native-reanimated/mock'),
    useSharedValue: vi.fn(() => ({ value: 1 })),
    useAnimatedStyle: vi.fn(() => ({})),
    withSpring: vi.fn((val) => val),
    withTiming: vi.fn((val) => val),
  },
}));
```

### 1.6 Accessibility Tests

| ID | Scenario | Check | Priority |
|----|----------|-------|----------|
| BKMK-A11Y-001 | Bookmark button screen reader (unfilled) | `accessibilityLabel="Save [job title] for later"`, `accessibilityState.selected: false`, `role="button"` | P0 |
| BKMK-A11Y-002 | Bookmark button screen reader (filled) | `accessibilityLabel="Remove [job title] from saved"`, `accessibilityState.selected: true`, `role="button"` | P0 |
| BKMK-A11Y-003 | Saved card screen reader | `role="button"`, label: "View [job title] at [employer]" | P0 |
| BKMK-A11Y-004 | Swipe-to-remove screen reader | Accessibility hint: "Swipe left to remove". Provide alternative: long-press context menu. | P1 |
| BKMK-A11Y-005 | Search input | `role="search"`, `accessibilityLabel="Search saved jobs by title, employer, or location"` | P0 |
| BKMK-A11Y-006 | Filter chips | `role="button"`, `accessibilityLabel="Filter by Casual"`, `accessibilityState.selected` for active chip | P0 |
| BKMK-A11Y-007 | Empty state | Heading level 1: "No saved jobs yet". CTA: "Browse jobs". Emoji hidden from screen reader. | P0 |
| BKMK-A11Y-008 | Undo toast | `role="alert"`, `accessibilityLabel="Removed from saved. Tap to undo."`, `accessibilityLiveRegion="polite"` | P0 |
| BKMK-A11Y-009 | Remove action (swipe-revealed) | `role="button"`, label: "Remove [job title] from saved" | P0 |
| BKMK-A11Y-010 | Loading skeleton | `role="progressbar"`, `accessibilityLabel="Loading saved jobs"` | P0 |
| BKMK-A11Y-011 | Loading skeleton: accessibility value | `accessibilityValue={{ min: 0, max: 100, now: 50 }}` | P1 |
| BKMK-A11Y-012 | Color contrast — bookmark icon border | 2px `#64748b` on `#0f172a` = 3.4:1 (meets UI component threshold of 3:1) | P0 |
| BKMK-A11Y-013 | Color contrast — title text | `#f8fafc` on dark bg = 15.2:1 (exceeds AA) | P0 |
| BKMK-A11Y-014 | Color contrast — muted text | `#94a3b8` on dark bg = 6.3:1 (exceeds AA 4.5:1) | P0 |
| BKMK-A11Y-015 | Color contrast — subtle text | `#64748b` on dark bg = 4.1:1 (meets AA 4.5:1 for 18px+ text only — check actual font size) | P1 |
| BKMK-A11Y-016 | Touch targets | All tappable elements ≥ 44pt (bookmark button, filter chips, CTA, Undo, remove action) | P0 |
| BKMK-A11Y-017 | Haptic respects user preference | Haptic not fired when `settings_haptics_enabled` is false | P1 |
| BKMK-A11Y-018 | Live region for bookmark state change | `aria-live="polite"`: "Job saved" / "Job removed from saved" | P2 |
| BKMK-A11Y-019 | Bookmark icon hidden from screen reader | Emoji has `aria-hidden` or `accessibilityElementsHidden`. Only the textual label is read. | P0 |
| BKMK-A11Y-020 | Keyboard navigation (web) | All controls reachable via Tab. Bookmark toggle via Enter/Space. | P1 |
| BKMK-A11Y-021 | Reduced motion | If `prefers-reduced-motion`, disable spring animations. Use `withTiming` (fade, no scale). Respect system setting. | P2 |
| BKMK-A11Y-022 | Error state: retry button | `role="button"`, label: "Try again" | P0 |
| BKMK-A11Y-023 | Stale data banner | `role="alert"`, reads immediately on appearance | P1 |
| BKMK-A11Y-024 | Results count text | `role="text"`, label: "{n} jobs saved" | P2 |

### 1.7 Performance Tests

| ID | Scenario | Threshold | Priority |
|----|----------|-----------|----------|
| BKMK-PERF-001 | RPC `toggle_bookmark` p95 response time | < 150ms | P0 |
| BKMK-PERF-002 | RPC `toggle_bookmark` p99 response time | < 300ms | P0 |
| BKMK-PERF-003 | `['bookmarks', userId]` query p95 | < 500ms for 100 bookmarks | P0 |
| BKMK-PERF-004 | `['bookmark-state', jobId, userId]` query p95 | < 200ms | P0 |
| BKMK-PERF-005 | `get_bookmark_count` RPC p95 | < 100ms | P0 |
| BKMK-PERF-006 | Bookmark button render time added to SwipeCard | No additional frame drops. Maintain 60fps swipe animation. | P0 |
| BKMK-PERF-007 | FlatList saved jobs with 100 items | Scroll 60fps. No jank. | P0 |
| BKMK-PERF-008 | FlatList saved jobs with 500 items | No crash. Acceptable scroll performance. (Virtualisation handles this.) | P1 |
| BKMK-PERF-009 | Bookmark toggle animation frame rate | 60fps during spring animation (300ms) | P0 |
| BKMK-PERF-010 | Skeleton shimmer animation frame rate | 60fps during pulse animation | P0 |
| BKMK-PERF-011 | Search debounce: filtering 100 items | < 16ms (no UI thread blocking) | P0 |
| BKMK-PERF-012 | Initial saved screen render (cold cache) | < 1s from tab tap to content visible (skeleton then data) | P0 |
| BKMK-PERF-013 | TanStack Query gcTime memory impact | gcTime 5min for bookmarks. Monitor memory in extended sessions. | P1 |

### 1.8 Security Tests

| ID | Scenario | Check | Priority |
|----|----------|-------|----------|
| BKMK-SEC-001 | RLS: read other user's bookmarks | Verify user A cannot SELECT `bookmarks` for user B (policy `bookmarks_select_own`) | P0 |
| BKMK-SEC-002 | RLS: insert for other user | Verify user A cannot INSERT bookmark with `user_id = user_B` (policy `bookmarks_insert_own`) | P0 |
| BKMK-SEC-003 | RLS: delete other user's bookmark | Verify user A cannot DELETE bookmark owned by user B (policy `bookmarks_delete_own`) | P0 |
| BKMK-SEC-004 | RLS: employer direct table access | Verify employer cannot SELECT `bookmarks` table directly. Only aggregate via `get_bookmark_count` RPC. | P0 |
| BKMK-SEC-005 | RPC `toggle_bookmark` security definer check | RPC runs as `security definer` — verify it correctly checks `auth.uid()` before mutation | P0 |
| BKMK-SEC-006 | RPC `get_bookmark_count` ensures only integer returned | No user IDs exposed. No PII leaked. | P0 |
| BKMK-SEC-007 | UNIQUE constraint defence-in-depth | Verify duplicate row cannot be inserted even if client bypasses app logic. Attempt direct INSERT of duplicate `(user_id, job_id)`. | P0 |
| BKMK-SEC-008 | No PII in PostHog events | Verify `user_id` is used as `distinct_id` but no PII (email, name, phone) in event properties | P0 |
| BKMK-SEC-009 | Input validation: job_id format | RPC validates UUID format for `p_job_id`. Non-UUID returns error, not SQL injection. | P0 |
| BKMK-SEC-010 | Unauthenticated RPC call | Call `toggle_bookmark` without auth header → returns `{ error: 'Not authenticated', bookmarked: false }` | P0 |
| BKMK-SEC-011 | AsyncStorage: no sensitive data | Bookmark keys contain only job IDs. No tokens, no PII. | P0 |

---

## 2. Analytics Event Schemas

All events go to PostHog. Events tagged `[Edge Function]` fire from Supabase Edge Function; `[Frontend]` fire from the app using `usePostHog` hook.

### 2.1 Event Definitions

---

#### `bookmark_added`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | User bookmarks a job (calls `toggle_bookmark` RPC, result = `bookmarked: true`) |
| **Fires from** | Frontend (`useBookmarks` hook `onSettled` after successful toggle) |
| **Rate limit** | At most once per save (debounce handles rapid taps) |

**Schema:**

```typescript
interface BookmarkAdded {
  event: 'bookmark_added';
  distinct_id: string;               // user_id UUID (PostHog identity)
  properties: {
    job_id: string;                   // UUID of the bookmarked job
    source: 'card' | 'detail';       // Where the bookmark action originated
    job_title: string;                // For analytics query convenience
    employer_id: string;              // Employer UUID (for employer-bucket analysis)
    salary_range: string | null;      // e.g., "$32/hr", "$60k-$80k"
    previous_bookmark_count: number;  // Total saved jobs before this action
    current_bookmark_count: number;   // Total saved jobs after this action
  };
  timestamp: string;                   // ISO 8601
}
```

**Fire condition:** After `toggleBookmark` mutation `onSettled` succeeds with `isBookmarked === true` (or mutation result indicates bookmark was created, not removed). Fire from `onSettled` (not optimistic) to ensure it only fires on actual success.

**Consideration:** If firing from Edge Function (deduplication), fire from `toggle_bookmark` RPC when it performs INSERT. Edge Function approach avoids frontend race conditions but requires PostHog capture from Deno. Prefer frontend fire for MVP (simpler, non-blocking). Move to Edge Function if we see event loss.

---

#### `bookmark_removed`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | User unbookmarks a job (RPC result = `bookmarked: false`) |
| **Fires from** | Frontend (`useBookmarks` hook `onSettled` after successful toggle) |
| **Rate limit** | At most once per removal |

**Schema:**

```typescript
interface BookmarkRemoved {
  event: 'bookmark_removed';
  distinct_id: string;
  properties: {
    job_id: string;
    source: 'card' | 'detail' | 'saved_list';  // Where the removal happened
    time_saved_minutes: number;     // How long the job was bookmarked before removal
    previous_bookmark_count: number;
    current_bookmark_count: number;
  };
  timestamp: string;
}
```

**`time_saved_minutes`:** Compute from `saved_at` (from bookmark row, if available) to current time. If bookmark row data not available at toggle time, pass `undefined` or skip. This is a "nice to have" property — don't block the event on it.

---

#### `bookmark_undo`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | User taps "Undo" on the undo toast after removing a bookmark |
| **Fires from** | Frontend (`UndoToast` `onUndo` handler) |
| **Rate limit** | At most once per undo |

**Schema:**

```typescript
interface BookmarkUndo {
  event: 'bookmark_undo';
  distinct_id: string;
  properties: {
    job_id: string;
    time_removed_seconds: number;    // How long between removal and undo (e.g., "2")
  };
  timestamp: string;
}
```

**Success criteria:** Undo toast tap → event fires. Capture as funnel step between `bookmark_removed` and `bookmark_undo`.

---

#### `saved_screen_viewed`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | Saved jobs screen mounts with data (first render after loading) |
| **Fires from** | Frontend (`saved.tsx` `useEffect` on mount + data ready) |
| **Rate limit** | Once per screen mount (debounce flag to avoid double-fire on re-render) |

**Schema:**

```typescript
interface SavedScreenViewed {
  event: 'saved_screen_viewed';
  distinct_id: string;
  properties: {
    bookmark_count: number;          // Total jobs currently bookmarked
    has_active_filters: boolean;     // Whether any filter chip is active (not "All")
    has_active_search: boolean;      // Whether search text is non-empty
  };
  timestamp: string;
}
```

**Fire condition:** Only when `isLoading === false` AND `isRefetching === false` (initial load complete, not pull-to-refresh). Use a `useRef` flag to fire only once per mount (not on every background/foreground cycle).

---

#### `saved_search_performed`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | User types in search bar on saved screen (debounced) |
| **Fires from** | Frontend (`SavedSearchBar` on debounced `onChangeText`) |
| **Rate limit** | Debounced (once per distinct search term change, not per keystroke) |

**Schema:**

```typescript
interface SavedSearchPerformed {
  event: 'saved_search_performed';
  distinct_id: string;
  properties: {
    query: string;                    // The search text (lowercase, trimmed)
    result_count: number;             // Number of matching results
    is_empty: boolean;                // True if result_count = 0
  };
  timestamp: string;
}
```

**Fire condition:** 300ms debounce after last keystroke. Fire only if the search query actually changed (compare to previous). Do NOT fire on initial empty string.

**Privacy consideration:** Search queries may contain job titles or employer names (not PII). If users search for sensitive terms, the query is captured. Consider hashing if this becomes a privacy concern. For MVP, raw query is acceptable (job search context is inherently non-sensitive).

---

#### `saved_filter_applied`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | User taps a filter chip on saved screen |
| **Fires from** | Frontend (`FilterChip` `onPress`) |
| **Rate limit** | Once per chip tap |

**Schema:**

```typescript
interface SavedFilterApplied {
  event: 'saved_filter_applied';
  distinct_id: string;
  properties: {
    filter: 'all' | 'casual' | 'part_time' | 'permanent';
    previous_filter: string;          // The filter that was active before
    result_count: number;             // Number of jobs matching this filter
    total_bookmarks: number;          // Total bookmarks (unfiltered)
  };
  timestamp: string;
}
```

---

#### `bookmark_tap_error`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | Bookmark toggle RPC fails (network error, auth error, server error) |
| **Fires from** | Frontend (`useBookmarks` mutation `onError`) |
| **Rate limit** | At most once per failed mutation (not per retry) |

**Schema:**

```typescript
interface BookmarkTapError {
  event: 'bookmark_tap_error';
  distinct_id: string;
  properties: {
    job_id: string;
    attempted_state: boolean;         // True = was trying to save, False = trying to unsave
    source: 'card' | 'detail' | 'saved_list';
    error_code: string;               // e.g., "NETWORK_ERROR", "AUTH_ERROR", "SERVER_ERROR"
    error_message: string;            // Truncated error message (no stack trace, no PII)
  };
  timestamp: string;
}
```

**Error code mapping:**

| Condition | Code |
|-----------|------|
| Network request failed (fetch error) | `NETWORK_ERROR` |
| RPC returns error (auth, validation) | `SERVER_ERROR` |
| User not authenticated | `AUTH_ERROR` |
| Optimistic update rollback triggered | `ROLLBACK` |

---

#### `saved_applied` (from saved list context)

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | User applies to a job that was previously bookmarked (from any surface) |
| **Fires from** | Frontend (application success handler, when bookmark was confirmed as having existed) |
| **Rate limit** | Once per application from saved |

**Schema:**

```typescript
interface SavedApplied {
  event: 'saved_applied';
  distinct_id: string;
  properties: {
    job_id: string;
    time_saved_hours: number;        // How long the job was saved before applying
    employer_id: string;
  };
  timestamp: string;
}
```

**Fire condition:** After successful apply mutation. Determine `time_saved_hours` from bookmark row's `created_at` to now. If bookmark was removed by apply (per AC-08), this is the last moment to read that data.

---

#### `bookmark_count_viewed` (Employer)

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | Employer views job detail page that shows bookmark count |
| **Fires from** | Frontend (job detail screen mount for employer role) |
| **Rate limit** | Once per job detail view |

**Schema:**

```typescript
interface BookmarkCountViewed {
  event: 'bookmark_count_viewed';
  distinct_id: string;               // Employer's user ID
  properties: {
    job_id: string;
    bookmark_count: number;
    application_count: number;        // For ratio context
  };
  timestamp: string;
}
```

### 2.2 Event Fire Summary

| Event | Where | Blocking? | Retry? | Priority |
|-------|-------|-----------|--------|----------|
| `bookmark_added` | Frontend (`onSettled`) | No | No | P0 |
| `bookmark_removed` | Frontend (`onSettled`) | No | No | P0 |
| `bookmark_undo` | Frontend (UndoToast) | No | No | P0 |
| `saved_screen_viewed` | Frontend (saved.tsx mount) | No | No | P0 |
| `saved_search_performed` | Frontend (search debounce) | No | No | P1 |
| `saved_filter_applied` | Frontend (chip tap) | No | No | P1 |
| `bookmark_tap_error` | Frontend (`onError`) | No | No | P1 |
| `saved_applied` | Frontend (apply success) | No | No | P1 |
| `bookmark_count_viewed` | Frontend (employer detail) | No | No | P2 |

All events are fire-and-forget. Bookmark functionality must never depend on analytics delivery.

### 2.3 Implementation Guidance

**Frontend (React Native):**
```typescript
import { usePostHog } from '@/hooks/usePostHog';

// Inside useBookmarks hook, onSettled of toggleBookmark mutation:
const posthog = usePostHog();

// After successful toggle (check mutation result):
if (newBookmarkState) {
  posthog.capture('bookmark_added', {
    job_id: jobId,
    source: 'card', // or 'detail'
    job_title: job?.title ?? '',
    employer_id: job?.employer_id ?? '',
    previous_bookmark_count: bookmarks.length,
    current_bookmark_count: bookmarks.length + 1,
  });
} else {
  posthog.capture('bookmark_removed', {
    job_id: jobId,
    source: 'card', // or 'detail' or 'saved_list'
    previous_bookmark_count: bookmarks.length,
    current_bookmark_count: bookmarks.length - 1,
  });
}
```

**Edge Function (future — if needed):**
```typescript
// For Edge Function-based events, use raw fetch to PostHog
const POSTHOG_HOST = Deno.env.get('POSTHOG_HOST');
const POSTHOG_API_KEY = Deno.env.get('POSTHOG_API_KEY');

async function capturePostHog(
  event: string,
  distinctId: string,
  properties: Record<string, unknown>,
): Promise<void> {
  if (!POSTHOG_HOST || !POSTHOG_API_KEY) return;
  await fetch(`${POSTHOG_HOST}/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: POSTHOG_API_KEY,
      event,
      distinct_id: distinctId,
      properties: { ...properties, $lib: 'supabase-edge-function' },
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {}); // Fire-and-forget
}
```

### 2.4 PostHog Dashboard Queries (Recommended)

| Query | Event | Insight |
|-------|-------|---------|
| "Bookmark rate" | `bookmark_added` / (total job card views) | % of card views leading to bookmark |
| "Bookmark source breakdown" | `bookmark_added` grouped by `source` | Do users bookmark more from deck or detail? |
| "Undo rate" | Funnel: `bookmark_removed` → `bookmark_undo` | How often do users regret removals? |
| "Saved screen DAU" | `saved_screen_viewed` unique users/day | Saved screen engagement |
| "Search usage" | `saved_search_performed` unique users/day | % of saved screen visitors who search |
| "Filter usage" | `saved_filter_applied` grouped by `filter` | Which job types are most filtered-for |
| "Bookmark-to-apply conversion" | `bookmark_added` → `saved_applied` (7-day funnel) | % of bookmarks leading to application |
| "Error rate" | `bookmark_tap_error` / total toggle attempts | API reliability |
| "Average bookmark shelf life" | `bookmark_removed`.`time_saved_minutes` histogram | How long jobs stay bookmarked |
| "Employer engagement with saved metric" | `bookmark_count_viewed` unique employers/day | Employer feature adoption |

---

## 3. Success Criteria Checklist

### Pre-Deployment Gate

- [ ] **Migration applied without error**
  - `supabase migration up` runs clean
  - `bookmarks` table created with correct schema
  - Indexes created (`idx_bookmarks_user_created`, `idx_bookmarks_job_id`)
  - RLS policies active (select_own, insert_own, delete_own)
  - `toggle_bookmark` RPC installed and tested
  - `get_bookmark_count` RPC installed and tested

- [ ] **All 228+ existing tests pass**
  ```bash
  cd apps/mobile && npx vitest run
  # Expected: 34+ test files, 228+ tests, 0 failures
  ```

- [ ] **New useBookmarks tests pass**
  - `hooks/__tests__/useBookmarks.test.ts` — all tests green
  - `hooks/__tests__/useBookmarkState.test.ts` — all tests green
  - `components/bookmark/__tests__/BookmarkButton.test.tsx` — all tests green

- [ ] **TypeScript zero errors**
  ```bash
  cd apps/mobile && npx tsc --noEmit
  ```

- [ ] **Lint zero errors**
  ```bash
  cd apps/mobile && npx eslint .
  ```

### Functional Verification

- [ ] **BookmarkButton renders correctly on SwipeCard**
  - Top-right of content area, absolute positioned
  - 44×44pt touch target
  - Outline state by default
  - Does NOT interfere with swipe gesture

- [ ] **Tap toggles bookmark state**
  - Optimistic update: UI flips instantly
  - Spring animation (~300ms total)
  - Haptic fires (Light type)
  - RPC call succeeds

- [ ] **Bookmark persists across app restart**
  - Kill app → reopen → bookmark icon shows filled state
  - Job appears in saved list

- [ ] **Saved screen loads and displays**
  - Shows skeleton → list (or empty state)
  - Sorted most recent first
  - Pull-to-refresh works

- [ ] **Swipe-to-remove + undo works**
  - Swipe reveals "Remove" action
  - Card animates off-screen on release
  - Undo toast appears with 4s auto-dismiss
  - Tap Undo restores card + calls API

- [ ] **Search + filter work**
  - Search debounced (300ms)
  - Filter chips filter correctly
  - Search + filter work together (intersection)
  - No-match states show correct messages

- [ ] **Empty state renders correctly**
  - New user sees 📑 + "No saved jobs yet" + "Browse jobs" CTA
  - CTA navigates to deck

- [ ] **Error state + stale data fallback**
  - Full error state with retry on fresh failure
  - Warning banner + cached data when stale data exists

- [ ] **Employer bookmark count visible**
  - "⭐ N saved by candidates" on employer job detail
  - Zero state shows "0 saved"
  - Employer cannot see individual savers

- [ ] **Tab layout correct**
  - 5 tabs: Jobs, Saved, Matches, Applied, Profile
  - Settings tab removed
  - Profile has "Saved jobs" shortcut
  - No tab overflow on small phones

- [ ] **Bookmark state syncs across all surfaces**
  - Deck card ↔ job detail ↔ saved list — all show same state
  - Toggle from one surface immediately reflected on others
  - No stale or divergent states

- [ ] **Apply from saved auto-removes bookmark**
  - Application success → bookmark deleted
  - Job no longer appears in saved list

- [ ] **All analytics events fire correctly**
  - Verify in PostHog staging project:
    - `bookmark_added` with `source` property
    - `bookmark_removed` with `source` property
    - `bookmark_undo` with `time_removed_seconds`
    - `saved_screen_viewed` with `bookmark_count`
    - `saved_search_performed` with `query` and `result_count`

### Regression Verification

- [ ] **No regression in swipe deck**
  - Left/right/up swipes all work
  - 60fps maintained
  - Match detection, chat initiation

- [ ] **No regression in tab navigation**
  - All 5 tabs navigable, no route errors

- [ ] **No regression in job detail**
  - All access paths work (deck, saved, match, deep link)

- [ ] **No regression in profile**
  - Edit profile, verification badge, sign-out, theme picker, pricing all intact

- [ ] **No regression in auth**
  - Login, signup, logout, token refresh

- [ ] **No regression in streak**
  - Streak indicator, swipe counter, milestones unaffected

- [ ] **No regression in employer flow**
  - Job posting, editing, pausing all work

### Accessibility Verification

- [ ] **Screen reader: bookmark button labels correct**
  - "Save [job title] for later" / "Remove [job title] from saved"

- [ ] **Screen reader: empty state heading**
  - "No saved jobs yet" announced as heading

- [ ] **Screen reader: undo toast alert**
  - "Removed from saved. Tap to undo." announced

- [ ] **Color contrast passes WCAG AA**
  - All text meets 4.5:1 threshold

- [ ] **Touch targets ≥ 44pt**
  - All interactive elements: bookmark button, filter chips, CTA, Undo, remove action, clear search

- [ ] **Haptic respects user preference**

### Quality Gates

- [ ] **TypeScript: zero errors**
- [ ] **Lint: zero errors**
- [ ] **All existing + new tests pass**
- [ ] **Manual QA pass on:**
  - iOS physical device (iPhone 14+)
  - Android physical device (Pixel 7+)
  - Android tablet (≥640px width)
  - Web (Chrome, Safari, Firefox) — if applicable

### Staging Smoke Tests

```
1. Register new candidate → navigate to Saved tab → verify empty state
2. Browse deck → tap bookmark on job card → verify icon fills + haptic
3. Navigate to Saved tab → verify job appears in list
4. Navigate to job detail → verify bookmark icon filled
5. Unbookmark from detail → verify card in deck shows unfilled
6. Re-bookmark from detail → verify filled on deck + saved
7. Swipe left on saved card → verify remove + undo toast
8. Tap Undo → verify card restored
9. Search saved jobs by title → verify filtering
10. Filter by job type → verify filtering
11. Search + filter simultaneously → verify intersection
12. Force app restart → verify bookmarks persist
13. Employer login → verify bookmark count on job detail
14. Employer attempts direct bookmark table query → verify RLS blocks
15. Offline bookmarks → verify optimistic + rollback
16. Rapid bookmark tap → verify debounce + no duplicate
17. Run full regression suite
```

### Rollback Plan

If Bookmarks feature causes production issues:

```sql
-- Rollback migration (reverse of 202606070004_bookmarks.sql):

-- 1. Drop RPCs
drop function if exists public.toggle_bookmark(uuid);
drop function if exists public.get_bookmark_count(uuid);

-- 2. Drop policies
drop policy if exists "bookmarks_select_own" on public.bookmarks;
drop policy if exists "bookmarks_insert_own" on public.bookmarks;
drop policy if exists "bookmarks_delete_own" on public.bookmarks;

-- 3. Drop table
drop table if exists public.bookmarks cascade;

-- 4. (Optional) Re-add Settings tab in layout
-- In apps/mobile/app/(candidate)/(tabs)/_layout.tsx, restore settings Tabs.Screen
```

**Feature flag approach:** Wrap bookmark UI behind a feature flag (e.g., `EXPO_PUBLIC_FEATURE_BOOKMARKS` env var or server-side toggle). If issues arise, disable bookmark rendering without deploying code.

---

## 4. Release Notes Draft

### CHANGELOG.md Entry

```markdown
## [Unreleased]

### Added (2026-06-07 — Saved Jobs / Bookmarks)

- **Bookmark jobs for later:** Tap the bookmark icon (🔖) on any job card or job
  detail screen to save it for future review. Bookmarks persist across sessions
  and devices.
  - **Bookmark button:** Animated toggle with spring scale effect and haptic
    feedback. 44×44pt touch target. Accessible with VoiceOver/TalkBack labels.
  - **State sync:** Bookmark state is single-sourced via TanStack Query —
    toggling from the deck card, job detail, or saved list immediately reflects
    everywhere. Optimistic updates with rollback on failure.
  - **Dedicated Saved tab:** New "Saved" tab (second position in bottom nav,
    replacing the Settings tab) shows all bookmarked jobs in a scrollable list.
    Settings moved to Profile screen (gear icon).
  - **Swipe-to-remove:** Swipe left on a saved job card to remove it. An undo
    toast appears for 4 seconds — tap to restore.
  - **Search & filter:** Search saved jobs by title, employer name, or suburb
    (300ms debounced). Filter chips for job type: All, Casual, Part-time, Perm.
    Search and filter work together.
  - **Pull-to-refresh:** Standard pull-to-refresh on saved list. Stale data
    fallback: shows cached results with a warning banner if the network is
    unreachable.
  - **Loading skeleton:** 4-card shimmer skeleton during initial load.
  - **Empty state:** 📑 "No saved jobs yet" with "Browse jobs" CTA for new users.
  - **Employer bookmark count:** Employers see aggregate save count on their job
    detail page ("⭐ N saved by candidates"). Individual saver identities are
    never exposed at MVP.
  - **RLS-protected:** Row-level security ensures users can only see their own
    bookmarks. Atomic `toggle_bookmark` RPC prevents race conditions.
  - **New hooks:** `useBookmarks` (full list + toggle + Set-lookup) and
    `useBookmarkState` (lightweight single-job check).
  - **Analytics:** 8 new PostHog events tracking bookmark add/remove/undo,
    screen views, search, filter usage, errors, and conversion to application.

### Changed

- **Tab navigation:** Bottom nav reordered to Jobs → Saved → Matches → Applied →
  Profile. Settings tab removed — its contents (theme picker, sign-out, edit
  profile, pricing) are now accessible from the Profile screen.
- **Job card (deck):** Added bookmark button in top-right of content area.
- **Job detail screen:** Added bookmark button in header actions.
- **Profile screen:** Added "Saved jobs" shortcut row.
- **Apply flow:** When a user applies to a job from the saved list, the bookmark
  is automatically removed.

### Technical Details

- **New files:** 10 (migration, 2 hooks, 5 components, 1 screen, 1 badge
  component)
- **Modified files:** 4 (tab layout, JobCard, job detail, ProfileScreen)
- **Database:** New `bookmarks` table (user_id, job_id, created_at) with
  UNIQUE constraint, indexes, RLS, and `toggle_bookmark` / `get_bookmark_count`
  RPCs.
- **Dependencies:** None new (uses existing Reanimated, TanStack Query,
  react-native-gesture-handler Swipeable, Supabase, PostHog, expo-haptics)
- **Migration:** `202606070004_bookmarks.sql` — create bookmarks table + RPCs
  + RLS + indexes
```

---

*End of Handoff — Sam. Questions → route to Sam for clarification.*
