# Product Handoff: Saved Jobs (Bookmarks)

**Feature:** Saved Jobs — Job Seeker Bookmarking & Recruiter Interest Signal
**Product Area:** Swipe Deck → Saved Jobs Screen
**Status:** ✍️ Validated — Ready for Implementation
**Priority:** HIGH — Next feature after Daily Streak
**Date:** 2026-06-07
**Author:** Alex (Product Research)

---

## 1. Feature Summary

### What It Does

Saved Jobs lets a candidate bookmark a job card during swiping for later review — without applying. It creates a dedicated "Saved" screen where all bookmarked jobs are collected, and it surfaces aggregate "times saved" data to employers as an early engagement signal.

### Why It Matters Now (Beyond v1)

The original PRD explicitly deferred Saved Jobs with the reasoning: *"Swipe deck IS the bookmark — if it's good, swipe right."* That assumption held for v1 (single-session, impulse-driven usage). The app has now matured:

**Product maturity triggers:**
- **Deeper consideration window** — Users report wanting to compare multiple jobs before applying. In a single-session impulse model, they feel pressured to decide immediately.
- **Apples-to-apples comparison** — A user might see 3 barista roles across 2 sessions. Without a bookmark, they have to remember which was which. Saved Jobs lets them bracket.
- **Session-bridging behaviour** — 15% of active users return to the app within 2 hours (PostHog, early signal). Saved Jobs gives returning sessions a clear landing target beyond the swipe deck.
- **Candidate anxiety reduction** — "What if I swipe left on something good?" is a documented adoption blocker for casual swipe UIs in job search. Bookmarks remove that anxiety because users know they can save without committing.
- **Competitive parity** — Indeed, LinkedIn, and Seek all support saved jobs. Recruiters expect the metric. Its absence is a perceived gap, even if the swipe mechanic is differentiated.

**Bookmarks vs. Apply — distinct user intent:**

| Intent | Action | Friction | When |
|--------|--------|----------|------|
| "I want this job" | Swipe right / Apply | High (application submitted) | High confidence |
| "I'm interested but not ready" | Bookmark | Minimal (one tap) | Low confidence / exploring |
| "Not for me" | Swipe left | None | Nope |

Bookmarks serve the middle bucket — the largest behavioural cohort in any discovery product. Without this third path, users either apply prematurely (inflating low-intent applications, frustrating recruiters) or lose the job entirely.

---

## 2. Validation Against Other Candidates

| Candidate Feature | Why Not Instead |
|---|---|
| **Multi-circle / market expansion** | Premature before beachhead density proven. Bookmarks work at any scale. |
| **Boost / paid tiers** | Wait until demand validated. Bookmarks are a retention feature, not a monetisation one — ship free. |
| **Candidate reputation / reviews** | No completed hires to review yet. Bookmarks build data now. |
| **Referral programme** | Weak without daily habit first. Streak + Bookmarks together create the habit layer. |
| **AI matching / smart recommendations** | In roadmap. Bookmarks feed preference signals into ML pipeline directly (see §8). |
| **Employer analytics dashboard** | Post-MVP. Employee uses app at launch. Bookmark count is a lightweight signal they can see in-app. |

**Verdict:** Saved Jobs is the highest-impact, lowest-complexity post-streak feature. It directly addresses user feedback, unlocks session-bridging, and feeds the ML model with explicit preference signals — all without new infra.

### Risk Assessment

| Risk | Mitigation |
|---|---|
| **Bookmarks reduce swipe-right rate** | Mitigated if bookmarks are treated as positive signal in ML model (they are). Users who bookmark may later apply at higher conversion rates. Monitor bookmark-to-application conversion. |
| **Cluttered tab bar** | Fit bookmark icon into existing tabs; replace "Settings" icon with bookmark, or add a 6th tab (max 5 is ideal on mobile). See §9 Open Questions. |
| **Recruiters misinterpret bookmarks as high intent** | Bookmark count is displayed as "interested" not "applied." Employers see counts, not identities (at MVP). Clear labelling prevents confusion. |
| **Engineering cost higher than estimated** | Pure client + Supabase join. No new infra, no cron jobs, no external API calls. Table is a simple junction with RLS. |

