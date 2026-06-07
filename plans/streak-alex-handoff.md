# Product Handoff: Daily Streak Feature

**Feature:** Daily Streak — Gamified Engagement Loop for Job Seekers
**Product Area:** Swipe Deck → Retention Engine
**Status:** ✍️ Validated — Ready for Implementation
**Priority:** HIGH — Next feature to ship
**Date:** 2026-06-07
**Author:** Alex (Product Research)

---

## 1. Validation: Why Daily Streak Is the Right Next Feature

### Current State Assessment

The MVP ships all core transactional flows: auth → swipe → match → chat → hired. What's missing is the **habit layer**. Users can complete their job-search goal and churn. Without a daily re-engagement mechanism, D7 retention targets (20% → 35%) are unachievable through product pull alone.

### Validation Against Remaining Options

| Candidate Feature | Why Not Now |
|---|---|
| Saved jobs/bookmarks | Squanders swipe-deck simplicity — if it's good, swipe right |
| Multiple circles | Premature before beachhead density is proven |
| Reputation/reviews | No completed hires to rate |
| Boost/paid tiers | Wait until demand is validated |
| Profile blocking/reporting | Must ship before store submission but is hygiene, not growth |
| Referral/invite programme | Weak without daily habit first — referred users churn too |

- **Asuria blast-swipe + provider portal** | In-flight per architecture audit; dependent on compliance consent work already queued |
- **Admin web dashboard** | Post-MVP; employer uses the app at launch |

**Verdict:** Daily Streak is the highest-impact, lowest-complexity investment for D7/D30 retention. Duolingo's run of 3.1B installed-base DAU growth proves the mechanic works for low-commitment daily actions. The Hi-Hired job seeker use-case maps cleanly: a 5-swipe daily habit takes <90 seconds. No other planned feature moves DAU and retention this directly this early.

### Risk Assessment

| Risk | Mitigation |
|---|---|
| Users find streaks gammy or patronising | Soft presentation — fire emoji, not badges/levels. Sympathetic break message. Opt-out? Not needed if tone is right. |
| Streak anxiety causes burnout | Threshold is intentionally low (5 swipes). 22:00 warning gives 2h buffer before midnight. |
| Engineering cost underestimated | Already scoped in SPEC.md (`update-streak` Edge Function, `streaks` table). Pure Supabase + trigger — no new infra. |
| Streak ignores recruiter side | Recruiter retention is driven by match velocity, not gamification. Streak is job-seeker-only at this stage. |

---

## 2. Feature Summary

A daily engagement loop that rewards consistent job-seeker activity (≥5 swipes/day) with streak visibility, milestone rewards, and a sympathetic reset on breakage. Inspired by Duolingo, adapted for job search behaviour.

**Target Behaviour:** Open Hi-Hired and swipe at least 5 times every day.

**Why 5 swipes?**
- Median session length for casual swipe UIs is 2–4 minutes
- 5 swipes ≈ 60–90 seconds — achievable during coffee, commute, waiting
- Too low (1–2) doesn't build habit depth; too high (10+) creates drop-off
- Pareto-converted threshold tested successfully by Tinder (daily active swiper metric)

---

## 3. User Stories (Candidate-Focused)

| ID | Story | Priority |
|---|---|---|
| STREAK-01 | As a job seeker, I want to see my current streak on the deck screen so I'm reminded to keep it going | P0 (MVP) |
| STREAK-02 | As a job seeker, I want to receive a push at 22:00 AEDT if I haven't swiped yet today so I can save my streak | P0 (MVP) |
| STREAK-03 | As a job seeker, I want to earn +2 Super Applies when I hit a 7-day streak so I have more visibility to recruiters | P0 (MVP) |
| STREAK-04 | As a job seeker, I want a "Active Seeker" profile badge at 30-day streak so employers know I'm serious | P1 (Ship with MVP or v1.1) |
| STREAK-05 | As a job seeker, I want my broken streak acknowledged sympathetically so I don't feel punished for missing a day | P0 (MVP) |
| STREAK-06 | As a job seeker, I want to see my longest streak somewhere accessible (e.g., profile) so I have a personal best to beat | P2 (Post-MVP) |
| STREAK-07 | As a new user, I don't want to see a "0-day streak" on my first visit so the first impression isn't empty | P0 (MVP) |
| STREAK-08 | As a returning user, I want the streak to respect my local timezone so I'm not penalised for travel | P1 (v1.1) |

---

## 4. Acceptance Criteria

### UI: Streak Indicator (Deck Header)

```
Given I am a job seeker on the swipe deck screen
When I have swiped ≥5 times today
Then I see "🔥 N-day streak" in the deck header (N = current_streak)

Given I have NOT yet swiped 5 times today
  AND I had a streak yesterday
Then I see "🔥 N-day streak" (same count from yesterday — still earnable today)

Given I have never swiped before (new user)
Then no streak text is shown

Given I broke my streak yesterday (last swipe was ≥2 days ago)
Then I see a subtle "Start a new streak?" message below the deck

Given I hit a milestone (7 or 30 days)
Then a one-time celebration overlay/toast appears: "🔥 7-day streak! +2 Super Applies earned"
```

