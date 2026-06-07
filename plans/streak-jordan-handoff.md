# Architecture Handoff: Daily Streak System

**Author:** Jordan (Technical Architecture + Delivery Strategy)  
**Date:** 2026-06-07  
**Target:** Hi-Hired — Expo/React Native mobile app + Supabase backend  
**Related docs:**
- [Product Handoff](streak-alex-handoff.md)
- [UX Handoff](streak-maya-handoff.md)
- [Migration](file:///home/admin/swipe-job-search/supabase/migrations/202606070003_streaks.sql)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [RLS Policies and Indexes](#3-rls-policies-and-indexes)
4. [Edge Function: `update-streak`](#4-edge-function-update-streak)
5. [Edge Function: `streak-at-risk-check` (Cron)](#5-edge-function-streak-at-risk-check-cron)
6. [Frontend Hook: `useStreak`](#6-frontend-hook-usestreak)
7. [Component Wiring Diagram](#7-component-wiring-diagram)
8. [Storage Keys (AsyncStorage)](#8-storage-keys-asyncstorage)
9. [Super Apply Quota Integration](#9-super-apply-quota-integration)
10. [PostHog Analytics Event Schemas](#10-posthog-analytics-event-schemas)
11. [Implementation Sequence](#11-implementation-sequence)
12. [Risk and Open Questions](#12-risk-and-open-questions)
13. [Appendix: File Inventory](#13-appendix-file-inventory)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Expo RN)                        │
│                                                                  │
│  deck.tsx                                                       │
│    ├── useStreak() hook                                         │
│    │   ├── AsyncStorage (real-time swipe count, streak cache)    │
│    │   └── Supabase query (streak data)                          │
│    ├── StreakIndicator (flame + count + progress dots)           │
│    ├── StreakAtRiskBanner (amber banner, 22:00 AEDT)            │
│    ├── StreakMilestoneOverlay (confetti celebration)             │
│    ├── StreakBrokenSheet (sympathetic bottom sheet)              │
│    └── StreakSuperApplyBonus (toast for +2 SA)                   │
│                                                                  │
│  SwipeCard.tsx                                                   │
│    └── StreakSwipeCounter (dot animation per swipe)              │
│                                                                  │
│  ProfileScreen.tsx                                               │
│    └── ActiveSeekerBadge (30-day milestone)                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │ supabase.functions.invoke('update-streak')
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EDGE FUNCTIONS (Deno)                        │
│                                                                  │
│  update-streak (HTTP invoke, fire-and-forget)                    │
│    ├── Count today's swipes for user                             │
│    ├── If >= 5: call upsert_streak() RPC                         │
│    ├── If milestone: call sync_streak_to_profile()               │
│    └── If milestone: capture PostHog event                       │
│                                                                  │
│  streak-at-risk-check (cron, 22:00 AEDT)                         │
│    ├── Query streaks WHERE last_swipe_date < today()             │
│    │         AND current_streak >= 1                             │
│    └── Prepare push notification payloads                        │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SUPABASE (PostgreSQL)                        │
│                                                                  │
│  streaks table (user_id, current_streak, longest_streak,         │
│                 last_swipe_date, created_at, updated_at)          │
│  upsert_streak() RPC (idempotent streak logic)                   │
│  sync_streak_to_profile() RPC (badge + display count)            │
│  profiles.active_seeker_badge_earned (bool)                      │
│  profiles.streak_display_count (int)                             │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User swipes** → `useSwipe.performSwipe()` inserts row into `swipes` table
2. **On swipe success** → `useStreak.incrementSwipes()` increments `todaySwipes` in AsyncStorage (optimistic, instant)
3. **On swipe success** → fire-and-forget call to `supabase.functions.invoke('update-streak')`
4. **Edge Function** counts today's swipes: if ≥5 → upsert streak row via `upsert_streak()` RPC
5. **On milestone** (7 or 30) → `sync_streak_to_profile()` RPC updates profiles table
6. **On app open** → `useStreak` reads AsyncStorage, then fetches Supabase streak data (asymmetric: storage is real-time, server is source of truth for streak count)

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Fire-and-forget, not blocking** | Streak is cosmetic/engagement, not transactional. Swipe UX must never wait for streak logic. |
| **AsyncStorage for swipe count** | Low-latency counter that works offline; streak check is deferred to Edge Function. |
| **No DB trigger on swipes** | A trigger fires on EVERY swipe INSERT ($O(N)$). Edge Function with threshold check is $O(1)$ writes. |
| **RPC call inside Edge Function** | Keeps streak logic in Postgres (ACID, transactional), Edge Function handles orchestration only. |
| **Profiles columns as cache** | Avoids JOINs for the common read path (profile page). Written only on milestone events. |

---

## 2. Database Schema

### `streaks` Table

```sql
create table public.streaks (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade unique,
  current_streak  integer     not null default 0,
  longest_streak  integer     not null default 0,
  last_swipe_date date,                              -- UTC date; null means never swiped
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
```

**Constraints:**
- `user_id` is `UNIQUE` — one streak row per user
- `current_streak` defaults to 0; new users show nothing until first qualifying day

### Profiles Extensions

```sql
-- Added to profiles table via migration
active_seeker_badge_earned boolean not null default false;
streak_display_count       integer not null default 0;
```

**Note:** `streak_display_count` is a read-only mirror updated by `sync_streak_to_profile()` RPC. The source of truth is the `streaks` table.

### `upsert_streak()` RPC

Located in the migration file. Contracts below.

**Signature:**
```sql
function upsert_streak(
  p_user_id      uuid,
  p_today_date   date    -- UTC date of this swipe session
) returns jsonb
```

**Return shape:**
```json
{
  "action": "created" | "incremented" | "reset" | "noop_same_day",
  "current_streak": number,
  "longest_streak": number,
  "last_swipe_date": "YYYY-MM-DD"
}
```

**Logic matrix:**

| Condition | Action | `current_streak` |
|-----------|--------|-------------------|
| No existing row (`NOT FOUND`) | INSERT new row | 1 |
| `last_swipe_date = today` | No-op (same session) | unchanged |
| `last_swipe_date = yesterday` | Increment | `current_streak + 1` |
| `last_swipe_date < yesterday` | Reset (streak broken) | 1 |

`longest_streak` is always `GREATEST(longest_streak, current_streak)` after update.

### `sync_streak_to_profile()` RPC

```sql
function sync_streak_to_profile(
  p_user_id          uuid,
  p_current_streak   integer,
  p_longest_streak   integer
) returns void
```

**Logic:**
1. Updates `profiles.streak_display_count` = `p_current_streak`
2. If `p_current_streak >= 30`, sets `active_seeker_badge_earned = true` (permanent unlock)
3. Otherwise leaves `active_seeker_badge_earned` unchanged (once earned, never un-earned)

---

## 3. RLS Policies and Indexes

### RLS Policies

```sql
alter table public.streaks enable row level security;

create policy "streaks_select_own" on public.streaks for select
  using (user_id = auth.uid());

create policy "streaks_insert_own" on public.streaks for insert
  with check (user_id = auth.uid());

create policy "streaks_update_own" on public.streaks for update
  using (user_id = auth.uid());

create policy "streaks_delete_own" on public.streaks for delete
  using (user_id = auth.uid());
```

**Security model:** Job seekers read/write only their own streak row. The Edge Functions use `service_role` key to bypass RLS for upsert and sync operations.

**Profiles columns:** Covered by existing `profiles_select_own` and `profiles_update_own` policies. New columns are automatically protected.

### Indexes

```sql
-- Primary lookup by user_id (unique constraint already creates a btree)
create index idx_streaks_user_id on public.streaks (user_id);

-- For 22:00 AEDT cron query: find streaks with last_swipe_date before today
create index idx_streaks_last_swipe_date on public.streaks (last_swipe_date);

-- Composite index for the at-risk cron query (partial index)
create index idx_streaks_at_risk on public.streaks (last_swipe_date, current_streak)
  where current_streak >= 1;
```

**Coverage analysis:**
- `SELECT ... WHERE user_id = $1` → uses `idx_streaks_user_id` + unique constraint
- `SELECT ... WHERE last_swipe_date < current_date AND current_streak >= 1` → uses `idx_streaks_at_risk` (partial, covers the WHERE exactly)

---

## 4. Edge Function: `update-streak`

**File:** `supabase/functions/update-streak/index.ts`  
**Trigger:** HTTP POST invoked by frontend after successful swipe INSERT  
**Auth:** Uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)  
**JWT verification:** `false` (service-role internal endpoint)  

### Invocation Contract

```typescript
// Called from useStreak hook after successful swipe
// Fire-and-forget — no response handling
supabase.functions.invoke('update-streak', {
  body: {
    user_id: string;         // UUID of the swiping user
    swipe_timestamp: string; // ISO 8601 timestamp of the swipe event
  }
});
```

### Function Logic

```
1. Parse request body: { user_id, swipe_timestamp }
2. Extract UTC date from swipe_timestamp: today = swipe_timestamp::date
3. Call supabase.rpc('count_today_swipes', { p_user_id, p_date: today })
   - SELECT COUNT(*) FROM swipes
     WHERE candidate_id = p_user_id
       AND created_at::date = p_date
4. If count >= 5:
   a. Call supabase.rpc('upsert_streak', { p_user_id, p_today_date: today })
   b. Parse the returned JSON to get { action, current_streak, longest_streak }
   c. If action = 'incremented' and current_streak in (5, 7, 14, 21, 30, 60, 90):
      - Check if milestone overlay was already shown today
      - Call supabase.rpc('sync_streak_to_profile', ...)
      - Send PostHog event (via fetch to POSTHOG_HOST/capture)
   d. If action = 'reset' and previous streak > 0:
      - Send PostHog 'streak_broken' event
5. Return 204 No Content (fire-and-forget; client ignores response)
```

### Performance Budget

| Operation | Budget | Notes |
|-----------|--------|-------|
| Request parsing | <5ms | Deno native JSON |
| Count query (`COUNT(*)` with index) | <20ms | `swipes_candidate_idx` covers `candidate_id, created_at` |
| RPC call (upsert_streak) | <50ms | Indexed on user_id, simple branching |
| Sync to profile (conditional) | <20ms | Only on milestone |
| PostHog fetch (conditional) | <100ms | Async, non-blocking |
| **Total p95** | **<200ms** | |

### Retry / Error Handling

- **Idempotent:** `upsert_streak` handles duplicate calls (noop on same day)
- **Fail silently:** Log error to console, return 204. Streak state is never stale enough to cause data loss — worst case, streak increments one day late
- **No retry on 5xx:** The next swipe will trigger another call

### Supabase Config

```toml
[functions.update-streak]
verify_jwt = false
```

### PostHog Environment Variable

```
POSTHOG_HOST=<project host>
POSTHOG_API_KEY=<project api key>
```

---

## 5. Edge Function: `streak-at-risk-check` (Cron)

**File:** `supabase/functions/streak-at-risk-check/index.ts`  
**Trigger:** Cron schedule (22:00 AEDT)  
**Auth:** Uses `SUPABASE_SERVICE_ROLE_KEY`  

### Cron Schedule

Due to DST, use two schedules:

```
# April to October (UTC+11): 22:00 AEDT = 11:00 UTC
[functions.streak-at-risk-check.cron]
schedule = "0 11 * 4-10 *"

# October to March (UTC+10): 22:00 AEDT = 12:00 UTC  
schedule = "0 12 * 11-3 *"
```

**Alternative:** Use a single cron at 11:00 UTC year-round and compute AEDT offset in the function. For MVP, accept manual schedule swap twice a year (add a reminder).

### Function Logic

```
1. Query streaks WHERE last_swipe_date < current_date
                      AND current_streak >= 1
   USING idx_streaks_at_risk index
2. For each streak row:
   a. Fetch user's device_tokens (push tokens)
   b. Fetch user's notification_preferences (check streak_reminder enabled)
   c. If tokens exist and reminder enabled:
      - Build push payload:
        {
          title: "🔥 Streak at risk!",
          body: `You need ${remaining} more swipes to keep your ${current_streak}-day streak. Midnight is soon!`,
          data: {
            type: 'streak_at_risk',
            remainingSwipes: 5,
            currentStreak: current_streak
          }
        }
   d. Send via Expo Push API (batched, max 100 per request)
   e. Log PostHog event 'streak_at_risk_notification_sent' (batch HTTP)
3. Return { sent: number, errors: number }
```

### Batched Push Implementation

```typescript
// Expo push message batch (100 per request)
const messages: ExpoPushMessage[] = streakRows.map(row => ({
  to: row.tokens,
  title: '🔥 Streak at risk!',
  body: `You need ${5 - row.todaySwipes} more swipes to keep your ${row.currentStreak}-day streak. Midnight is soon!`,
  data: {
    type: 'streak_at_risk',
    remainingSwipes: 5 - row.todaySwipes,
    currentStreak: row.currentStreak,
    deepLink: 'hi-hired://deck',
  },
  sound: 'default',
  priority: 'normal',
}));

// Send in chunks of 100
for (let i = 0; i < messages.length; i += 100) {
  const chunk = messages.slice(i, i + 100);
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(chunk),
  });
  // Parse receipts for exponential backoff on errors
}
```

### Supabase Config

```toml
[functions.streak-at-risk-check]
verify_jwt = false

[functions.streak-at-risk-check.cron]
schedule = "0 11 * 4-10 *"
```

---

## 6. Frontend Hook: `useStreak`

**File:** `apps/mobile/hooks/useStreak.ts`

### TypeScript Interface

```typescript
// ── State ──────────────────────────────────────────────────────────

interface StreakState {
  /** Current consecutive days (0 = no streak, 1 = day 1 achieved, etc.) */
  currentStreak: number;
  /** Longest streak ever achieved (from Supabase) */
  longestStreak: number;
  /** Swipes completed today (0-5, from AsyncStorage for low latency) */
  todaySwipes: number;
  /** Daily target (always 5 for MVP) */
  dailyTarget: number;
  /** Last active date in YYYY-MM-DD format (AEDT-based) */
  lastActiveDate: string;
  
  /** Just-reached milestone (for overlay rendering). Null if none. */
  streakMilestone: 7 | 30 | null;
  /** True if streak just broke this session (show StreakBrokenSheet) */
  streakBroken: boolean;
  /** True if +2 Super Applies bonus toast should show */
  bonusEarned: boolean;
  /** True if user has ever achieved 30-day streak */
  activeSeekerBadgeEarned: boolean;
  /** True if currently 22:00+ AEDT and <5 swipes today */
  atRisk: boolean;
  
  /** Is the initial data load in progress */
  isLoading: boolean;
  /** Error message from last fetch (null if ok) */
  error: string | null;
}

// ── Actions ────────────────────────────────────────────────────────

interface StreakActions {
  /** Call after every successful swipe to optimistically increment */
  incrementSwipes: () => void;
  /** Clear the milestone overlay flag (after it's been shown) */
  clearMilestone: () => void;
  /** Dismiss the broken streak sheet for today */
  dismissBroken: () => void;
  /** Dismiss the +2 Super Apply bonus toast */
  dismissBonus: () => void;
  /** Dismiss the at-risk banner */
  dismissAtRisk: () => void;
  /** Force-refresh streak data from Supabase */
  refresh: () => Promise<void>;
  /** Roll back todaySwipes (call on swipe failure) */
  rollbackSwipe: () => void;
  /** Get the remaining swipes needed (utility) */
  remainingSwipes: () => number;
  /** Get days until next milestone (utility) */
  daysUntilNextMilestone: () => number | null;
}

type UseStreakReturn = StreakState & StreakActions;
```

### Internal Logic

```typescript
export function useStreak(): UseStreakReturn {
  // ── AsyncStorage-backed state ──
  const [todaySwipes, setTodaySwipes] = useState<number>(0);
  const [lastActiveDate, setLastActiveDate] = useState<string>('');
  
  // ── Supabase-backed state ──
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [longestStreak, setLongestStreak] = useState<number>(0);
  const [streakMilestone, setStreakMilestone] = useState<7 | 30 | null>(null);
  const [streakBroken, setStreakBroken] = useState<boolean>(false);
  const [bonusEarned, setBonusEarned] = useState<boolean>(false);
  const [activeSeekerBadgeEarned, setActiveSeekerBadgeEarned] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Helper: get today's date in AEDT format
  const getTodayAEDT = (): string => {
    // See lib/streak.ts for full implementation
    return getTodayDateAEDT();
  };

  // ── Midnight check on initialization ──
  useEffect(() => {
    initializeStreak();
  }, []);

  const initializeStreak = async () => {
    try {
      setIsLoading(true);
      const today = getTodayAEDT();
      
      // 1. Read AsyncStorage
      const storedSwipes = await AsyncStorage.getItem(STORAGE_KEYS.TODAY_SWIPES);
      const storedDate = await AsyncStorage.getItem(STORAGE_KEYS.LAST_ACTIVE_DATE);
      const storedBrokenDismissed = await AsyncStorage.getItem(
        STORAGE_KEYS.BROKEN_DISMISSED_PREFIX + today
      );
      
      const prevDate = storedDate ?? '';
      const prevSwipes = storedSwipes ? parseInt(storedSwipes, 10) : 0;

      // 2. Detect day change
      if (prevDate && prevDate !== today) {
        // Crossed midnight — check if yesterday had enough swipes
        if (prevSwipes >= 5) {
          // Good: yesterday was a streak day. Today is new session.
          // streak will be incremented by the Edge Function.
          await AsyncStorage.setItem(STORAGE_KEYS.TODAY_SWIPES, '0');
          setTodaySwipes(0);
        } else {
          // Bad: yesterday didn't hit target. Streak will reset.
          await AsyncStorage.setItem(STORAGE_KEYS.TODAY_SWIPES, '0');
          setTodaySwipes(0);
          // Flag broken state
          const streakCount = await AsyncStorage.getItem(STORAGE_KEYS.STREAK_COUNT);
          if (streakCount && parseInt(streakCount, 10) >= 1) {
            setStreakBroken(true);
          }
        }
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_DATE, today);
      } else {
        setTodaySwipes(prevSwipes);
      }

      // 3. Fetch streak from Supabase (source of truth)
      const { data: streakData, error: streakError } = await supabase
        .from('streaks')
        .select('current_streak, longest_streak, last_swipe_date')
        .eq('user_id', userId)
        .maybeSingle();

      if (streakError) throw streakError;

      if (streakData) {
        setCurrentStreak(streakData.current_streak);
        setLongestStreak(streakData.longest_streak);
        
        // Cache current streak for midnight detection
        await AsyncStorage.setItem(
          STORAGE_KEYS.STREAK_COUNT,
          String(streakData.current_streak)
        );

        // Check badge
        if (streakData.longest_streak >= 30) {
          setActiveSeekerBadgeEarned(true);
        }
      }

      // 4. Check at-risk status (22:00+ AEDT and <5 swipes)
      const nowAEDT = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' });
      const hour = new Date(nowAEDT).getHours();
      if (hour >= 22 && todaySwipes < 5 && currentStreak >= 1) {
        const dismissed = await AsyncStorage.getItem(STORAGE_KEYS.AT_RISK_DISMISSED + today);
        if (!dismissed) {
          setAtRisk(true);
        }
      }

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load streak');
      setIsLoading(false);
    }
  };

  // ── Core actions ──

  const incrementSwipes = useCallback(async () => {
    const today = getTodayAEDT();
    const newCount = Math.min(todaySwipes + 1, 5);
    
    // Optimistic update
    setTodaySwipes(newCount);
    
    // Persist to AsyncStorage
    await AsyncStorage.setItem(STORAGE_KEYS.TODAY_SWIPES, String(newCount));
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_DATE, today);

    // Fire-and-forget: invoke Edge Function
    supabase.functions.invoke('update-streak', {
      body: { user_id: userId, swipe_timestamp: new Date().toISOString() },
    }).catch(() => {
      // Edge Function failure is non-critical
      console.warn('[streak] update-streak invoke failed');
    });

    // Check milestone (client-side heuristic — server is source of truth)
    // Returned from Edge Function response in practice, but we optimistically
    // check based on todaySwipes reaching 5.
    if (newCount === 5 && currentStreak + 1 >= 7) {
      const sevenDayCheck = await AsyncStorage.getItem(STORAGE_KEYS.MILESTONE_7 + today);
      if (!sevenDayCheck) {
        setStreakMilestone(7);
        setBonusEarned(true);
      }
    }

    // At-risk auto-dismiss
    setAtRisk(false);
  }, [todaySwipes, currentStreak]);

  const rollbackSwipe = useCallback(async () => {
    const newCount = Math.max(todaySwipes - 1, 0);
    setTodaySwipes(newCount);
    await AsyncStorage.setItem(STORAGE_KEYS.TODAY_SWIPES, String(newCount));
  }, [todaySwipes]);

  // ── Dismissal actions ──
  
  const clearMilestone = useCallback(() => setStreakMilestone(null), []);
  
  const dismissBroken = useCallback(async () => {
    setStreakBroken(false);
    const today = getTodayAEDT();
    await AsyncStorage.setItem(STORAGE_KEYS.BROKEN_DISMISSED_PREFIX + today, 'true');
  }, []);

  const dismissBonus = useCallback(() => setBonusEarned(false), []);
  
  const dismissAtRisk = useCallback(async () => {
    setAtRisk(false);
    const today = getTodayAEDT();
    await AsyncStorage.setItem(STORAGE_KEYS.AT_RISK_DISMISSED + today, 'true');
  }, []);

  // ── Utility ──

  const remainingSwipes = useCallback(() => Math.max(5 - todaySwipes, 0), [todaySwipes]);

  const daysUntilNextMilestone = useCallback(() => {
    if (currentStreak < 7) return 7 - currentStreak;
    if (currentStreak < 30) return 30 - currentStreak;
    return null;
  }, [currentStreak]);

  return {
    currentStreak,
    longestStreak,
    todaySwipes,
    dailyTarget: 5,
    lastActiveDate,
    streakMilestone,
    streakBroken,
    bonusEarned,
    activeSeekerBadgeEarned,
    atRisk,
    isLoading,
    error,
    incrementSwipes,
    clearMilestone,
    dismissBroken,
    dismissBonus,
    dismissAtRisk,
    refresh: initializeStreak,
    rollbackSwipe,
    remainingSwipes,
    daysUntilNextMilestone,
  };
}
```

### Asymmetric Data Strategy

| Data | Source | Latency | Offline | Purpose |
|------|--------|---------|---------|---------|
| `todaySwipes` | AsyncStorage | Instant | Yes | Progress dots, real-time UI |
| `currentStreak` | Supabase (streaks table) | 100-500ms | Fallback to cache | Displayed count, source of truth |
| `streakMilestone` | AsyncStorage flag | Instant | Yes | Prevent duplicate celebrations |
| `streakBroken` | AsyncStorage + Supabase | Mixed | Yes | Broken sheet trigger |

**Conflict resolution:** When Supabase returns a different `currentStreak` than AsyncStorage, trust Supabase. AsyncStorage may lag by one swipe (fire-and-forget). Update AsyncStorage cache from Supabase result.

---

## 7. Component Wiring Diagram

### Deck Screen Integration (`deck.tsx`)

```
AppScreen
  StreakAtRiskBanner          ← { atRisk, remainingSwipes, currentStreak, dismissAtRisk, onSwipeNow }
    TabWebShell
      ScreenHeader
      StreakIndicator          ← { currentStreak, todaySwipes, dailyTarget, isLoading, error, onStreakMilestone }
        └── StreakSwipeCounter ← (inline dot animation, driven by todaySwipes changes via Reanimated)
      RadiusFilter
      SwipeDeck
        SwipeCard (x3)        ← calls onSwipe → deck.tsx swipe handler → incrementSwipes()
        └── (streak callout inline in SwipeCard animation)
  StreakSuperApplyBonus        ← { visible: bonusEarned, onDismiss: dismissBonus }
  StreakMilestoneOverlay       ← { visible: !!streakMilestone, milestone: streakMilestone, onAcknowledge, onClose }
  StreakBrokenSheet            ← { visible: streakBroken, previousStreak, onStartNewStreak, onDismiss, onMaybeLater }
```

### Profile Screen Integration (`profile.tsx`)

```
ProfileScreen
  Avatar / Name / Subtitle block
  ActiveSeekerBadge            ← { earned: activeSeekerBadgeEarned, currentStreak }
  VerificationBadge            ← existing
  ProfileRow entries...
```

### Component-Specific Props

**`StreakIndicator.tsx`**
```typescript
interface StreakIndicatorProps {
  currentStreak: number;
  todaySwipes: number;
  dailyTarget: number;       // 5
  isLoading: boolean;
  error: string | null;
  onStreakMilestone?: (day: number) => void;
}
```

**`StreakSwipeCounter.tsx`** (inline, driven by `todaySwipes`)
```typescript
// No explicit props — reads todaySwipes from context or parent
// Uses Reanimated shared values for dot fill animation
interface StreakSwipeCounterProps {
  todaySwipes: number;
  dailyTarget: number;
}
```

**`StreakMilestoneOverlay.tsx`**
```typescript
interface StreakMilestoneOverlayProps {
  visible: boolean;
  milestone: 7 | 30;
  onAcknowledge: () => void;
  onClose: () => void;
}
```

**`StreakAtRiskBanner.tsx`**
```typescript
interface StreakAtRiskBannerProps {
  visible: boolean;
  remainingSwipes: number;
  currentStreak: number;
  onDismiss: () => void;
  onSwipeNow: () => void;
}
```

**`StreakBrokenSheet.tsx`**
```typescript
interface StreakBrokenSheetProps {
  visible: boolean;
  previousStreak: number;
  onStartNewStreak: () => void;
  onDismiss: () => void;
  onMaybeLater: () => void;
}
```

**`StreakSuperApplyBonus.tsx`**
```typescript
interface StreakSuperApplyBonusProps {
  visible: boolean;
  onDismiss: () => void;
}
```

**`ActiveSeekerBadge.tsx`**
```typescript
// File: apps/mobile/components/streak/ActiveSeekerBadge.tsx (NEW)
interface ActiveSeekerBadgeProps {
  earned: boolean;
  currentStreak: number;
}
```

### deck.tsx Modifications Plan

The existing `DeckScreen` component needs these changes:

1. **Add `useStreak` hook** at the top of the component
2. **Wrap `handleSwipe`** to call `incrementSwipes()` on success and `rollbackSwipe()` on failure
3. **Insert `StreakAtRiskBanner`** above `TabWebShell`
4. **Insert `StreakIndicator`** above `RadiusFilter` inside `TabWebShell`
5. **Insert modals/toasts** after `TabWebShell` closing tag:
   - `StreakMilestoneOverlay`
   - `StreakSuperApplyBonus`
   - `StreakBrokenSheet`

**Relevant existing function in deck.tsx:**
```typescript
const handleSwipe = useCallback(
  async (_jobId: string, direction: 'left' | 'right' | 'super') => {
    try {
      await swipe(direction);
      incrementSwipes();   // ← NEW: optimistic streak increment
    } catch {
      rollbackSwipe();     // ← NEW: rollback on failure
      Alert.alert('Swipe failed', 'Could not save your choice. Please try again.', [
        { text: 'OK' },
        { text: 'Retry deck', onPress: reset },
      ]);
    }
  },
  [swipe, reset, incrementSwipes, rollbackSwipe],
);
```

---

## 8. Storage Keys (AsyncStorage)

All keys use the `streak_` prefix to namespace with existing Super Apply keys.

| Key | Type | Example | Purpose |
|-----|------|---------|---------|
| `streak_today_swipes` | `number` | `"3"` | Swipes completed today (0-5) |
| `streak_last_active_date` | `string` | `"2026-06-07"` | Last date user was active (AEDT) |
| `streak_count` | `number` | `"12"` | Cached current_streak from Supabase |
| `streak_30_badge_earned` | `boolean` | `"true"` | Whether 30-day badge was ever earned |
| `streak_broken_dismissed_{date}` | `boolean` | `"true"` | Per-date broken sheet dismissal |
| `streak_bonus_shown_7` | `boolean` | `"true"` | Whether +2 SA toast was ever shown |
| `streak_milestone_7_{date}` | `boolean` | `"true"` | Whether 7-day overlay shown for this occurrence |
| `streak_milestone_30_{date}` | `boolean` | `"true"` | Whether 30-day overlay shown for this occurrence |
| `streak_at_risk_dismissed_{date}` | `boolean` | `"true"` | Per-date at-risk banner dismissal |

**Storage helper:** `apps/mobile/lib/streak.ts`

```typescript
export const STORAGE_KEYS = {
  TODAY_SWIPES: 'streak_today_swipes',
  LAST_ACTIVE_DATE: 'streak_last_active_date',
  STREAK_COUNT: 'streak_count',
  BADGE_30_EARNED: 'streak_30_badge_earned',
  BROKEN_DISMISSED_PREFIX: 'streak_broken_dismissed_',
  BONUS_SHOWN_7: 'streak_bonus_shown_7',
  MILESTONE_7: 'streak_milestone_7_',
  MILESTONE_30: 'streak_milestone_30_',
  AT_RISK_DISMISSED: 'streak_at_risk_dismissed_',
} as const;

/**
 * Returns today's date in YYYY-MM-DD format for the AEDT timezone.
 * Used for all streak date comparison logic.
 */
export function getTodayDateAEDT(): string {
  const now = new Date();
  // Use Australia/Melbourne (AEDT/AEST) for timezone-aware date
  const formatter = new Intl.DateTimeFormat('en-CA', {  // en-CA gives YYYY-MM-DD
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);  // "2026-06-07"
}

/**
 * Returns yesterday's date in YYYY-MM-DD (AEDT).
 */
export function getYesterdayDateAEDT(): string {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(yesterday);
}

/**
 * Get the current hour in AEDT timezone (0-23).
 */
export function getCurrentHourAEDT(): number {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Australia/Melbourne',
    hour: 'numeric',
    hour12: false,
  });
  return parseInt(formatter.format(now), 10);
}
```

---

## 9. Super Apply Quota Integration

### Current State

In `SwipeCard.tsx`, the Super Apply counter uses two AsyncStorage keys:

```typescript
const SUPER_APPLY_COUNT_KEY = 'super_apply_count';    // uses today
const SUPER_APPLY_DATE_KEY = 'super_apply_date';       // tracks date
```

The daily limit is hardcoded to 3:

```typescript
return Math.max(0, 3 - used);  // max 3 per day
```

### Integration: Dynamic Quota Based on Streak

1. **New AsyncStorage key:**

```typescript
const SUPER_APPLY_STREAK_BONUS_KEY = 'super_apply_streak_bonus'; // boolean
```

2. **Modified `getSuperApplyRemaining()` in SwipeCard.tsx:**

```typescript
async function getSuperApplyRemaining(): Promise<number> {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const storedDate = await AsyncStorage.getItem(SUPER_APPLY_DATE_KEY);
    const today = todayDateString();

    // Reset for new day
    if (storedDate !== today) {
      await AsyncStorage.setItem(SUPER_APPLY_COUNT_KEY, '0');
      await AsyncStorage.setItem(SUPER_APPLY_DATE_KEY, today);
      return 3;  // default limit
    }

    const countStr = await AsyncStorage.getItem(SUPER_APPLY_COUNT_KEY);
    const used = countStr ? parseInt(countStr, 10) : 0;
    
    // Check if 7-day streak bonus is active today
    const streakBonus = await AsyncStorage.getItem(SUPER_APPLY_STREAK_BONUS_KEY);
    const dailyLimit = streakBonus === 'true' ? 5 : 3;
    
    return Math.max(0, dailyLimit - used);
  } catch {
    return 3;
  }
}
```

3. **Set bonus flag when milestone reached:**

Inside `useStreak` hook, when 7-day milestone is detected, set:

```typescript
await AsyncStorage.setItem('super_apply_streak_bonus', 'true');
```

4. **The bonus resets daily** (checked against `SUPER_APPLY_DATE_KEY` — same day used in `getSuperApplyRemaining`). The `streak_today_swipes` reset at midnight also clears it naturally.

### Edge Cases

| Scenario | Handling |
|----------|----------|
| User continues streak past 7 days | Bonus remains active each day as long as streak ≥7 |
| User breaks streak after 7 days | `SUPER_APPLY_STREAK_BONUS_KEY` removed on streak reset (detected by `initializeStreak`) |
| User reaches 7 days again after break | Bonus re-activated by milestone detection |
| Day boundary | Bonus key checked alongside date key — same day cleanup |

---

## 10. PostHog Analytics Event Schemas

### Event Definitions

```typescript
// File: apps/mobile/lib/analytics.ts (add to existing)

/**
 * streak_milestone_reached
 * Fired when a user hits a streak milestone (7, 30, 60, 90 days).
 * Sent from the Edge Function (update-streak) on milestone detection.
 */
interface StreakMilestoneReached {
  event: 'streak_milestone_reached';
  properties: {
    streak_length: number;           // 7 | 30 | 60 | 90
    user_id: string;
    reward_claimed: string | null;   // 'super_applies' | 'badge' | null
    current_streak_after: number;
  };
}

/**
 * streak_broken
 * Fired when a user's streak resets due to inactivity.
 * Sent from the Edge Function (update-streak) on reset action.
 */
interface StreakBroken {
  event: 'streak_broken';
  properties: {
    previous_length: number;        // last current_streak before reset
    days_since_last_swipe: number;  // gap in days
    longest_streak: number;         // preserved longest
  };
}

/**
 * streak_at_risk_notification_sent
 * Fired when the streak-at-risk cron sends a push notification.
 * Sent from the Edge Function (streak-at-risk-check).
 */
interface StreakAtRiskNotificationSent {
  event: 'streak_at_risk_notification_sent';
  properties: {
    user_id: string;
    current_streak: number;
    time_to_midnight_minutes: number; // ~120
    notifications_enabled: boolean;
  };
}

/**
 * streak_saved
 * Fired when a user who received an at-risk notification completes their swipes.
 * Sent from the Edge Function (update-streak) when:
 *   - Current action is 'incremented'
 *   - User was in "at risk" state (notification sent that day)
 * Client-side: also can fire from useStreak on 5th swipe if atRisk was true.
 */
interface StreakSaved {
  event: 'streak_saved';
  properties: {
    user_id: string;
    was_at_risk: boolean;
    current_streak: number;
  };
}

/**
 * streak_at_risk_banner_dismissed
 * Client-side event: user dismissed the at-risk banner.
 * Fired from StreakAtRiskBanner on dismiss.
 */
interface StreakAtRiskBannerDismissed {
  event: 'streak_at_risk_banner_dismissed';
  properties: {
    current_streak: number;
    remaining_swipes: number;
  };
}
```

### PostHog Calls in Edge Functions

```typescript
// In update-streak Edge Function
async function capturePostHog(event: string, properties: Record<string, unknown>) {
  const posthogHost = Deno.env.get('POSTHOG_HOST');
  const posthogKey = Deno.env.get('POSTHOG_API_KEY');
  if (!posthogHost || !posthogKey) return;

  try {
    await fetch(`${posthogHost}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: posthogKey,
        event,
        properties: {
          ...properties,
          distinct_id: properties.user_id,
          $lib: 'supabase-edge-function',
        },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error('[posthog] capture failed:', err);
  }
}

// Usage after upsert_streak returns
if (result.action === 'incremented' && currentStreak >= 7 && currentStreak % 7 === 0) {
  await capturePostHog('streak_milestone_reached', {
    streak_length: currentStreak,
    user_id: userId,
    reward_claimed: currentStreak === 7 ? 'super_applies' : currentStreak === 30 ? 'badge' : null,
    current_streak_after: currentStreak,
  });
}

if (result.action === 'reset' && previousStreak > 0) {
  await capturePostHog('streak_broken', {
    previous_length: previousStreak,
    days_since_last_swipe: daysSinceLastSwipe,
    longest_streak: result.longest_streak,
  });
}
```

---

## 11. Implementation Sequence

Phased to ship value early while reserving polish for later.

### Phase 1: Data Layer & Streak Core (Dev + Jordan, 2 days)

| Step | File(s) | Description | Verified By |
|------|---------|-------------|-------------|
| 1.1 | `supabase/migrations/202606070003_streaks.sql` | DB migration: streaks table, RLS, indexes, RPCs | Migration applied + test queries |
| 1.2 | `supabase/functions/update-streak/index.ts` | Edge Function: count swipes, upsert, milestone detect | Manual invoke test |
| 1.3 | `apps/mobile/lib/streak.ts` | Storage keys, AEDT date helpers | Unit tests |
| 1.4 | `apps/mobile/hooks/useStreak.ts` | Core hook: init, increment, midnight check, rollback | Unit tests |

**Gate:** `useStreak` returns correct values for new user, consecutive day, gap.

### Phase 2: Streak UI (Maya + Dev, 1.5 days)

| Step | File(s) | Description | Verified By |
|------|---------|-------------|-------------|
| 2.1 | `apps/mobile/components/streak/StreakIndicator.tsx` | Flame + count + 5 dots | Visual test on all themes |
| 2.2 | `apps/mobile/components/streak/StreakSwipeCounter.tsx` | Reanimated dot fill animation | Visual test on each swipe |
| 2.3 | `apps/mobile/app/(candidate)/(tabs)/deck.tsx` | Wire useStreak + StreakIndicator | Integration test |

**Gate:** Streak indicator visible on deck, dots animate on swipe.

### Phase 3: At-Risk + Notifications (Dev, 2 days)

| Step | File(s) | Description | Verified By |
|------|---------|-------------|-------------|
| 3.1 | `supabase/functions/streak-at-risk-check/index.ts` | Cron: query at-risk, send push | Test with mock users |
| 3.2 | `apps/mobile/components/streak/StreakAtRiskBanner.tsx` | Amber banner | Visual test |
| 3.3 | Supabase Config | Add cron schedule to `config.toml` | Cron fires at 22:00 AEDT |

**Gate:** Push received at 22:00 AEDT if <5 swipes. Banner visible on app.

### Phase 4: Milestones + Rewards (Dev, 2 days)

| Step | File(s) | Description | Verified By |
|------|---------|-------------|-------------|
| 4.1 | `apps/mobile/components/streak/StreakMilestoneOverlay.tsx` | 7-day and 30-day celebration | Visual test + flag persistence |
| 4.2 | `apps/mobile/components/streak/StreakSuperApplyBonus.tsx` | +2 SA toast | Visual test |
| 4.3 | `apps/mobile/components/deck/SwipeCard.tsx` | Dynamic Super Apply quota (3→5) | Test with streak → verify limit changes |
| 4.4 | `apps/mobile/components/streak/StreakBrokenSheet.tsx` | Broken streak sheet | Visual test |

**Gate:** 7-day milestone shows overlay + toast + Super Apply limit increases to 5.

### Phase 5: Profile Badge (Dev + Maya, 1 day)

| Step | File(s) | Description | Verified By |
|------|---------|-------------|-------------|
| 5.1 | `apps/mobile/components/streak/ActiveSeekerBadge.tsx` | Badge component | Visual test on profile |
| 5.2 | `apps/mobile/app/(candidate)/(tabs)/profile.tsx` | Wire badge below name | Integration test |
| 5.3 | Edge Function milestone logic | Call `sync_streak_to_profile()` on 30-day | Test with mock data |

**Gate:** Active Seeker badge appears in profile after 30-day streak.

### Phase 6: Analytics + Hardening (Dev, 1 day)

| Step | File(s) | Description | Verified By |
|------|---------|-------------|-------------|
| 6.1 | Edge Function + frontend | PostHog events (5 events) | Verify in PostHog dashboard |
| 6.2 | Error states | Loading skeleton, error retry, offline fallback | Test with network off |
| 6.3 | Accessibility audit | Screen reader labels, roles, focus | Manual test with TalkBack/VoiceOver |
| 6.4 | Cross-device sync | Verify streak persists across install | Test with device wipe scenario |

**Total estimated effort: ~9.5 days**

---

## 12. Risk and Open Questions

### Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Edge Function cold start > 200ms** | Medium | Medium | Warm-up via crons; Deno Deploy has sub-50ms cold starts for Supabase Edge Functions |
| **AEDT/UTC confusion causes off-by-one** | High | Medium | Single `getTodayDateAEDT()` helper in `lib/streak.ts`. All DB dates are UTC, all display logic is AEDT. |
| **AsyncStorage corruption** | Low | Low | Reset on error: clear streak keys, re-fetch from Supabase. Swipes continue working. |
| **Push notification rate limiting** | Medium | Low | Expo push limit is 600/min per project. At 10k MAU, 166 at-risk pushes/min is safe. Batch in groups of 100. |
| **Milestone overlay shown multiple times** | Medium | High | `AsyncStorage` flag per milestone + date (`streak_milestone_7_{date}`). Edge Function also checks. |
| **Bulk-swipes (Asuria) counting toward streak** | Low | High | Explicit check in Edge Function: skip if `bulk_swipe_consent` active. |

### Open Questions

1. **Should 7-day streak bonus persist across device reinstalls?**
   - Current: no — bonus re-earned on next milestone detection.
   - Consider: saving `streak_30_badge_earned` to Supabase (already done via `profiles.active_seeker_badge_earned`). Same for milestone flags?

2. **Should the at-risk notification respect quiet hours?**
   - 22:00 AEDT is not late for AU. Users who set quiet hours on their device will not receive push anyway.
   - No additional app-level quiet hour logic for MVP.

3. **Timezone detection (P1 feature) — implementation path?**
   - Use `Intl.DateTimeFormat` with device locale's `timeZone` option.
   - Fall back to AEDT if browser locale doesn't include timezone (unlikely on mobile).

4. **What happens when AEDT does not apply (user is in Perth, UTC+8)?**
   - MVP: all times use AEDT. Perth users get notification at 20:00 AWST (acceptable).
   - P1: use device timezone.

5. **Edge Function error logging — Sentry?**
   - MVP: `console.error` + Supabase logs dashboard.
   - Consider: Sentry Edge Function integration if error rate >1%.

6. **Should the at-risk cron query also exclude users who have notification_preferences.streak_reminder = false?**
   - Yes. Add JOIN to `notification_preferences` in the cron query.

---

## 13. Appendix: File Inventory

### New Files

| File | Purpose | Est. Lines |
|------|---------|-----------|
| `supabase/migrations/202606070003_streaks.sql` | DB schema, RPCs, RLS | 250 |
| `supabase/functions/update-streak/index.ts` | Swipe → streak Edge Function | 120 |
| `supabase/functions/update-streak/deno.json` | Deno config | 5 |
| `supabase/functions/streak-at-risk-check/index.ts` | 22:00 AEDT cron | 100 |
| `supabase/functions/streak-at-risk-check/deno.json` | Deno config | 5 |
| `apps/mobile/lib/streak.ts` | Storage keys, AEDT helpers | 60 |
| `apps/mobile/hooks/useStreak.ts` | Streak state + actions hook | 250 |
| `apps/mobile/components/streak/StreakIndicator.tsx` | Flame + count + dots | 120 |
| `apps/mobile/components/streak/StreakSwipeCounter.tsx` | Reanimated dot fill | 80 |
| `apps/mobile/components/streak/StreakMilestoneOverlay.tsx` | 7/30 day celebration | 150 |
| `apps/mobile/components/streak/StreakAtRiskBanner.tsx` | Amber banner | 80 |
| `apps/mobile/components/streak/StreakBrokenSheet.tsx` | Sympathetic sheet | 120 |
| `apps/mobile/components/streak/StreakSuperApplyBonus.tsx` | +2 SA toast | 60 |
| `apps/mobile/components/streak/ActiveSeekerBadge.tsx` | Profile badge | 40 |

### Modified Files

| File | Change |
|------|--------|
| `apps/mobile/components/deck/SwipeCard.tsx` | Dynamic Super Apply quota (3→5), import `SUPER_APPLY_STREAK_BONUS_KEY` |
| `apps/mobile/app/(candidate)/(tabs)/deck.tsx` | Add `useStreak`, `handleSwipe` integration, render streak components |
| `apps/mobile/app/(candidate)/(tabs)/profile.tsx` | Add `ActiveSeekerBadge` |
| `supabase/config.toml` | Add Edge Function configs + cron schedule |

### Total Estimated Delta

| Metric | Value |
|--------|-------|
| New files | 14 |
| Modified files | 4 |
| Total new lines of code | ~1,500 |
| New dependencies | None (all existing: Reanimated, AsyncStorage, Supabase, PostHog, Expo Push) |

---

*End of Architecture Handoff — Jordan*