---

## 3. User Stories

### Candidate-Focused

| ID | Story | Priority |
|----|-------|----------|
| SAVE-01 | **As a candidate**, I want to bookmark a job card I'm interested in (but not ready to apply to) so I can review it later without swiping endlessly | P0 (MVP) |
| SAVE-02 | **As a candidate**, I want to see all my saved jobs in one place so I can compare and decide which to apply to | P0 (MVP) |
| SAVE-03 | **As a candidate**, I want my bookmark state to persist across sessions so I don't lose jobs I saved | P0 (MVP) |
| SAVE-04 | **As a candidate**, I want to remove a job from my saved list when I'm no longer interested | P0 (MVP) |
| SAVE-05 | **As a candidate**, I want to apply to a job directly from my saved list so I don't have to find it again in the deck | P0 (MVP) |
| SAVE-06 | **As a candidate**, I want to see which jobs I've already bookmarked when I see them again in the deck so I don't double-save | P0 (MVP) |
| SAVE-07 | **As a candidate**, I want to see a helpful message when I have no saved jobs so I know where to find jobs to save | P1 (Ship with MVP) |
| SAVE-08 | **As a candidate**, I want to see how long ago I saved each job so I know which ones are getting stale | P2 (Post-MVP) |

### Employer-Focused

| ID | Story | Priority |
|----|-------|----------|
| SAVE-09 | **As an employer**, I want to see how many candidates have saved my job so I can gauge interest before I've received applications | P0 (MVP) |
| SAVE-10 | **As an employer**, I want to see "bookmark" as an event in my job's activity timeline so I can track candidate interest alongside applications | P1 (v1.1) |
| SAVE-11 | **As an employer**, I want to optionally view which specific candidates saved my job (name + profile) so I can proactively reach out | P2 (Pending privacy assessment) |

### Provider (Asuria / DES) Focused

| ID | Story | Priority |
|----|-------|----------|
| SAVE-12 | **As a provider agent**, I want to see which jobs my assigned candidates have saved so I can guide their job search | P2 (Post-MVP, requires provider portal expansion) |

---

## 4. Acceptance Criteria

### AC-01: Bookmark Button on Job Card (Swipe Deck)

```
Given I am a job seeker viewing a job card on the swipe deck
When I tap the bookmark icon (⭐ or 🔖) on the card
Then the icon fills/animates to indicate "saved"
  AND the job is persisted to my saved_jobs list
  AND the bookmark state is immediately visible (optimistic UI update)
```

- **Placement:** Bottom-right of the job card, next to or replacing the "swipe up" super-apply zone. Separate from the swipe gesture — this is a tap target, not a swipe action.
- **Icon:** Empty star outline (☆) → filled star (★) on save. Distinct from match/apply actions.
- **Size:** Minimum 44×44pt tap target per Apple HIG.
- **Animation:** 300ms scale bounce on toggle. No haptic (reserved for match).

### AC-02: Bookmark Button on Job Detail Screen

```
Given I am viewing a job's detail screen (tapped from deck, saved list, or deep link)
When I tap the bookmark icon in the header
Then the same bookmark state toggles (save/unsave)
  AND the state is synced with the deck card's bookmark state
```

- **Single source of truth:** Bookmark state for a given job is the same everywhere — deck card, detail screen, saved list. No divergence.

### AC-03: Saved Jobs Screen

```
Given I am a job seeker
When I navigate to the Saved Jobs tab/screen
Then I see a vertical scrollable list of all my bookmarked jobs
  AND each item shows: job title, company name, salary range, location, bookmark date
  AND each item is tappable to open the job detail screen
```

- **Sort order:** Most recently saved first.
- **From saved, user can:** Tap → view detail → bookmark toggle, Apply, or swipe back.

### AC-04: Bookmark State Persists Across Sessions

```
Given I bookmark a job in session A
When I close and reopen the app (session B)
Then the bookmark icon on that job's card still shows as "saved"
  AND the job still appears in my Saved Jobs list
```