### Push Notification: Streak at Risk

```
Given the time is 22:00 AEDT
  AND I have swiped <5 times today
  AND I had a streak yesterday (current_streak ≥1)
Then a push notification is sent: "🔥 Your streak is at risk — 5 quick swipes save it!"

Given the time is 22:00 AEDT
  AND I have swiped <5 times today
  AND I had NO streak yesterday (current_streak = 0)
Then no streak notification is sent

Given I open the app after receiving the notification
  AND I complete ≥5 swipes
Then the streak is preserved (current_streak incremented)
  AND the "at risk" state clears
```

### Reward: +2 Super Applies (7-Day Streak)

```
Given I reach a 7-day streak milestone
Then my daily Super Apply quota increases from 3 → 5 for that day
  AND a one-time notification/in-app celebration triggers
  AND the quota resets to 3 the next day (unless I hit another 7-day milestone)

Given I am on day 7 of a streak
  AND I break it on day 8
Then my Super Apply quota returns to 3
```

### Reward: "Active Seeker" Badge (30-Day Streak)

```
Given I reach a 30-day streak milestone
Then a new visual badge "Active Seeker" appears on my public profile
  AND remains visible as long as current_streak ≥30
  AND if the streak breaks, the badge is hidden (not revoked — hidden)
  AND the badge reappears if I rebuild to 30
```

### Streak Reset / Break

```
Given I swipe ≥5 times on day N
  AND I swipe 0 times on day N+1
  AND I swipe ≥5 times on day N+2
Then current_streak resets to 1 (not N+1)

Given my streak breaks
Then on next deck visit I see: "Your streak reset — start a new one today?" (sympathetic, no shame)
```

### Timezone Handling (Future — P1)

```
Given a user's device timezone is UTC-7 (Pacific)
  AND local midnight passes for that timezone
  AND the user has swiped ≥5 times in the last 24h by their local clock
Then the streak should increment per the user's active timezone

Given the user travels across timezones
Then the streak uses the last-seen timezone from device locale
  AND falls back to AEDT if timezone is unavailable
```

---

## 5. Data Model & Schema

### New Table: `streaks`

```sql
create table public.streaks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) not null unique,
  current_streak  integer not null default 0,
  longest_streak  integer not null default 0,
  last_swipe_date date                    -- UTC date of last qualifying swipe
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- RLS
alter table public.streaks enable row level security;
create policy "streaks_own" on public.streaks
  for all using (user_id = auth.uid());

-- Index for cron queries (22:00 AEDT batch)
create index idx_streaks_last_swipe_date on public.streaks(last_swipe_date);
```

### New Migration: `202606070003_streaks.sql`

### Edge Function: `update-streak`

- **Trigger:** `swipes` INSERT (after each right or left swipe)
- **Logic:**
  1. Fetch user's `swipes` count for today (UTC date at swipe time)
  2. If count = 5 (threshold hit):
     - Upsert `streaks`: increment `current_streak` if consecutive day, reset if gap
     - Update `longest_streak` if `current_streak` exceeds it
     - Update `last_swipe_date`
  3. If count is any other value, no-op (performance: skip write)
- **Returns:** void (fire-and-forget)
- **Performance:** Must complete in <200ms. Add `FOR EACH STATEMENT` trigger, not per-row.

### Edge Function: `streak-at-risk-notification`

- **Cron:** 22:00 AEDT daily (11:00 UTC April–October; 12:00 UTC October–March)
- **Logic:**
  1. Query `streaks` where `last_swipe_date < today()` AND `current_streak >= 1`
  2. Batch-push via OneSignal: "🔥 Your streak is at risk — 5 quick swipes save it!"
  3. Respect existing notification preferences (can be disabled)

---

## 6. Success Metrics

### Retention Targets (With Streak)

| Metric | Current Baseline (Est.) | Month 3 Target | Month 6 Target |
|--------|------------------------|----------------|----------------|
| D7 Retention (candidates) | ~10-15% (organic) | 20% → **28%** | **35%** |
| D30 Retention (candidates) | ~5-8% (organic) | 10% → **16%** | **22%** |
| DAU/MAU ratio | ~12% | **18%** | **25%** |
| Swipes per session | 8 | **10** | **12** |
| Sessions per week | 2.5 | **3.5** | **4.5** |

**Predicted DAU Impact:**
- 1,000 MAU → 180 DAU at 18% ratio (without streak) → ~270 DAU with streak (conservative lift of 50% from daily re-engagement mechanics)

### North Star Proxy

**% of weekly actives with active streak (≥3 consecutive days)** — if >40% of weekly actives hold a streak, the mechanic is working.

### Key Tracking Events

```typescript
// Add to PostHog analytics plan:
posthog.capture('streak_milestone_reached', {
  streak_length: number,        // 7 | 30 | 60 | 90
  user_id: string,
  reward_claimed: string | null // 'super_applies' | 'badge' | null
})

posthog.capture('streak_broken', {
  previous_length: number,
  days_since_last_swipe: number
})

posthog.capture('streak_at_risk_notification_sent', {
  user_id: string,
  current_streak: number,
  time_to_midnight_minutes: number
})

posthog.capture('streak_saved', {
  user_id: string,
  was_at_risk: boolean   // true if notification had been sent that day
})
```

