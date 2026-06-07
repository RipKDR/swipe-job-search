# Sam Handoff: Daily Streak — QA, Analytics & Release Readiness

**Author:** Sam (QA + Release + Analytics + Growth Operations)
**Date:** 2026-06-07
**Target:** Hi-Hired — Expo/React Native mobile app + Supabase backend
**Feature:** Daily Streak — Gamified Engagement Loop for Job Seekers

**Related docs:**
- [Product Handoff](streak-alex-handoff.md)
- [UX Handoff](streak-maya-handoff.md)
- [Architecture Handoff](streak-jordan-handoff.md)
- [Migration](file:///home/admin/swipe-job-search/supabase/migrations/202606070003_streaks.sql)

---

## Table of Contents

1. [QA Test Plan](#1-qa-test-plan)
   - [Functional Tests](#11-functional-tests)
   - [Edge Cases](#12-edge-cases)
   - [Regression Tests](#13-regression-tests)
   - [Automated Test Plan (Vitest)](#14-automated-test-plan)
   - [Accessibility Tests](#15-accessibility-tests)
   - [Performance Tests](#16-performance-tests)
   - [Security Tests](#17-security-tests)
2. [Analytics Event Schemas](#2-analytics-event-schemas)
   - [Event Definitions](#21-event-definitions)
   - [Implementation Guidance](#22-implementation-guidance)
3. [Success Criteria Checklist](#3-success-criteria-checklist)
4. [Release Notes Draft](#4-release-notes-draft)

---

## 1. QA Test Plan

### 1.1 Functional Tests

#### 1.1.1 Streak Indicator Display

| ID | Scenario | Prerequisites | Steps | Expected Result | Priority | Type |
|----|----------|---------------|-------|-----------------|----------|------|
| STREAK-FUNC-001 | New user — no swipe history | Fresh auth, no rows in `streaks` table | 1. Sign up as new candidate<br>2. Navigate to deck screen | Streak indicator is not shown (no flame, no count). Subtle prompt: "Swipe 5 jobs today to start your streak 🔥" | P0 | Manual + Automated |
| STREAK-FUNC-002 | 1-day active streak | User with `current_streak=1`, today 5 swipes completed | 1. Open app<br>2. View deck header | Shows "🔥 1-day streak" with 5 filled dots. Flame emoji visible. | P0 | Automated |
| STREAK-FUNC-003 | 3-day streak | User with `current_streak=3`, today 2 swipes completed | 1. Open app<br>2. View deck header | Shows "🔥 3-day streak" with 2 filled dots + 3 empty. Counter reads "2/5 swipes today". | P0 | Automated |
| STREAK-FUNC-004 | 7-day streak (non-milestone day) | User with `current_streak=7`, milestone already celebrated | 1. Open app<br>2. View deck header | Shows "🔥 7-day streak". Super Apply limit shows 5 (not 3). | P1 | Manual |
| STREAK-FUNC-005 | 30-day streak | User with `current_streak=30` | 1. Open app<br>2. View deck header | Shows "🔥 30-day streak". Profile shows Active Seeker badge. | P1 | Manual |
| STREAK-FUNC-006 | Streak count formatting | `current_streak = 100` | 1. Seed DB with streak=100<br>2. Open app | Shows "🔥 100-day streak". No truncation. | P2 | Automated |

#### 1.1.2 Swipe Counter Increment

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| STREAK-FUNC-010 | Right swipe increments counter | 1. Open deck with streak data loaded<br>2. Swipe right on a job card | `todaySwipes` increments by 1. Progress dot fills with bounce animation. Haptic feedback fires. AsyncStorage value for `streak_today_swipes` updated. | P0 |
| STREAK-FUNC-011 | Left swipe (dislike) increments counter | 1. Open deck<br>2. Swipe left on a job card | Counter increments by 1. Same as right swipe. | P0 |
| STREAK-FUNC-012 | Super Apply (swipe-up) increments counter | 1. Open deck (super applies available)<br>2. Swipe up on a job card | Counter increments by 1. | P0 |
| STREAK-FUNC-013 | Counter caps at 5 | 1. Swipe 5 times<br>2. Swipe 6th time | Counter stays at 5. Ring/dots show as full green. 6th swipe does NOT increment further. AsyncStorage stays at "5". | P0 |
| STREAK-FUNC-014 | Rollback on swipe failure | 1. Swipe triggers but API call fails<br>2. Optimistic increment happened | Counter decrements back by 1. Dot animation reverses. Error toast shown. | P0 |
| STREAK-FUNC-015 | Rollback at 0 does not go negative | 1. First swipe fails before any success<br>2. rollbackSwipe() called | Counter stays at 0. No negative values. | P0 |

#### 1.1.3 Streak Persistence at 5 Swipes

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| STREAK-FUNC-020 | 5th swipe today preserves streak | 1. User has active streak (e.g., 4 days)<br>2. Swipe 5 times today | `update-streak` Edge Function fires. `upsert_streak()` RPC called. `current_streak` incremented (or first-day insert). Response from DB reflects `action: 'incremented' or 'created'`. | P0 |
| STREAK-FUNC-021 | Streak not shown as broken after completing 5 swipes | 1. User completes 5 swipes today<br>2. Close and reopen app | Streak still visible, same count (not reset). No broken sheet. | P0 |
| STREAK-FUNC-022 | <5 swipes does NOT trigger Edge Function | 1. Swipe 1–4 times | `update-streak` Edge Function still fires (fire-and-forget on every swipe) but `upsert_streak` reflects `noop_same_day` or no change. Streak row is not modified. | P0 |

#### 1.1.4 Day Boundary Handling (AEDT Midnight)

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| STREAK-FUNC-030 | Midnight AEDT — streak increments | 1. User has 4 today swipes at 23:59 AEDT<br>2. Clock passes midnight<br>3. User opens app at 00:05 AEDT | `initializeStreak` detects day change. `todaySwipes` resets to 0. If yesterday had 4 swipes (<5): streak broken. If yesterday had 5: Edge Function handles increment, `current_streak` reflects previous+1. | P0 |
| STREAK-FUNC-031 | Midnight with 5 swipes yesterday — streak preserved | 1. Yesterday: 5 swipes completed, streak=3<br>2. Open app today | `getTodayDateAEDT()` returns new date. AsyncStorage reset. No broken sheet. `current_streak=4` (if already synced) or still 3 (if Edge Function hasn't fired yet — eventual consistency). | P0 |
| STREAK-FUNC-032 | Midnight with 4 swipes yesterday — streak broken | 1. Yesterday: 4 swipes, streak=3<br>2. Open app today | Broken sheet shows. Message: "You were at 3 days. Start a new streak today with 5 quick swipes!" `current_streak=0` on next Edge Function sync. | P0 |
| STREAK-FUNC-033 | User swiping across midnight boundary | 1. 23:58 AEDT: swipe 3 times<br>2. 00:02 AEDT: swipe 2 more times | Day 1: 3 swipes (<5). Day 2: 2 swipes. No streak row change for day 1. Day 2 row created when 5th swipe triggers Edge Function on day 2. Both are separate calendar days. | P1 |

#### 1.1.5 Streak Broken UX

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| STREAK-FUNC-040 | Broken sheet appears on first open after missed day | 1. Active streak >0<br>2. Miss a full day (0 swipes)<br>3. Open app on day after missed day | `StreakBrokenSheet` shows as modal/bottom-sheet. Sympathetic emoji (😔) and message visible. "Start new streak" and "Maybe later" CTAs present. | P0 |
| STREAK-FUNC-041 | "Start new streak" navigates to deck | 1. Broken sheet visible<br>2. Tap "Start new streak" | Sheet dismisses. Deck scrolls to top. Counter resets to 0. "0-day streak" shown. | P0 |
| STREAK-FUNC-042 | "Maybe later" dismisses for today | 1. Broken sheet visible<br>2. Tap "Maybe later" | Sheet dismisses with animation. AsyncStorage key `streak_broken_dismissed_{date}` set to `"true"`. Sheet does NOT reappear today. | P0 |
| STREAK-FUNC-043 | Broken sheet does not show if dismissed today already | 1. Dismissed sheet earlier today<br>2. Background + reopen app | Sheet is suppressed. Normal deck screen shown. | P0 |
| STREAK-FUNC-044 | Broken sheet does NOT show for new users (no prior streak) | 1. Newly registered user<br>2. Open app for first time | No broken sheet. Empty streak indicator shown. | P0 |

#### 1.1.6 7-Day Milestone

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| STREAK-FUNC-050 | 7-day milestone overlay appears | 1. User on day 6 of streak (swipe 5 times today)<br>2. On day 7, complete 5 swipes | After 5th swipe, `update-streak` triggers `upsert_streak(action='incremented', current_streak=7)`. Frontend detects milestone. `StreakMilestoneOverlay` shows: "🔥 7-Day Streak!" + "You earned +2 Super Applies!". Confetti particles animate. | P0 |
| STREAK-FUNC-051 | +2 Super Apply bonus toast appears | 1. Milestone overlay acknowledged<br>2. Wait 500ms | `StreakSuperApplyBonus` toast slides up: "✨ +2 Super Applies earned!". Shows for 4 seconds. Dismissable. | P0 |
| STREAK-FUNC-052 | Super Apply daily limit increases from 3 to 5 | 1. 7-day streak milestone reached | AsyncStorage key `super_apply_streak_bonus` = `"true"`. `getSuperApplyRemaining()` returns `5` instead of `3`. Super Apply UI reflects 5 remaining (or remaining after use). | P0 |
| STREAK-FUNC-053 | +2 bonus is daily as long as streak ≥7 | 1. User on day 8 with streak active<br>2. Check Super Apply limit | Bonus key is set. Limit remains 5. Not a one-time bonus — active daily for streak≥7. | P1 |
| STREAK-FUNC-054 | 7-day overlay only shows once per occurrence | 1. Milestone overlay dismissed<br>2. Close + reopen app same day | Overlay does NOT reappear. AsyncStorage flag `streak_milestone_7_{date}` prevents re-showing. | P0 |
| STREAK-FUNC-055 | 7-day does NOT fire again at 14, 21 days | 1. User at 14-day streak<br>2. Complete 5 swipes | No overlay. No bonus toast (already active). No duplicate event. | P1 |

#### 1.1.7 30-Day Milestone

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| STREAK-FUNC-060 | 30-day milestone overlay appears | 1. User on day 29 of streak<br>2. On day 30, complete 5 swipes | After 5th swipe, `upsert_streak` returns `action='incremented', current_streak=30`. `sync_streak_to_profile()` called — sets `active_seeker_badge_earned=true`. `StreakMilestoneOverlay` shows: "🏆 30-Day Streak!" + "You unlocked the Active Seeker badge!". Gold confetti. | P0 |
| STREAK-FUNC-061 | Active Seeker badge visible on profile | 1. After 30-day milestone overlay dismissed<br>2. Navigate to profile tab | `ActiveSeekerBadge` component renders below name/subtitle: "🏆 Active Seeker". Trophy emoji visible. | P0 |
| STREAK-FUNC-062 | Badge persists after streak drops below 30 | 1. Badge earned at 30 days<br>2. Streak drops to 15<br>3. View profile | Badge shows as greyed-out: "🏆 Active Seeker (maintain your streak)". Still present but muted. | P1 |
| STREAK-FUNC-063 | Badge re-earned after rebuilding to 30 | 1. Badge earned, then dropped<br>2. Rebuild to 30 days<br>3. View profile | Badge returns to full color. No duplicate overlay (milestone flag per date). | P1 |

#### 1.1.8 At-Risk Banner (22:00+ AEDT)

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| STREAK-FUNC-070 | At-risk banner visible at 22:00+ with <5 swipes | 1. Mock system time to 22:30 AEDT<br>2. Have active streak >=1<br>3. Have <5 swipes today<br>4. Open app | Amber/orange banner slides in below StreakIndicator: "⏰ Streak at risk! You need X more swipes before midnight." "Swipe now" CTA + dismiss (✕) button visible. | P0 |
| STREAK-FUNC-071 | "Swipe now" navigates to deck top | 1. Banner visible<br>2. Tap "Swipe now" | Deck scrolls to top (or banner dismissed, deck in normal state with focus on first card). | P0 |
| STREAK-FUNC-072 | Banner dismisses on first swipe | 1. Banner visible<br>2. Swipe once | `incrementSwipes()` fires. `atRisk` set to false. Banner animates out (slide up). | P0 |
| STREAK-FUNC-073 | Dismiss persists for the day | 1. Banner visible<br>2. Tap ✕ dismiss | Banner slides up. AsyncStorage `streak_at_risk_dismissed_{date}` = `"true"`. Banner does NOT reappear rest of day. | P0 |
| STREAK-FUNC-074 | No banner if 5+ swipes today | 1. Complete 5 swipes before 22:00 | No banner at 22:00. `atRisk` remains false. | P0 |
| STREAK-FUNC-075 | No banner if current_streak = 0 | 1. No active streak (new user or broken)<br>2. 22:15 AEDT, 0 swipes | No at-risk banner. No push notification. Streak of 0 means nothing to lose. | P0 |
| STREAK-FUNC-076 | Banner does not auto-show at 22:00 if app is in foreground with 5 swipes | 1. App open at 21:55 with 5 swipes<br>2. Clock passes 22:00 | Banner remains hidden. No state change. | P1 |

#### 1.1.9 At-Risk Push Notification (22:00 AEDT Cron)

| ID | Scenario | Prerequisites | Steps | Expected Result | Priority |
|----|----------|---------------|-------|-----------------|----------|
| STREAK-FUNC-080 | Push fires at 22:00 AEDT for at-risk users | `streak-at-risk-check` cron deployed | 1. Have a user with streak>=1 and <5 swipes today<br>2. Wait for 22:00 AEDT cron trigger | Push notification received: title "🔥 Streak at risk!", body "You need X more swipe(s) to keep your N-day streak." Deep link `hi-hired://deck`. | P0 |
| STREAK-FUNC-081 | No push if streak=0 | User with no streak | Same cron run | No push sent for this user. Edge Function filters by `current_streak >= 1`. | P0 |
| STREAK-FUNC-082 | No push if notification preference disabled | User with `streak_reminder` disabled | Same cron run | Edge Function checks `notification_preferences`. Push skipped. | P0 |
| STREAK-FUNC-083 | Push deep link opens deck screen | Push received | 1. Tap push notification | App opens (or foregrounds) on deck screen. Streak state loaded. Banner visible if still at-risk. | P0 |
| STREAK-FUNC-084 | Push sends only once per user per day | User at-risk | 1. Cron fires at 22:00<br>2. User doesn't open app<br>3. No re-trigger until next day | Only one notification sent per at-risk day. No duplicate. | P0 |
| STREAK-FUNC-085 | DST transition handled | During AEDT→AEST switch | 1. Verify cron schedule changes | Correct UTC offset used. Two cron schedules as documented. Manual swap twice a year. | P2 |

#### 1.1.10 Super Apply Integration

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| STREAK-FUNC-090 | Super Apply limit is 3 by default (no streak) | 1. New user with streak=0<br>2. Open deck<br>3. Check Super Apply counter | Shows 3 Super Applies remaining. | P0 |
| STREAK-FUNC-091 | Super Apply limit is 5 when streak ≥7 | 1. User at 7+ day streak<br>2. Open deck<br>3. Check Super Apply counter | Shows 5 Super Applies remaining. | P0 |
| STREAK-FUNC-092 | Limit returns to 3 when streak breaks | 1. User breaks 7-day streak<br>2. Open deck next session | Super Apply counter shows 3. `super_apply_streak_bonus` key removed on streak reset. | P0 |
| STREAK-FUNC-093 | Super Apply bonus resets daily (same as normal SA limit) | 1. Day 7: used 4 Super Applies<br>2. Day 8: streak≥7<br>3. Open deck | Shows 5 remaining for day 8 (not 1). Normal daily reset applies. | P1 |

### 1.2 Edge Cases

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| STREAK-EDGE-001 | New user signs up at 23:30 AEDT, swipes 5 before midnight | 1. Register at 23:30 AEDT<br>2. Swipe 5 times before 00:00 | Streak row created with `current_streak=1`, `last_swipe_date=today (UTC)`. After midnight: user must swipe 5 more times on new day to increment. Day 1 established. No double-dip. | P0 |
| STREAK-EDGE-002 | User in Perth (UTC+8) — notification timing | 1. User's device in AWST<br>2. App uses AEDT (MVP) | Push arrives at 22:00 AEDT = 20:00 AWST. Acceptable. Banner logic uses AEDT hour check. | P1 |
| STREAK-EDGE-003 | User travels across timezones (SYD→LAX) | 1. Streak active in AEDT<br>2. Travel to UTC-8<br>3. Open app | `getTodayDateAEDT()` still uses AEDT (MVP). Streak logic unchanged until P1 device timezone detection. Could cause off-by-one if day change happens in LA while AEDT is same day. | P1 |
| STREAK-EDGE-004 | App backgrounded, reopened at midnight AEDT | 1. App open at 23:55 AEDT with 3 swipes<br>2. Background app<br>3. Reopen at 00:05 AEDT | `initializeStreak` detects day change. `todaySwipes` reset to 0. If previous day <5: streak broken sheet shown. | P0 |
| STREAK-EDGE-005 | App backgrounded, reopened same day | 1. App open at 14:00 with 2 swipes<br>2. Background app<br>3. Reopen at 16:00 same day | State restored from AsyncStorage. `todaySwipes=2` persisted. No day change detected. Continue from 2. | P0 |
| STREAK-EDGE-006 | Asuria bulk swipes do NOT count | 1. User has `bulk_swipe_consent` active<br>2. Provider bulk-swipes on user's behalf | Edge Function (or swipe handler) checks for bulk_swipe_consent. Those swipes are excluded from COUNT. Streak not impacted. | P0 |
| STREAK-EDGE-007 | Device restored from backup | 1. User gets new phone<br>2. Restore from backup<br>3. Open app | AsyncStorage may restore old streak data. On `initializeStreak`, Supabase fetch overrides local cache. Trust server. | P1 |
| STREAK-EDGE-008 | Multiple rapid swipes (race condition) | 1. User rapidly swipes 5+ cards in <1s | Each swipe triggers fire-and-forget to Edge Function. `upsert_streak` is idempotent — handles duplicate calls safely. AsyncStorage increment is atomic per call (`useState` batching may batch). Worst case: counter shows 4 instead of 5 temporarily. Next render correction. | P0 |
| STREAK-EDGE-009 | Offline: streak state from AsyncStorage | 1. Enable airplane mode<br>2. Swipe 5 times offline<br>3. Disable airplane mode | `todaySwipes` incremented in AsyncStorage. Edge Function calls fail silently. When connectivity returns, next swipe triggers Edge Function with current count. If count≥5 by then, streak updated. No data loss. | P0 |
| STREAK-EDGE-010 | Edge Function cold start delay | 1. No recent invocations<br>2. User swipes | Edge Function cold starts (<200ms budget). Function returns 204. Swipe UX unaffected (fire-and-forget). Streak may update a few seconds later. | P0 |
| STREAK-EDGE-011 | 5 swipes in one session, 0 in another, same day | 1. Morning: 5 swipes, streak preserved<br>2. Evening: open app | Streak already secured. Indicator shows completed. No change. | P0 |
| STREAK-EDGE-012 | User deletes account | 1. Delete account flow | `ON DELETE CASCADE` on `profiles` → streak row removed. Clean. | P0 |
| STREAK-EDGE-013 | Longest streak freeze at high number | 1. Streak reaches 365 days<br>2. Streak breaks | `longest_streak` = 365 preserved. `current_streak` resets to 1. | P2 |
| STREAK-EDGE-014 | Loading state with slow network | 1. Enable slow network throttle (3G)<br>2. Open deck | Skeleton shimmer for StreakIndicator. After 2s: shows "Loading streak..." text. Swipes still work during load. | P0 |
| STREAK-EDGE-015 | Complete network failure on init | 1. Enable airplane mode<br>2. Open deck (cold start) | AsyncStorage streak cache loaded. If no cache: streak shows 0/0. No blocking. Toast: "Can't load streak data. Your swipes are still being saved." | P0 |
| STREAK-EDGE-016 | AsyncStorage corruption | 1. Manually corrupt a streak storage key to non-numeric | On parse failure, `initializeStreak` catches error. Falls back to 0/empty. Re-fetches from server. Writes corrected values. | P1 |
| STREAK-EDGE-017 | Milestone at exactly 7 or 30 on consecutive days | 1. Day 7: reached 5 swipes<br>2. Day 8: reached 5 swipes (now current_streak=8) | Milestone flags per date prevent overlay re-showing. No duplicate celebration. | P1 |
| STREAK-EDGE-018 | User with multiple device sessions | 1. Phone: streak=5, todaySwipes=3<br>2. Tablet: streak=5, todaySwipes=0 (not used today) | Both devices share same Supabase streak row. AsyncStorage is per-device. If tablet reads before phone syncs, may show stale data momentarily. Eventually consistent. | P1 |

### 1.3 Regression Tests

| ID | Scenario | Steps | Priority |
|----|----------|-------|----------|
| STREAK-REGR-001 | Existing 220 tests must still pass | Run full test suite: `npx vitest run` | P0 |
| STREAK-REGR-002 | Swipe deck still works (left swipe) | Verify existing left-swipe flow: card animates off, next card appears, swipe recorded in DB | P0 |
| STREAK-REGR-003 | Swipe deck still works (right swipe) | Verify existing right-swipe flow: like recorded, potential match logic | P0 |
| STREAK-REGR-004 | Swipe deck still works (Super Apply) | Verify existing Super Apply flow: swipe-up, quota decremented | P0 |
| STREAK-REGR-005 | Chat functionality unaffected | Open chat, send message, receive message — all existing flows work | P0 |
| STREAK-REGR-006 | Match flow unaffected | Right-swipe leads to match notification, chat opens | P0 |
| STREAK-REGR-007 | Job posting (employer side) unaffected | Employer can create/edit/pause/reactivate jobs | P0 |
| STREAK-REGR-008 | Auth flow unaffected | Login, signup, logout, token refresh all work | P0 |
| STREAK-REGR-009 | Profile screen unaffected except new badge | All existing profile fields, verification badge, edit functionality still work | P0 |
| STREAK-REGR-010 | Notification preferences unaffected | Existing notification types (chat, match) still toggle correctly. New `streak_reminder` option added without breaking existing. | P0 |
| STREAK-REGR-011 | Push notification infrastructure | Existing push notifications (new match, chat message) still fire | P1 |
| STREAK-REGR-012 | Realtime subscriptions (chat, match) still work | New messages appear in realtime, match indicator updates | P0 |
| STREAK-REGR-013 | Theme system unaffected | All 5 accent themes render deck screen correctly with new streak components | P1 |
| STREAK-REGR-014 | Offline mode (non-streak) | Existing offline behavior (cached deck, queued swipes) unchanged | P1 |
| STREAK-REGR-015 | Super Apply original quota test | Without streak: Super Apply limit remains 3. No side-effects on legacy path. | P0 |

### 1.4 Automated Test Plan (Vitest)

#### New test files to create

| Test File | Location | Est. Tests | Description |
|-----------|----------|-----------|-------------|
| `useStreak.test.ts` | `hooks/__tests__/` | 15-20 | Unit tests for `useStreak` hook logic |
| `streak.test.ts` | `lib/__tests__/` | 8-12 | Unit tests for `lib/streak.ts` helpers |
| `StreakIndicator.test.tsx` | `components/streak/__tests__/` | 6-8 | Component render tests for streak indicator |

#### `lib/__tests__/streak.test.ts` — Proposed Tests

```typescript
// describe('getTodayDateAEDT')
//  - returns YYYY-MM-DD format
//  - returns valid date string
//  - does not throw
//
// describe('getYesterdayDateAEDT')
//  - returns date one day before getTodayDateAEDT()
//  - returns YYYY-MM-DD format
//
// describe('getCurrentHourAEDT')
//  - returns 0-23 integer
//  - does not throw
//
// describe('STORAGE_KEYS')
//  - all keys have streak_ prefix
//  - all values are non-empty strings
```

#### `hooks/__tests__/useStreak.test.ts` — Proposed Tests

```typescript
// describe('initialization')
//  - loads todaySwipes from AsyncStorage
//  - loads currentStreak from AsyncStorage cache
//  - fetches streak data from Supabase on mount
//  - sets isLoading=true initially, false after load
//  - handles AsyncStorage read error gracefully (falls back to 0)
//  - handles Supabase error gracefully (sets error state)
//  - detects day change on init (yesterday vs today)
//  - detects midnight crossing with yesterday swipes < 5 (sets streakBroken)
//  - detects midnight crossing with yesterday swipes >= 5 (no broken)
//  - new user: shows empty state (currentStreak=0, todaySwipes=0)
//  - at-risk detection at 22:00+ AEDT with <5 swipes (sets atRisk=true)
//  - at-risk not set if dismissed already today
//
// describe('incrementSwipes')
//  - increments todaySwipes by 1
//  - caps at 5
//  - persists to AsyncStorage
//  - fires fire-and-forget to update-streak Edge Function
//  - clears atRisk flag
//  - does not call Edge Function if increment fails
//  - detects 7-day milestone when currentStreak+1 >= 7 and todaySwipes=5
//
// describe('rollbackSwipe')
//  - decrements todaySwipes by 1
//  - does not go below 0
//  - persists decremented value to AsyncStorage
//
// describe('dismissal actions')
//  - clearMilestone: sets streakMilestone to null
//  - dismissBroken: sets streakBroken to false, writes AsyncStorage flag
//  - dismissBonus: sets bonusEarned to false
//  - dismissAtRisk: sets atRisk to false, writes AsyncStorage flag
//
// describe('utility methods')
//  - remainingSwipes: returns 5 - todaySwipes (min 0)
//  - daysUntilNextMilestone: returns correct count for streak <7
//  - daysUntilNextMilestone: returns correct count for 7-29
//  - daysUntilNextMilestone: returns null for 30+
```

#### `components/streak/__tests__/StreakIndicator.test.tsx` — Proposed Tests

```typescript
// describe('render states')
//  - renders flame emoji and streak count
//  - shows correct number of filled/empty progress dots
//  - shows "N-day streak" text
//  - shows "Today's streak secured!" when 5/5
//  - shows skeleton on loading state
//  - shows error state with retry when error is set
//  - renders nothing (null) for brand-new user (currentStreak=0)
//  - renders subtle prompt for currentStreak=0 (encouragement text)
```

#### Test mocks needed

```typescript
// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
        })),
      })),
    })),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock Reanimated (if needed for component tests)
// Mock expo-haptics
// Mock PostHog (usePostHog)
```

### 1.5 Accessibility Tests

| ID | Scenario | Check | Priority |
|----|----------|-------|----------|
| STREAK-A11Y-001 | StreakIndicator screen reader | `accessibilityLabel` reads: "Streak: {count} days. You've completed {todaySwipes} of {dailyTarget} swipes today." Verify with TalkBack/VoiceOver. | P0 |
| STREAK-A11Y-002 | Progress dots accessibility | `accessibilityValue={{ min: 0, max: 5, now: todaySwipes }}` on dot row. `role="progressbar"` on web. | P0 |
| STREAK-A11Y-003 | Milestone overlay: focus trap | When overlay is visible, focus is trapped inside modal. Tab sequence = heading → CTA → dismiss. Background elements non-interactive. | P0 |
| STREAK-A11Y-004 | Milestone overlay: dismiss button | Close/CTA button has `accessibilityLabel`. Keyboard-dismissable with Escape. | P0 |
| STREAK-A11Y-005 | Broken sheet: screen reader | `accessibilityRole="alert"`. Announces: "Your {N}-day streak has ended. Tap to start a new streak." | P0 |
| STREAK-A11Y-006 | At-risk banner: screen reader | `accessibilityRole="alert"`. Reads immediately. Close + CTA both labelled. | P0 |
| STREAK-A11Y-007 | Color contrast — amber at-risk banner | Background `rgba(245, 158, 11, 0.15)` + text `#fbbf24` — verify contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text. | P0 |
| STREAK-A11Y-008 | Color contrast — green progress | Filled dots use `colors.accent` — verify ≥ 3:1 against background. | P1 |
| STREAK-A11Y-009 | Touch targets | All tappable elements ≥ 44pt (CTA buttons, dismiss, close, flame tap area). | P0 |
| STREAK-A11Y-010 | Haptic feedback respects preference | Disabled when `settings_haptics_enabled` = false. Check existing `useSettings` or equivalent. | P1 |
| STREAK-A11Y-011 | Live region for swipe counter | `aria-live="polite"`: announces "Swipe 3 of 5 recorded" on each increment. | P1 |
| STREAK-A11Y-012 | Flame image/emoji hidden from screen reader | Flame emoji has `aria-hidden` or `accessibilityElementsHidden`. Only the label text is read. | P0 |
| STREAK-A11Y-013 | Active Seeker badge | `accessibilityLabel="Active Seeker badge — awarded for maintaining a thirty day streak"`. Non-interactive. | P1 |
| STREAK-A11Y-014 | Keyboard navigation (web) | All streak controls reachable via Tab. Dismiss buttons via Enter/Space. | P1 |
| STREAK-A11Y-015 | Reduced motion | If `prefers-reduced-motion`, disable confetti particles and spring animations. Use `withTiming` (fade, no scale). Respect system setting. | P2 |

### 1.6 Performance Tests

| ID | Scenario | Threshold | Priority |
|----|----------|-----------|----------|
| STREAK-PERF-001 | Edge Function cold start | < 200ms p95 | P0 |
| STREAK-PERF-002 | Edge Function warm invocation | < 100ms p95 | P0 |
| STREAK-PERF-003 | Frontend swipe → counter update latency | < 50ms (AsyncStorage write is instant) | P0 |
| STREAK-PERF-004 | Streak load on app open (Supabase fetch) | < 500ms p95 | P0 |
| STREAK-PERF-005 | Streak components added to deck render | No additional frame drops. Maintain 60fps swipe deck animation. | P0 |
| STREAK-PERF-006 | 10k concurrent Edge Function invocations | No 429 or timeout. Supabase concurrent connection limit: verify Edge Function scales. | P1 |
| STREAK-PERF-007 | At-risk cron: 1,000 at-risk users | Query + push batch completes within 30s. Expo push limit: 600/min safe. | P1 |

### 1.7 Security Tests

| ID | Scenario | Check | Priority |
|----|----------|-------|----------|
| STREAK-SEC-001 | RLS: read other user's streak | Verify user A cannot SELECT streaks for user B | P0 |
| STREAK-SEC-002 | RLS: modify other user's streak | Verify user A cannot INSERT/UPDATE/DELETE streaks for user B | P0 |
| STREAK-SEC-003 | Edge Function: service_role only | Verify `update-streak` and `streak-at-risk-check` cannot be invoked by unauthenticated clients (if `verify_jwt = false`, confirm they can only be triggered internally or with service key) | P0 |
| STREAK-SEC-004 | Profiles columns: RLS coverage | Verify new `active_seeker_badge_earned` and `streak_display_count` columns are covered by existing RLS policies | P0 |
| STREAK-SEC-005 | No PII in PostHog events | Verify `user_id` is used as `distinct_id` but no PII (email, name, phone) in event properties | P0 |
| STREAK-SEC-006 | AsyncStorage: no sensitive data | Streak keys contain only non-sensitive engagement data. No tokens, no PII. | P0 |

---

## 2. Analytics Event Schemas

### 2.1 Event Definitions

All events go to PostHog. Events tagged `[Edge Function]` fire from server-side code; `[Frontend]` fire from the app.

---

#### `streak_milestone_reached`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | User hits a streak milestone (7, 30, 60, 90 consecutive days) after 5th swipe completes |
| **Fires from** | Edge Function (`update-streak`) — after `upsert_streak` returns `action: 'incremented'` and milestone detected |
| **Rate limit** | Once per milestone per user (milestone flags prevent duplicate) |

**Schema:**

```typescript
interface StreakMilestoneReached {
  event: 'streak_milestone_reached';
  distinct_id: string;           // user_id UUID
  properties: {
    streak_length: number;       // 7 | 30 | 60 | 90
    reward_claimed: string | null;
    // 'super_applies' for 7-day
    // 'badge' for 30-day
    // null for 60/90 (no reward beyond count)
    current_streak_after: number;
    longest_streak_at_milestone: number;
    user_id: string;             // UUID, included explicitly for Edge Function
  };
  timestamp: string;             // ISO 8601
  $lib: 'supabase-edge-function';
}
```

**Success criteria:** Verify milestone event appears in PostHog after manually triggering 7-day and 30-day streaks in staging.

---

#### `streak_broken`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | User's streak resets due to inactivity (gap of ≥1 day) |
| **Fires from** | Edge Function (`update-streak`) — when `upsert_streak` returns `action: 'reset'` |
| **Rate limit** | Once per broken event (subsequent swipes on same day are `noop_same_day`) |

**Schema:**

```typescript
interface StreakBroken {
  event: 'streak_broken';
  distinct_id: string;
  properties: {
    previous_length: number;     // last current_streak before reset
    days_since_last_swipe: number; // gap in days (1+)
    longest_streak_preserved: number;
    user_id: string;
  };
  timestamp: string;
  $lib: 'supabase-edge-function';
}
```

**Success criteria:** Verify event after simulating missed day (set `last_swipe_date` to 2 days ago, then trigger 5 swipes).

---

#### `streak_at_risk_notification_sent`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | 22:00 AEDT cron fires; user has `current_streak >= 1` and `last_swipe_date < today()` |
| **Fires from** | Edge Function (`streak-at-risk-check`) — after building push payload |
| **Rate limit** | At most once per user per day (cron runs once daily) |

**Schema:**

```typescript
interface StreakAtRiskNotificationSent {
  event: 'streak_at_risk_notification_sent';
  distinct_id: string;
  properties: {
    current_streak: number;
    remaining_swipes: number;    // Always 5 (daily target) for clarity
    time_to_midnight_minutes: number; // Approx. 120 (22:00 to 00:00 AEDT)
    notifications_enabled: boolean;
    push_token_present: boolean;
    user_id: string;
  };
  timestamp: string;
  $lib: 'supabase-edge-function';
}
```

**Success criteria:** Verify event appears after cron trigger for at-risk users. Verify NOT fired for users who already completed 5+ swipes.

---

#### `streak_saved`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | User who was "at risk" completes their 5th swipe, preserving their streak |
| **Fires from** | Edge Function (`update-streak`) — after upsert with `action: 'incremented'` AND user had an at-risk notification sent today |
| **Rate limit** | Once per at-risk recovery per day |

**Schema:**

```typescript
interface StreakSaved {
  event: 'streak_saved';
  distinct_id: string;
  properties: {
    was_at_risk: boolean;    // true (notification was sent today)
    current_streak: number;  // streak after save
    user_id: string;
  };
  timestamp: string;
  $lib: 'supabase-edge-function';
}
```

**Success criteria:** Verify event after: 1) receive at-risk push, 2) complete 5 swipes before midnight.

---

#### `streak_at_risk_banner_dismissed`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | User taps dismiss (✕) on the at-risk in-app banner |
| **Fires from** | Frontend (`StreakAtRiskBanner.tsx` onDismiss) |
| **Rate limit** | Once per day per user (dismiss flag prevents re-show) |

**Schema:**

```typescript
interface StreakAtRiskBannerDismissed {
  event: 'streak_at_risk_banner_dismissed';
  distinct_id: string;       // User UUID from PostHog identity
  properties: {
    current_streak: number;
    remaining_swipes: number;
  };
  timestamp: string;
}
```

**Success criteria:** Dismiss banner → event appears in PostHog live events.

---

#### `streak_viewed`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | Deck screen mounts and streak data finishes loading |
| **Fires from** | Frontend (`deck.tsx` or `useStreak` refresh completion) |
| **Rate limit** | Once per deck screen mount (not on every background/foreground). Use a debounce flag to avoid duplicate on rapid re-renders. |

**Schema:**

```typescript
interface StreakViewed {
  event: 'streak_viewed';
  distinct_id: string;
  properties: {
    current_streak: number;
    longest_streak: number;
    today_swipes: number;
    daily_target: number;
    at_risk: boolean;
    active_seeker_badge_earned: boolean;
  };
  timestamp: string;
}
```

**Success criteria:** Navigate to deck → event fires once per navigation. Not on tab re-render.

---

#### `streak_milestone_overlay_dismissed`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | User dismisses milestone celebration overlay (taps CTA or backdrop) |
| **Fires from** | Frontend (`StreakMilestoneOverlay.tsx` onClose) |
| **Rate limit** | Once per milestone occurrence |

**Schema:**

```typescript
interface StreakMilestoneOverlayDismissed {
  event: 'streak_milestone_overlay_dismissed';
  distinct_id: string;
  properties: {
    milestone: 7 | 30 | 60 | 90;
    dismissed_after_seconds: number; // How long overlay was visible
  };
  timestamp: string;
}
```

**Success criteria:** Reach 7-day streak → dismiss overlay → event appears.

---

#### `streak_broken_sheet_dismissed`

| Field | Type | Description |
|-------|------|-------------|
| **Trigger** | User dismisses broken streak sheet (any CTA) |
| **Fires from** | Frontend (`StreakBrokenSheet.tsx`) |
| **Rate limit** | Once per broken occurrence |

**Schema:**

```typescript
interface StreakBrokenSheetDismissed {
  event: 'streak_broken_sheet_dismissed';
  distinct_id: string;
  properties: {
    previous_streak: number;
    action: 'start_new' | 'maybe_later';
  };
  timestamp: string;
}
```

**Success criteria:** Streak breaks → sheet appears → tap either CTA → event fires with correct action.

---

### 2.2 Implementation Guidance

#### Edge Function PostHog SDK (Deno)

For Edge Functions, use raw `fetch` to PostHog's `/capture` endpoint (no SDK needed):

```typescript
// In update-streak and streak-at-risk-check Edge Functions
const POSTHOG_HOST = Deno.env.get('POSTHOG_HOST');   // e.g. https://app.posthog.com
const POSTHOG_API_KEY = Deno.env.get('POSTHOG_API_KEY');

async function capturePostHog(
  event: string,
  distinctId: string,
  properties: Record<string, unknown>,
): Promise<void> {
  if (!POSTHOG_HOST || !POSTHOG_API_KEY) return;

  try {
    await fetch(`${POSTHOG_HOST}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_API_KEY,
        event,
        distinct_id: distinctId,
        properties: {
          ...properties,
          $lib: 'supabase-edge-function',
        },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error(`[posthog] capture failed for event=${event}:`, err);
  }
}
```

#### Frontend PostHog Events

Use the existing `usePostHog` hook:

```typescript
import { usePostHog } from '@/hooks/usePostHog';

// Inside component:
const posthog = usePostHog();

// Fire event:
posthog.capture('streak_broken_sheet_dismissed', {
  previous_streak: streakData.currentStreak,
  action: 'start_new',
});
```

#### Event fire chart

| Event | Where | Blocking? | Retry? |
|-------|-------|-----------|--------|
| `streak_milestone_reached` | Edge Function | No (fire-and-forget) | No |
| `streak_broken` | Edge Function | No (fire-and-forget) | No |
| `streak_at_risk_notification_sent` | Edge Function | No (batch at end) | No |
| `streak_saved` | Edge Function | No (fire-and-forget) | No |
| `streak_at_risk_banner_dismissed` | Frontend | No | No |
| `streak_viewed` | Frontend | No | No |
| `streak_milestone_overlay_dismissed` | Frontend | No | No |
| `streak_broken_sheet_dismissed` | Frontend | No | No |

All events are fire-and-forget. Streak functionality must never depend on analytics delivery.

#### PostHog Dashboard Queries (recommended)

| Query | Event | Insight |
|-------|-------|---------|
| "Streak milestone reach rate" | `streak_milestone_reached` grouped by `streak_length` | % of users reaching 7 vs 30 days |
| "Streak break rate by previous length" | `streak_broken` histogram by `previous_length` | Which streak lengths are most fragile |
| "At-risk notification → streak save rate" | `streak_at_risk_notification_sent` → `streak_saved` (funnel) | Effectiveness of at-risk push |
| "Banner dismiss vs swipe-to-save" | `streak_at_risk_banner_dismissed` vs completing 5 swipes | Banner effectiveness |
| "Daily active streak distribution" | `streak_viewed` `current_streak` | Streak length distribution |
| "Broken sheet re-engagement" | `streak_broken_sheet_dismissed` where `action=start_new` → subsequent swipes | Sheet effectiveness |

---

## 3. Success Criteria Checklist

### Pre-Deployment Gate

- [ ] **Migration applied without error**
  - `supabase migration up` runs clean
  - `streaks` table created with correct schema
  - `profiles` columns added (`active_seeker_badge_earned`, `streak_display_count`)
  - RLS policies active
  - Indexes created (`idx_streaks_user_id`, `idx_streaks_last_swipe_date`, `idx_streaks_at_risk`)
  - `upsert_streak()` and `sync_streak_to_profile()` RPCs installed
  - `set_updated_at()` trigger on `streaks`

- [ ] **All 220+ existing tests pass**
  ```bash
  cd apps/mobile && npx vitest run
  # Expected: 34 test files, 220+ tests, 0 failures
  ```

- [ ] **New useStreak tests pass**
  - `hooks/__tests__/useStreak.test.ts` — all tests green
  - `lib/__tests__/streak.test.ts` — all tests green
  - `components/streak/__tests__/StreakIndicator.test.tsx` — all tests green

- [ ] **TypeScript zero errors**
  ```bash
  cd apps/mobile && npx tsc --noEmit
  ```

- [ ] **Lint zero errors**
  ```bash
  cd apps/mobile && npx eslint .
  ```

### Functional Verification

- [ ] **Streak indicator renders on deck screen**
  - Visible below ScreenHeader, above RadiusFilter
  - Shows correct count and progress dots
  - Flame emoji renders across all themes

- [ ] **5-swipe threshold creates streak row in DB**
  - User with no prior streak: after 5 swipes, `streaks` row exists
  - `current_streak = 1`, `longest_streak = 1`
  - `last_swipe_date = today (UTC)`

- [ ] **Consecutive day swipes increment streak**
  - Day 1: 5 swipes → `current_streak = 1`
  - Day 2: 5 swipes → `current_streak = 2`
  - Continue for N days → `current_streak = N`

- [ ] **Missed day resets streak**
  - Streak at N, skip a day → next 5-swipe session → `current_streak = 1`
  - `longest_streak` preserved at N

- [ ] **7-day milestone earns +2 Super Applies**
  - After 5th swipe on day 7:
    - Milestone overlay visible
    - `sync_streak_to_profile` called
    - `super_apply_streak_bonus` AsyncStorage key set
    - Super Apply daily limit = 5

- [ ] **30-day milestone earns Active Seeker badge**
  - After 5th swipe on day 30:
    - Milestone overlay with gold confetti
    - `profiles.active_seeker_badge_earned = true`
    - Profile shows "🏆 Active Seeker" badge
    - Badge persists (greyed out) if streak drops

- [ ] **At-risk push fires at 22:00 AEDT**
  - `streak-at-risk-check` cron fires
  - Users with `current_streak >= 1` AND `last_swipe_date < today()` receive push
  - No push sent to users with streak=0 or notification disabled
  - Push deep links to `hi-hired://deck`

- [ ] **At-risk in-app banner shows at 22:00+ AEDT**
  - Device time mocked to 22:00+ AEDT
  - User has active streak and <5 swipes → amber banner shows
  - Dismiss persists for day

- [ ] **Sympathetic broken streak message shows**
  - User opens app after missed day
  - `StreakBrokenSheet` renders with emoji + message
  - "Start new streak" navigates to deck
  - "Maybe later" dismisses for today

- [ ] **All analytics events fire correctly**
  - Verify in PostHog staging project:
    - `streak_milestone_reached` fires at 7 and 30
    - `streak_broken` fires on missed day
    - `streak_at_risk_notification_sent` fires from cron
    - `streak_saved` fires after at-risk recovery
    - `streak_viewed` fires on deck mount
    - `streak_at_risk_banner_dismissed` fires on dismiss
    - `streak_milestone_overlay_dismissed` fires on overlay dismiss
    - `streak_broken_sheet_dismissed` fires with action value

### Regression Verification

- [ ] **No regression in swipe deck**
  - Left swipe, right swipe, Super Apply all work as before
  - Card animation, match detection, swipe recording all intact

- [ ] **No regression in chat**
  - Messages send/receive, read receipts, typing indicators all work

- [ ] **No regression in matches**
  - Match creation, match list, chat from match all work

- [ ] **No regression in job posting (employer)**
  - Create, edit, pause, reactivate jobs

- [ ] **No regression in auth**
  - Login, signup, logout, token refresh

- [ ] **No regression in profile**
  - Edit profile, verification badge, all existing fields

### Accessibility Verification

- [ ] **Screen reader reads streak state**
  - TalkBack/VoiceOver: "Streak: 3 days. You've completed 2 of 5 swipes today."

- [ ] **Milestone overlay focus trap**
  - Tab/keyboard navigation trapped inside modal

- [ ] **Color contrast passes**
  - Amber at-risk banner ≥ 4.5:1
  - Green progress dots ≥ 3:1

- [ ] **Touch targets ≥ 44pt**
  - All tappable elements meet minimum size

- [ ] **Haptic respects reduced motion / disabled setting**

### Quality Gates

- [ ] **TypeScript: zero errors**
- [ ] **Lint: zero errors**
- [ ] **All existing + new tests pass**
- [ ] **Manual QA pass on**:
  - iOS physical device (iPhone 14+)
  - Android physical device (Pixel 7+)
  - Android tablet (if supported)
  - Web (Chrome, Safari, Firefox)

### Staging Smoke Tests (run on staging branch)

```
1. Register new user → verify no streak shown
2. Swipe 5 times → verify streak=1 in DB
3. Close app, advance clock to next day (mock) → verify streak=2 or broken
4. Set streak to 6 → swipe 5 → verify 7-day overlay + +2 SA
5. Set streak to 29 → swipe 5 → verify 30-day overlay + badge
6. Set device to 22:30 AEDT → verify at-risk banner shows
7. Trigger cron manually → verify push sent
8. Miss a day → verify broken sheet shows
9. Verify PostHog events in dashboard
10. Run full regression suite
```

### Rollback Plan

If Streak feature causes production issues:

```sql
-- Rollback migration (reverse of 202606070003_streaks.sql):
-- 1. Remove Edge Functions (via Supabase dashboard/CLI)
-- 2. Remove profiles columns
alter table public.profiles drop column if exists active_seeker_badge_earned;
alter table public.profiles drop column if exists streak_display_count;
-- 3. Drop streaks table
drop table if exists public.streaks cascade;
-- 4. Drop RPCs
drop function if exists public.upsert_streak(uuid, date);
drop function if exists public.sync_streak_to_profile(uuid, integer, integer);
-- 5. Remove config.toml entries for Edge Functions
```

Feature flag approach: Wrap streak UI rendering behind a server-side or `AsyncStorage` flag. If issues arise, disable streak without deploying code.

---

## 4. Release Notes Draft

### CHANGELOG.md Entry

```markdown
## [Unreleased]

### Added (2026-06-07 — Daily Streak System)

- **Daily Streak system:** New gamified engagement loop that rewards daily swipe
  consistency. Streak indicator on the deck screen shows flame emoji, consecutive
  day count, and 5-dot progress bar that fills with each swipe.
  - **Streak indicator:** 🔥 N-day streak with animated progress dots below the
    screen header. Each swipe fills a dot with a satisfying bounce animation and
    haptic feedback.
  - **5-swipe threshold:** Complete ≥5 swipes in a calendar day (AEDT) to
    maintain or advance your streak. Single-day gaps reset the streak.
  - **7-day milestone:** Reach a 7-day streak to unlock +2 daily Super Applies
    (quota increases from 3→5) with a celebration overlay and confetti.
  - **30-day milestone:** Reach a 30-day streak to earn the "Active Seeker"
    profile badge, visible to employers as a mark of consistent engagement.
  - **At-risk notification:** At 22:00 AEDT, users with <5 swipes and an active
    streak receive a push notification ("🔥 Streak at risk!") and see an amber
    in-app banner with a "Swipe now" CTA.
  - **Broken streak recovery:** If a streak is missed, a sympathetic bottom sheet
    appears on the next visit with a "Start new streak" CTA — no shame, just a
    fresh start.
  - **New hook:** `useStreak` — AsyncStorage-backed real-time counter with
    Supabase server-side sync for durability.
  - **Edge Functions:**
    - `update-streak` — Fire-and-forget handler that counts today's swipes and
      upserts streak data via the `upsert_streak()` RPC.
    - `streak-at-risk-check` — Daily cron at 22:00 AEDT that queries at-risk
      users and dispatches Expo push notifications.
  - **Database:** New `streaks` table (user_id, current_streak, longest_streak,
    last_swipe_date) with RLS, indexes, and `upsert_streak()` /
    `sync_streak_to_profile()` RPCs. Profiles extended with
    `active_seeker_badge_earned` and `streak_display_count` columns.
  - **Analytics:** 8 new PostHog events for streak milestone tracking, break
    analysis, notification effectiveness, and re-engagement funnel measurement.
  - **Accessibility:** Full VoiceOver/TalkBack support — screen reader announces
    streak state, progress, and alerts. Focus traps on overlays. Color contrast
    compliant. Respects reduced motion and haptic preferences.

### Technical Details

- **New files:** 14 (migration, 2 Edge Functions, useStreak hook, 6 components,
  lib/streak.ts storage helpers)
- **Modified files:** 4 (deck.tsx, profile.tsx, SwipeCard.tsx, supabase/config.toml)
- **Approximate delta:** ~1,500 lines of new code
- **Dependencies:** None new (uses existing Reanimated, AsyncStorage, Supabase,
  PostHog, Expo Push)
- **Migration:** `202606070003_streaks.sql` — add streaks table, profiles columns,
  RPCs, RLS, indexes
```

---

*End of Handoff — Sam*