- **Persistence model:** Server-side (Supabase `saved_jobs` table). No device-local-only storage.

### AC-05: Unbookmark Removes from Saved List

```
Given I have 3 jobs in my Saved list
When I tap the filled star on one of them (in deck, detail, or saved list)
Then that job is removed from my Saved list immediately (optimistic)
  AND the star returns to outline state
  AND the remaining 2 jobs still appear in the list
```

### AC-06: Empty State

```
Given I am a new user who has never bookmarked a job
When I navigate to the Saved Jobs screen
Then I see an empty state with:
  - Illustration or emoji: "📌 No saved jobs yet"
  - Headline: "Save jobs you're interested in"
  - Subtitle: "Tap the star on any job card to save it for later"
  - CTA button: "Browse Jobs" → deep links to swipe deck
```

### AC-07: Already-Bookmarked Indication in Deck

```
Given I am swiping through the deck
  AND I previously bookmarked job X
When job X appears in my deck
Then the bookmark icon on job X's card is already filled (saved state)
  AND tapping it un-bookmarks as expected
```

- **Query:** Before rendering the swipe deck, fetch the user's saved_job_ids in one `IN` query. Use a Set lookup per card — O(1) per card, not O(n) per card.

### AC-08: Apply from Saved List

```
Given I am viewing a job in my Saved list
When I tap "Apply" (or swipe right) on that saved job
Then the application flow proceeds normally
  AND the job is automatically removed from my Saved list after applying
  AND the bookmark state is cleared
```

### AC-09: Employer Sees Bookmark Count (MVP)

```
Given I am an employer viewing my posted job's detail/insights
Then I see a metric: "⭐ 23 saved by candidates"
  AND this is shown alongside the "Applied" count
  AND it is clearly labelled as "Saved" (not "Applied")
```

- **Hygiene:** Zero state shows "0 saved" — no hiding the metric. Employers need to know the feature exists.

### AC-10: Pull-to-Refresh on Saved Jobs List

```
Given I am on the Saved Jobs screen
When I pull down on the list
Then the list refreshes, fetching the latest data from the server
  AND any jobs that have been deleted/expired are handled gracefully (see §7)
```

---

## 5. Data Model & Schema

### New Table: `saved_jobs`

```sql
create table public.saved_jobs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) not null,
  job_id     uuid references public.jobs(id) not null on delete cascade,
  saved_at   timestamptz not null default now(),
  notified   boolean not null default false  -- reserved: employer notification sent?

  -- No updated_at needed — save is a point-in-time event.
  -- Re-saving (toggle off → on) creates a new row with a fresh saved_at.
);

-- Each user can save a given job at most once (enforced at app level;
-- DB level: use ON CONFLICT in upsert, or unique constraint).
-- Since toggle off deletes the row, UNIQUE constraint is simpler.
alter table public.saved_jobs
  add constraint saved_jobs_unique_user_job
  unique (user_id, job_id);

-- RLS
alter table public.saved_jobs enable row level security;

-- Candidate: own CRUD
create policy "saved_jobs_select_own"
  on public.saved_jobs for select
  using (user_id = auth.uid());

create policy "saved_jobs_insert_own"
  on public.saved_jobs for insert
  with check (user_id = auth.uid());

create policy "saved_jobs_delete_own"
  on public.saved_jobs for delete
  using (user_id = auth.uid());

-- Employer: read-only aggregate (no access to individual savers at MVP)
-- Aggregate queries use a separate RPC; no direct table access for employers.

-- Indexes
create index idx_saved_jobs_user_id on public.saved_jobs(user_id);
create index idx_saved_jobs_job_id on public.saved_jobs(job_id);
create index idx_saved_jobs_saved_at on public.saved_jobs(saved_at desc);
```

### No New Tables Beyond `saved_jobs`

Bookmark count is computed via `SELECT COUNT(*) FROM saved_jobs WHERE job_id = $1` — no denormalised counter needed at MVP. If bookmark counts become hot-path (e.g., shown on every job card in employer dashboard), add a denormalised `bookmark_count` column to `jobs` with a trigger, but **not before profiling proves it's needed.**

### Edge Function: `toggle-bookmark`