---

## 7. Edge Cases

| Edge Case | Handling |
|---|---|
| **New user, first session** | No streak shown. Wait until first qualifying day (≥5 swipes). |
| **Midnight boundary** | Streak increments once per UTC date. If user swipes 3 times at 23:59 UTC and 2 at 00:01 UTC — that's 2 separate days. Both count. |
| **App background + swipe from notification** | If user taps streak-notification and completes 5 swipes before midnight, streak preserved. |
| **Timezone mismatch** | P0 uses UTC internally with AEDT display. P1 adds device timezone detection. |
| **Multiple devices** | Streak is DB-backed, not device-local. Same user, same streak. |
| **User deletes account** | Cascade delete the streak row. |
| **User hasn't swiped in 30+ days** | Streak is 0, longest_streak preserved. No shame message needed after long absence — just fresh start. |
| **Streak freeze / grace day** | Intentionally excluded from MVP. Adds complexity (what counts as freeze? how is it earned?). Revisit at 10k MAU. |
| **User at 6 swipes one day, 4 the next** | Day N counts as streak day. Day N+1 does not. Streak breaks. Threshold is ≥5 every day. |
| **Bulk-swipe on behalf of provider (Asuria)** | If `bulk_swipe_consent` is active, provider swipes do NOT count toward the candidate's streak. Streak is self-initiated behaviour only. |
| **Backfill existing users** | All existing users start with streak = 0. No backfill. The feature activates on next swipe. |
| **Super Apply (swipe-up)** | Does count toward the 5-swipes threshold. Same as right-swipe. |

---

## 8. Open Questions (For Build Discussion)

1. **Active Seeker badge at 30 days — should it persist if streak drops below 30 but user is still active?**
   - Proposal: yes, badge remains for 7 days after streak ends, then is hidden. Prevents overnight badge loss anxiety.

2. **Should the streak indicator be visible on the deck screen only, or also in the profile/top bar?**
   - Proposal: Deck only for MVP. Profile badge visible once 30-day badge earned. Keep it simple.

3. **Push at 22:00 AEDT — should it link to the deck?**
   - Yes — deep link to `hi-hired://deck` so one tap starts swiping.

4. **+2 Super Applies at 7 days — does it stack?**
   - No stacking. If user reaches 14 days, they still get +2 that day (not +4). The milestone is a win, not a snowball.

5. **Day 0 — user signs up at 23:00 and swipes 5 times before midnight. Does day 1 start tomorrow?**
   - Yes. The swipe counts as day 1 of streak. Tomorrow is day 2 if they swipe 5+ times. No double-dip.

6. **Should streaks reset if a user gets hired and stops swiping?**
   - Intentionally no. The streak measures daily engagement, not job-search status. Hiring success is orthogonal.

7. **Cooldown timer for streak-at-risk notification?**
   - One per day per user. No repeat if the user already swiped 5+ times that day. If they swipe 4 times and stop, one notification at 22:00.

---

## 9. Implementation Order

| Step | Description | Est. Effort |
|------|-------------|-------------|
| 1 | DB migration: `streaks` table + RLS + index | 0.5d |
| 2 | `update-streak` Edge Function (trigger on `swipes` INSERT) | 1d |
| 3 | Deck header streak indicator (`useStreak` hook → display component) | 0.5d |
| 4 | `streak-at-risk-notification` cron Edge Function (22:00 AEDT) | 1d |
| 5 | Milestone: 7-day reward logic (+2 Super Applies) | 1d |
| 6 | Milestone: 30-day "Active Seeker" badge (profile display) | 1d |
| 7 | Streak-broken sympathetic message on deck | 0.5d |
| 8 | PostHog analytics events (5 new events) | 0.5d |
| 9 | Tests: unit + integration (streak logic, trigger, cron) | 1d |
| | **Total** | **~7d** |

---

## 10. Dependencies

- **OneSignal / push infra** — already wired (`NOTIFICATIONS.md`)
- **Supabase cron** — cron Edge Function for 22:00 AEDT streak-at-risk broadcast
- **PostHog** — already instrumented — just add new events
- **No new external services** — Pure Supabase + FE changes
- **Super Apply quota system** — must support dynamic quota override (already discussed in codebase as `super_applies_remaining`)

---

## Appendix: Competitive Pattern Reference

| App | Streak Threshold | Reward | Key Insight for Hi-Hired |
|-----|-----------------|--------|---------------------------|
| Duolingo | 1 lesson/day | Streak freeze, gems, leaderboard | Low threshold wins. Make it hard to lose. |
| Tinder | N/A (dau metric) | No explicit streak | Implicit — "your turn" re-engagement. Hi-Hired can add explicit. |
| Snapchat | 1 snap/day each way | Streak count, fire emoji | Social pressure works but Hi-Hired is single-player. No ghosting anxiety. |
| Headspace | 1 session/day | Streak count, milestones | Job search maps to self-improvement framing better than social. |

---

*End of Handoff. Questions → route to Alex for clarification.*