- **Trigger:** Client calls this Edge Function with `{ job_id }`
- **Logic:**
  1. Check if row exists for `(auth.uid(), job_id)`
  2. If exists → DELETE (unbookmark)
  3. If not exists → INSERT (bookmark)
  4. Return `{ bookmarked: true | false }`
- **Why Edge Function?** Single atomic call instead of client-side read-then-write. Avoids race conditions from rapid tapping.
- **Performance:** Must complete in <150ms. This is a latency-sensitive UI action (toggle animation).

Alternatively, use a Supabase `rpc` function for the same logic — prefer the pattern already used in the codebase.

### PostHog Events

```typescript
// Bookmark
posthog.capture('job_bookmarked', {
  job_id: string,
  source: 'deck' | 'detail' | 'saved_list',
  job_title: string,
  employer_id: string,
  salary_range: string | null,
})

// Unbookmark
posthog.capture('job_unbookmarked', {
  job_id: string,
  source: 'deck' | 'detail' | 'saved_list',
  time_saved_minutes: number,  // how long it was saved before removal
})

// Apply from saved list
posthog.capture('applied_from_saved', {
  job_id: string,
  time_saved_hours: number,
})

// View saved list
posthog.capture('saved_list_viewed', {
  saved_count: number,  // how many jobs were in the list at view time
})
```

---

## 6. Success Metrics

### Engagement Targets

| Metric | Baseline (No Bookmarks) | Month 1 Target | Month 3 Target |
|--------|------------------------|----------------|----------------|
| Bookmark rate (% of job card views) | N/A | **5%** | **10%** |
| Bookmarks created per active user per week | 0 | **2** | **5** |
| Bookmark-to-application conversion (within 7 days) | N/A | **15%** | **25%** |
| Saved jobs screen DAU as % of app DAU | N/A | **10%** | **20%** |
| Avg. time spent on Saved Jobs screen per session | N/A | **45s** | **60s** |
| % of applied jobs that were previously bookmarked | N/A | **10%** | **20%** |

### North Star Proxy

**% of weekly active users with ≥1 active save** — if >30% of WAUs have at least one saved job, the feature is embedded in the habit loop.

### Dashboard Metrics (Per Job, for Employers)

- Total saves (all-time) — visible on job detail
- Saves in last 7 days — visible on job detail
- Save-to-apply conversion rate — visible on job detail (requires minimum N=10 saves to show, prevents noise on new posts)

---

## 7. Edge Cases

| Edge Case | Handling |
|-----------|----------|
| **Job deleted while saved** | `saved_jobs.job_id` has `on delete cascade`. Row is automatically removed. On the Saved Jobs screen, if data comes back with null job reference after a delayed query, show a friendly "This job is no longer available" placeholder card. |
| **Job expired while saved** | Same as above if the job row is deleted/expired. If the app uses a `status` column on `jobs` (e.g., `active`, `filled`, `expired`), the query for saved jobs should `LEFT JOIN` and check status. Expired/filled jobs show as "This job has been filled" with a muted style, not removed — user might want to see what they missed. |
| **Offline bookmark (optimistic)** | On toggle, immediately update local UI state and enqueue a background sync. If the network call fails, revert the UI state and show a brief toast: "Couldn't save — check your connection." Do NOT leave stale optimistic state. |
| **Rapid bookmark/unbookmark** | Edge Function handles toggle atomically. If user taps rapidly, debounce at 500ms in the UI (first tap fires, second tap within 500ms is ignored). Prevents API spam and race conditions. |
| **User deletes account** | `saved_jobs.user_id` references `profiles(id)`. If cascade delete from profiles is already configured (verify), saved_jobs rows are cleaned up. If not, add a cleanup trigger or rely on the existing `auth.users` delete hook. |
| **Same job bookmarked twice** | UNIQUE constraint on `(user_id, job_id)` prevents duplicates. App-level: toggle function deletes existing before inserting new, so the second "bookmark" after an unbookmark always creates a fresh row. |
| **Bookmark on a job the user already applied to** | Allowed. The bookmark persists even after applying (though applying clears it per AC-08). If the user un-bookmarks and re-bookmarks after applying, that's fine — the bookmark row is independent of the application. |
| **Bookmark on a job the user swiped left on** | Allowed. A left swipe is "not right now," not "never." The bookmark pattern explicitly serves the "I'm interested but not ready" use case. However, if the swipe deck's query excludes left-swiped jobs, the bookmark icon on that job won't appear in the deck — but it'll still be visible in the Saved list. |
| **Job filled while user is viewing saved list** | If the app polls or refreshes, the card updates to "filled" state. No push notification about filled saved jobs at MVP — revisit if user feedback requests it. |
| **Multiple devices / sessions** | Bookmark state is server-side. Same user on phone + tablet: bookmarks are consistent. |
| **Bulk save by provider agent (Asuria)** | If `bulk_swipe_consent` is active, provider-saved jobs count toward the candidate's bookmark list. The `user_id` on the saved_jobs row is the candidate's ID, not the agent's. The agent acts on behalf of the candidate. |
| **Real-time update of bookmark count for employer** | Not needed at MVP. Employer sees count on page load. Real-time count via Supabase Realtime subscription is P2. |
| **Bookmarking a job that has been removed from the swipe deck (e.g., user ran out of jobs in their radius)** | The bookmark is still valid. The Saved screen acts as a persistent reference — the job may re-enter the deck when the user expands their radius or new similar jobs appear. |
| **Anonymous / not-logged-in user** | Bookmark disabled. Show a "Log in to save jobs" tooltip when tapping the bookmark icon while unauthenticated. Handle via existing `require-auth` wrapper. |

---

## 8. ML Pipeline Integration

### Preference Signal

Every bookmark is a **positive preference signal** for the candidate. The ML pipeline should consume `saved_jobs` rows as positive labels, alongside swipe-right events.

**Signal strength hierarchy (candidate → job fit):**

| Signal | Strength | Notes |
|--------|----------|-------|
| Swipe right → hired | ★★★★★ | Strongest — outcome confirmed |
| Swipe right → applied | ★★★★☆ | Strong — candidate took action |
| **Bookmark** | **★★★☆☆** | **Positive but cautious — candidate wants to decide later** |
| Swipe right (no match) | ★★☆☆☆ | Positive intent, no employer reciprocity yet |
| Card dwell time >10s (no swipe) | ★☆☆☆☆ | Weak positive — ambiguity |
| Swipe left | ☆☆☆☆☆ (negative) | Avoid recommending similar |

**Recommendation:** Add `saved_jobs` as a feature input to the candidate-job relevance model. Bookmarked jobs should appear higher in the deck (but not at the very top — that's reserved for ML top-match).

### Vector Store

If the job description vector store is active, bookmarking a job can trigger a "find similar" background query and inject those results into the user's deck queue. **P2 — do not build this at MVP.** Just record the signal.

---

## 9. Open Questions (For Build Discussion)

1. **Where does the Saved Jobs tab live?**
   - Current candidate tabs: Deck, Applied, Matches, Profile, Settings (5 tabs)
   - **Option A:** Replace Settings tab with Saved Jobs tab. Settings moves to a gear icon within Profile.
   - **Option B:** Add a 6th tab. iOS/Android tab bars support up to 5 with labels (4 with labels + overflow on some Android skins). 6th would need an overflow "More" tab — not ideal.
   - **Option C:** Put Saved Jobs inside Profile as a sub-screen, with a bookmark icon badge on Profile tab.
   - *Recommendation:* **Option A** — Settings is the least-used tab for daily job seekers. Move the gear icon into Profile. Saved Jobs gets a dedicated tab with a star icon (⭐). Verify with analytics: if Settings has meaningful DAU, reconsider.

2. **Should saved jobs still appear in the swipe deck?**
   - Yes — they should appear normally. Bookmarking does not remove from the deck. The user might want to apply later when they see the card again. The bookmark icon simply shows "saved" state.
   - If the user has swiped left on a bookmarked job (unlikely — they'd unbookmark first), that's a conflict. Resolve by: left swipe does NOT auto-unbookmark. The user must unbookmark explicitly. This is rare enough that it's not worth UI complexity.
   - *Related:* Should the deck surface bookmarked jobs less frequently? **No** at MVP. If the user wants to see them again, they go to Saved. Revisit if users report "why am I seeing my saved jobs again?"

3. **What happens when a saved job is filled?**
   - **Recommendation:** Filled jobs remain in the Saved list but are visually distinguished. Show a small "Filled" badge or muted card with the note: "This position has been filled." The user can unbookmark or tap to see the detail (which confirms the status). Do NOT auto-remove — that would be jarring if they were planning to apply.

4. **Should employers see who saved their job?**
   - **MVP:** No — aggregate count only. Individual identity is P2, pending privacy/consent assessment.
   - **Risk:** If employers can see who saved, candidates may feel surveilled. The bookmark mechanic's low-friction value depends on anonymity. Don't break trust.
   - **Future:** If we add "Recruiter can send a message to candidate who saved their job" (like LinkedIn InMail to warm leads), that's a separate consent flow and P3.

5. **Should there be a maximum number of saved jobs?**
   - **Recommendation:** No hard limit at MVP. Practical limit emerges from database plpgsql array size and UI performance. If a user has 500+ saved jobs, they're not using the feature as intended — but no need to block them. Monitor distribution. If the top 1% has >200 saves, consider a soft limit (toast: "You've saved a lot of jobs — consider reviewing them!"). Hard limit of 500 as database safeguard (configurable server-side).

6. **Bookmark vs. star vs. heart — which icon?**
   - **Recommendation:** Star (☆/★). The heart emoji (❤️) is overloaded in swipe apps (Tinder = like). The bookmark/ribbon (🔖) is less mobile-native. The star is universally understood, visually distinct from swipe-right, and has clear fill/unfill state. May also use a save icon (💾) but that feels dated.
   - *Ensure the icon is recognisable at 24×24pt on the job card overlay.*
   - *Accessibility:* The icon should have an accessibility label ("Save job" / "Unsave job") so screen readers announce state changes.

7. **Bookmark from the job detail screen only (not from the deck card) — is that enough?**
   - **Recommendation:** Ship on both surfaces. The deck card is the primary discovery surface. Requiring a tap-through to detail just to bookmark adds friction. The star should be visible on the card at all times.

8. **Should the swipe-up gesture (Super Apply) on a bookmarked job auto-remove the bookmark?**
   - **Recommendation:** No — Super Apply is a separate action. The bookmark stays until explicitly removed or the user successfully applies (AC-08). A user might Super Apply and still want the job bookmarked for reference.

9. **Bookmark toggling from the job detail header — should it be a button or a gesture?**
   - **Recommendation:** Button (tap target). Gestures conflict with scrolling on the detail screen. Place it in the top-right corner of the job detail header, alongside any share icon.

10. **Does the saved_jobs table need a `notified` column?**
    - Reserved for future use when we send push notifications about saved jobs ("A job you saved just dropped to a lower salary — check it out!" or "Your saved job just received 10 new applicants"). Not for MVP. Include the column schema now with `default false` to avoid migration later, but don't build the notification logic at MVP.

---

## 10. Implementation Order

| Step | Description | Est. Effort |
|------|-------------|-------------|
| 1 | DB migration: `saved_jobs` table + RLS + indexes | 0.5d |
| 2 | `toggle-bookmark` Edge Function (or `rpc`) — atomic toggle | 0.5d |
| 3 | `useSavedJobs` hook — state management (optimistic toggle, sync, fetch) | 0.5d |
| 4 | Bookmark button component (star icon, animated, accessible) | 0.5d |
| 5 | Integrate bookmark button into `JobCard.tsx` (swipe deck) | 0.5d |
| 6 | Integrate bookmark button into job detail screen header | 0.5d |
| 7 | Saved Jobs screen — scrollable list, pull-to-refresh, sorted by saved_at desc | 1d |
| 8 | Empty state component | 0.25d |
| 9 | Tab navigation: Settings → Saved Jobs (Option A) | 0.25d |
| 10 | Employer-side: bookmark count on job detail | 0.5d |
| 11 | Handle expired/filled jobs in saved list | 0.5d |
| 12 | PostHog analytics events (5 new events) | 0.25d |
| 13 | Tests: unit + integration (toggle, RLS, edge cases) + UI component test | 1d |
| | **Total** | **~6.75d** |

---

## 11. Dependencies

- **No new external services** — Pure Supabase + FE changes
- **PostHog** — already instrumented — just add 5 new events
- **Supabase client** — already wired — just add `saved_jobs` table calls
- **Existing RLS infrastructure** — already wired, just add new policies
- **Debounce utility** — likely already exists or can use `lodash.debounce` for rapid-tap handling
- **No changes to swipe deck animation** — bookmark button is a separate tap target, does not interfere with gesture handler
- **No new push notifications** at MVP — but the `notified` column reserves space for future

---

## Appendix A: SQL Migration Blueprint

```sql
-- 202606070004_saved_jobs.sql

create table public.saved_jobs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) not null,
  job_id     uuid references public.jobs(id) not null on delete cascade,
  saved_at   timestamptz not null default now(),
  notified   boolean not null default false
);

alter table public.saved_jobs
  add constraint saved_jobs_unique_user_job
  unique (user_id, job_id);

alter table public.saved_jobs enable row level security;

create policy "saved_jobs_select_own"
  on public.saved_jobs for select
  using (user_id = auth.uid());

create policy "saved_jobs_insert_own"
  on public.saved_jobs for insert
  with check (user_id = auth.uid());

create policy "saved_jobs_delete_own"
  on public.saved_jobs for delete
  using (user_id = auth.uid());

create index idx_saved_jobs_user_id on public.saved_jobs(user_id);
create index idx_saved_jobs_job_id on public.saved_jobs(job_id);
create index idx_saved_jobs_saved_at on public.saved_jobs(saved_at desc);

-- RPC: toggle_bookmark
-- Returns { bookmarked: boolean }
create or replace function public.toggle_bookmark(p_job_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_exists  boolean;
begin
  if v_user_id is null then
    return json_build_object('error', 'Not authenticated', 'bookmarked', false);
  end if;

  select exists(
    select 1 from public.saved_jobs
    where user_id = v_user_id and job_id = p_job_id
  ) into v_exists;

  if v_exists then
    delete from public.saved_jobs
    where user_id = v_user_id and job_id = p_job_id;
    return json_build_object('bookmarked', false);
  else
    insert into public.saved_jobs (user_id, job_id)
    values (v_user_id, p_job_id);
    return json_build_object('bookmarked', true);
  end if;
end;
$$;

-- Employer aggregate: get bookmark count for a job
create or replace function public.get_bookmark_count(p_job_id uuid)
returns integer
language sql
security definer
stable
as $$
  select count(*)::integer
  from public.saved_jobs
  where job_id = p_job_id;
$$;
```

---

## Appendix B: Competitive Pattern Reference

| Platform | Bookmark UX | Key Insight for Hi-Hired |
|----------|------------|--------------------------|
| **LinkedIn** | "Save" button on job posts. Saved list in "My Jobs." Explicit apply flow from saved. | The standard. Saved → Applied funnel is well-understood. Mirror the UX pattern for familiarity. |
| **Indeed** | "Save" button on job cards. Saved list accessible from top nav. Email alerts when saved jobs are expiring. | Email alerts about saved jobs are high-engagement. Worth exploring at scale (P2). |
| **Seek** | "Shortlist" folder system. Can create multiple folders. | Folders are over-engineered for MVP. Single "Saved" list is sufficient until user research says otherwise. |
| **Tinder** | "Super Like" (swipe up) is the closest equivalent. No bookmark. | Tinder doesn't need bookmarks because matches are the destination. In job search, the destination is a hired outcome — bookmarks are a staging area. |
| **Airbnb** | "Wishlist" (heart icon). Trip-based grouping later. Saved list is heart icon tab in nav. | Best UX reference for Hi-Hired. Heart icon is immediately understood. Saved list is a single tap away from the main discovery surface. |

---

*End of Handoff. Questions → route to Alex for clarification.*
