# Daily Streak System — UX Handoff

**Author:** Maya (UX/UI + Product Experience)  
**Date:** 2026-06-07  
**Target:** Hi-Hired mobile app (React Native / Expo / NativeWind / Reanimated)  
**Theme system:** 5 accent themes (midnight, coast, bloom, hustle, slate) via `ThemeProvider`  
**Related docs:** [PRD: Daily Streak](#), `apps/mobile/app/(candidate)/(tabs)/deck.tsx`

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Streak Indicator (Deck Header)](#2-streak-indicator)
3. [Swipe Counter Animation](#3-swipe-counter-animation)
4. [Streak Milestone Celebration](#4-streak-milestone-celebration)
5. [Streak At Risk Notification](#5-streak-at-risk-notification)
6. [Broken Streak Screen](#6-broken-streak-screen)
7. [Super Apply Bonus Feedback](#7-super-apply-bonus-feedback)
8. [Active Seeker Badge (Profile)](#8-active-seeker-badge)
9. [Empty / Initial State](#9-empty--initial-state)
10. [Edge States](#10-edge-states)
11. [Component Tree & Integration Map](#11-component-tree--integration-map)
12. [Data Layer Contract](#12-data-layer-contract)

---

## 1. Architecture Overview

```
apps/mobile/
├── hooks/
│   ├── useStreak.ts                    # NEW — streak data + logic hook
│   └── useStreakNotification.ts        # NEW — 22:00 AEDT at-risk notification
├── components/
│   └── streak/
│       ├── StreakIndicator.tsx         # NEW — flame + count + progress bar
│       ├── StreakMilestoneOverlay.tsx  # NEW — confetti + reward unlock
│       ├── StreakAtRiskBanner.tsx      # NEW — in-app banner
│       ├── StreakBrokenSheet.tsx       # NEW — bottom sheet / modal
│       ├── StreakSuperApplyBonus.tsx   # NEW — +2 SA earned toast
│       └── StreakSwipeCounter.tsx      # NEW — swipe count animation
├── lib/
│   └── streak.ts                       # NEW — storage keys, helpers, types
└── app/(candidate)/(tabs)/
    ├── deck.tsx                        # MODIFY — integrate StreakIndicator, StreakSwipeCounter
    └── profile.tsx                     # MODIFY — add Active Seeker badge
```

**Key design principles:**
- Streak state stored in AsyncStorage (mirrors Super Apply counter pattern in `SwipeCard.tsx`)
- Server-side snapshot optionally persisted to Supabase `candidate_profiles` for cross-device sync
- All animations use Reanimated shared values (no state-driven setTimeout)
- Color tokens reference `useTheme().colors` — works with all 5 accent themes

---

## 2. Streak Indicator

### Component: `StreakIndicator`

**File:** `apps/mobile/components/streak/StreakIndicator.tsx`  

**Purpose:** Show the user their current streak count and daily progress toward maintaining it. Displays on the deck screen header, integrated between `ScreenHeader` and the swipe deck.

**User goal:** At-a-glance motivation — "I've swiped X days in a row, keep going!"

### Layout

```
┌──────────────────────────────────────────────┐
│  🔥  4-day streak     ○○○●○  3/5 swipes     │
│                                               │
│  (subtle) Keep it up — 2 more swipes today!  │
└──────────────────────────────────────────────┘
```

Positioned below `ScreenHeader` / above `RadiusFilter` in `deck.tsx`.

**NativeWind classes:**
```
<View className="flex-row items-center justify-between px-4 sm:px-6 lg:px-8 py-3 max-w-4xl self-center w-full">
```

### States

| State | Visual | Microcopy |
|-------|--------|-----------|
| **Default** | 🔥 + count + progress dots | — |
| **Active (swiping today)** | Progress dots fill as swipes happen (Reanimated cross-fade) | — |
| **Completed (5/5)** | Full green progress bar replaces dots; flame pulses gently | "✅ Today's streak secured!" |
| **7-day celebratory** | Flame glows with accent color (`colors.primaryLight`) + particles | "🔥 7-day streak! +2 Super Applies earned" |
| **Loading** | Skeleton bar (animated shimmer) | — |
| **Error** | Greyed-out flame, fallback text | "Streak — check connection" |

### Component Props

```typescript
interface StreakIndicatorProps {
  currentStreak: number;        // days (0 if no streak or broken)
  todaySwipes: number;          // swipes completed today (0-5)
  dailyTarget: number;          // default 5
  isLoading: boolean;
  error: string | null;
  onStreakMilestone?: (day: number) => void; // fires at 7, 30
}
```

### Interaction

- **Tap flame:** Brief haptic (`Haptics.impactAsync(Light)`) + a "Days until next milestone" tooltip:
  ```
  "3 more days for +2 Super Applies"
  "23 more days for Active Seeker badge"
  ```
  Shown as a brief overlay that auto-dismisses after 3s.
- **Desktop web hover:** Cursor changes to pointer, tooltip on hover.

### Accessibility

- `accessibilityLabel="Streak: {count} days. You've completed {todaySwipes} of {dailyTarget} swipes today."`
- `accessibilityRole="text"` (informational, not interactive for screen readers)
- Progress dots: `accessibilityValue={{ min: 0, max: 5, now: todaySwipes }}`
- Flame image/emoji should have `aria-hidden` or `accessibilityElementsHidden`

### Theme Compatibility

| Token | Usage |
|-------|-------|
| `colors.primary` | Flame glow (used as a subtle background tint) |
| `colors.text` | Streak count number |
| `colors.muted` | Daily swipes count text |
| `colors.accent` | Completed dot color |
| `colors.border` | Empty dot border |
| `colors.primaryLight` | Milestone glow effect |

For **slate** theme: flame uses the primary gray palette, no warm tones — the streak indicator is intentionally neutral.

---

## 3. Swipe Counter Animation

### Component: `StreakSwipeCounter`

**File:** `apps/mobile/components/streak/StreakSwipeCounter.tsx`  

**Purpose:** Provide satisfying micro-feedback each time a swipe counts toward the daily streak target. Animate the progress dots in the `StreakIndicator`.

**User goal:** Feel progress — each swipe visibly fills a dot with a cheerful bounce.

### Layout

Inline within `StreakIndicator`, not a separate visual component. Animated dots update on each swipe end.

```
○ → ◐ → ●  (animated fill when swipe completes)
     ^^^^
  Reanimated withSpring scale + color transition
```

### States

| State | Visual |
|-------|--------|
| **Empty** | 5 hollow circles `○ ○ ○ ○ ○`, `colors.subtle` border |
| **Partially filled** | `● ● ○ ○ ○` — filled dots use `colors.accent` |
| **Complete** | `● ● ● ● ●` — accent fill, soft glow behind |
| **Animating (filling)** | Circle scales 1.0 → 1.4 → 1.0 (`withSpring`), color fades from border to accent |

### Interaction

- Triggered from `useStreak` hook when `todaySwipes` increments
- Animation: `useAnimatedStyle` with `withSpring(1, { damping: 8, stiffness: 200 })` on the newly filled dot
- Haptic: `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` on dot fill
- On reaching 5/5: medium haptic + brief green glow

### Accessibility

- Live region (`aria-live="polite"`): announce "Swipe {n} of 5 recorded" after each swipe increments counter.
- On web: `role="progressbar"` on the dot row.

### Theme Compatibility

| Token | Usage |
|-------|-------|
| `colors.accent` | Filled dot color |
| `colors.border` | Unfilled dot border |
| `colors.surface` | Dot background |

---

## 4. Streak Milestone Celebration

### Component: `StreakMilestoneOverlay`

**File:** `apps/mobile/components/streak/StreakMilestoneOverlay.tsx`  

**Purpose:** Celebrate 7-day and 30-day streak achievements with a full-screen overlay that communicates the earned reward and motivates continued engagement.

**User goal:** Feel proud — recognition for consistency.

### Layout

```
┌──────────────────────────────────────┐
│                                      │
│          ✨ 🎉 ✨                     │
│                                      │
│     🔥  7-Day Streak!               │
│                                      │
│     You earned +2 Super Applies!     │
│                                      │
│     ┌──────────────────────┐         │
│     │   Awesome! Continue  │         │
│     └──────────────────────┘         │
│                                      │
│     (skip)                           │
└──────────────────────────────────────┘
```

Full-screen `Modal` (transparent backdrop at 70% black), centered card at ~85% screen width (capped at 400px). Pattern follows `MatchCelebration.tsx`.

### States

| Milestone | Header | Body | Confetti color |
|-----------|--------|------|----------------|
| **7 days** | "🔥 7-Day Streak!" | "You earned +2 Super Applies!" | `colors.primary` (indigo/teal/rose/amber) |
| **30 days** | "🏆 30-Day Streak!" | "You unlocked the Active Seeker badge!" | Gold (#FFD700) + `colors.primary` |
| **Already claimed** | Don't show — set a flag in AsyncStorage | — | — |
| **Loading** | Skeleton overlay with shimmer | — | — |

### Props

```typescript
interface StreakMilestoneOverlayProps {
  visible: boolean;
  milestone: 7 | 30;
  onAcknowledge: () => void;
  onClose: () => void;
}
```

### Interaction

- **Entrance animation:** Card scales from 0.85 → 1.0 (`withSpring`, damping 14), fades in over 300ms (same pattern as `MatchCelebration.tsx`)
- **Confetti particles:** 30-50 small colored circles burst from center-top with random velocities (Reanimated `withSpring` on position + opacity). Duration ~2s
- **Dismiss:** Tap "Awesome! Continue" CTA or tap backdrop
- **Auto-close:** After 5s if no interaction (with a closing animation)

### Confetti implementation (minimal, no external dependency)

```typescript
// Each particle = Reanimated shared value for x, y, scale, opacity
// Animated on mount: withSpring to random positions within viewport
// Colors sampled from theme: colors.primary, colors.accent, plus white
// Particles are absolutely positioned small Views with borderRadius full
```

### Accessibility

- `accessibilityLiveRegion="polite"`: "Congratulations! You've reached a {milestone}-day streak."
- Focus trapped inside modal (keyboard users)
- All confetti points `accessibilityElementsHidden`

### Theme Compatibility

All confetti particles use theme colors + white. The confirmation card uses `colors.surface` background, `colors.text` for heading, `colors.muted` for body. The CTA button uses `colors.primary` background with `colors.primaryText` text.

---

## 5. Streak At Risk Notification

### Component: `StreakAtRiskBanner`

**File:** `apps/mobile/components/streak/StreakAtRiskBanner.tsx`  

**Purpose:** At 22:00 AEDT, if the user has <5 swipes today, show an in-app banner and trigger a push notification to remind them to preserve their streak.

**User goal:** Rescue their streak before midnight.

### Layout (In-App Banner)

```
┌──────────────────────────────────────────────┐
│  ⏰  Streak at risk!                          │
│     You need {n} more swipes before midnight  │
│     ┌──────────────────┐   ┌──────┐          │
│     │   Swipe now      │   │  ✕  │          │
│     └──────────────────┘   └──────┘          │
└──────────────────────────────────────────────┘
```

Slides in from top of deck screen, below `StreakIndicator`. Uses `Animated.View` with `translateY` -100 → 0 (`withSpring`). Disappears on dismiss or swipe start.

### States

| State | Visual | Copy |
|-------|--------|------|
| **At risk (22:00-00:00)** | Orange/amber banner slide-in | "Streak at risk! {n} more swipes before midnight." |
| **Dismissed** | Banner slides back up | — |
| **Safe (≥5 swipes)** | Hidden (never shown) | — |
| **Past midnight** | Auto-dismissed or shows broken state | — |

### Push Notification

- **Trigger time:** 22:00 AEDT (server-side cron / Edge Function)
- **Title:** "🔥 Streak at risk!"
- **Body:** "You need {remaining} more swipe{n} to keep your {count}-day streak. Midnight is soon!"
- **Deep link:** `hi-hired://deck` (opens swipe deck)
- **Category:** `STREAK_AT_RISK` — allows quick-reply actions? No, just open app.

### Component Props

```typescript
interface StreakAtRiskBannerProps {
  visible: boolean;
  remainingSwipes: number; // 5 - todaySwipes
  currentStreak: number;
  onDismiss: () => void;
  onSwipeNow: () => void; // navigates to top of deck
}
```

### Accessibility

- `accessibilityRole="alert"` — read immediately by screen readers
- Close button: `accessibilityLabel="Dismiss streak at risk warning"`
- Swipe now CTA: `accessibilityLabel="Open swipe deck to save your streak"`

### Theme Compatibility

Banner uses an amber/orange palette regardless of theme to signal urgency. Background: `rgba(245, 158, 11, 0.15)` with amber border (same `#f59e0b` as hustle accent). Text: `#fbbf24` (amber-300). This is intentional — urgency should be recognizable across all 5 themes.

---

## 6. Broken Streak Screen

### Component: `StreakBrokenSheet`

**File:** `apps/mobile/components/streak/StreakBrokenSheet.tsx`  

**Purpose:** Sympathetically inform the user their streak has reset, and invite them to start a new one. Shows once on first app open after a missed day.

**User goal:** Re-engage without shame — "I can start again today."

### Layout

```
┌──────────────────────────────────────────┐
│                                          │
│              😔                          │
│                                          │
│     Your streak reset                    │
│                                          │
│     That's okay — every day is a         │
│     fresh start.                         │
│                                          │
│     You were at {N} days. Start a new    │
│     streak today with 5 quick swipes!    │
│                                          │
│     ┌──────────────────────┐             │
│     │   Start new streak   │             │
│     └──────────────────────┘             │
│                                          │
│     (Maybe later)                        │
└──────────────────────────────────────────┘
```

Bottom sheet or centered modal (same pattern as `MatchCelebration.tsx`). Uses `Modal` with transparent backdrop, centered card. Card max-width: `w-full max-w-sm`.

### States

| State | Visual | Copy |
|-------|--------|------|
| **First broken appearance** | Card slides up with sympathetic emoji + message | "Your streak reset. Start a new one today?" |
| **Dismissed** | Card animates down with fade | — |
| **"Don't show again today"** | AsyncStorage flag `streak_broken_dismissed_{date}` | — |
| **Recurring (user ignored prior)** | Same message, no emoji change | "Still time to start fresh — 5 swipes, you've got this." |

### Props

```typescript
interface StreakBrokenSheetProps {
  visible: boolean;
  previousStreak: number; // how many days they lost
  onStartNewStreak: () => void; // navigates to deck, resets todaySwipes
  onDismiss: () => void;
  onMaybeLater: () => void; // dismisses for today
}
```

### Interaction

- **Entrance:** Card fades + scales in (same Reanimated pattern as milestone)
- **"Start new streak":** Navigates to deck with a soft scroll-to-top. Sets `todaySwipes = 0`. Starts fresh counter.
- **"Maybe later":** Dismisses with a subtle animation. Sets `streak_broken_dismissed` flag so it doesn't re-appear same day.
- **Backdrop tap:** Dismisses / "Maybe later"
- **Haptic:** Medium impact on "Start new streak" button press

### Accessibility

- `accessibilityRole="alert"` — "Your {N}-day streak has ended. Tap to start a new streak."
- Focus trapped inside modal
- Close button accessible

### Theme Compatibility

Card uses `colors.surface` background, `colors.text` for heading. The CTA uses `colors.primary` background. The supportive tone carries across all themes. For **bloom** (rose theme), the warm rose color complements the sympathetic message. For **slate**, keep it minimal but warm in tone.

---

## 7. Super Apply Bonus Feedback

### Component: `StreakSuperApplyBonus`

**File:** `apps/mobile/components/streak/StreakSuperApplyBonus.tsx`  

**Purpose:** When a user reaches the 7-day streak milestone, visually communicate that they've earned +2 Super Applies. This appears as a toast notification immediately after the milestone overlay is dismissed.

**User goal:** Clear reward feedback — "I got something extra."

### Layout

```
┌──────────────────────────────────────────┐
│  ✨  +2 Super Applies earned!            │
│     Your 7-day streak reward             │
└──────────────────────────────────────────┘
```

Bottom-anchored toast (above the tab bar). Shows for 4 seconds then auto-dismisses with slide-down animation. Can also be manually swiped away.

### States

| State | Visual |
|-------|--------|
| **Default (just earned)** | Slides up from bottom, accent-colored left border |
| **Dismissing** | Slides down, fades out (Reanimated `withTiming`) |
| **Already shown** | Hidden — sets `streak_bonus_shown_7` flag in AsyncStorage |
| **Multiple streaks** | Only shows once per milestone reached |

### Props

```typescript
interface StreakSuperApplyBonusProps {
  visible: boolean;
  onDismiss: () => void;
}
```

### Interaction

- Appears 500ms after milestone overlay closes (chained delay)
- Toast `useAnimatedStyle` with `translateY` from 100 → 0
- Haptic: notification-style (`Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)`)
- Tappable: tap opens the Super Apply info sheet (explaining the 3/day limit and how to use Super Applies)

### Accessibility

- `accessibilityRole="alert"`: "Two bonus Super Applies added to your account for your 7-day streak."
- Auto-dismiss announced: "Reward notification will close automatically"

### Theme Compatibility

Uses `colors.accent` for the left accent bar (4px border), `colors.text` for the heading, `colors.muted` for subtitle. The ✨ emoji is universal.

---

## 8. Active Seeker Badge

### Component Integration: Profile Screen

**File:** `apps/mobile/components/screens/ProfileScreen.tsx` (modify existing)  

**Purpose:** Display the "Active Seeker" badge on a candidate's profile when they've achieved a 30-day streak. This creates social proof and status.

**User goal:** Recognition for sustained effort — shareable pride.

### Layout

```
┌──────────────────────────────────────┐
│  Profile                             │
│  ─────────────────────────────────   │
│                                      │
│  [Avatar]  John Smith                │
│            Sydney · Casual work      │
│            🏆  Active Seeker         │  ← NEW badge
│                                      │
│  ... (rest of profile)               │
└──────────────────────────────────────┘
```

Placed below the user's name/subtitle and above `ProfileRow` entries. Same layout pattern as `VerificationBadge` already in `ProfileScreen.tsx`.

### States

| State | Visual |
|-------|--------|
| **Badge earned (30-day streak)** | Trophy emoji + "Active Seeker" label in accent color |
| **Badge not earned** | Hidden (no empty state) |
| **Badge lapsed (streak lost after earning)** | Greyed out: "🏆 Active Seeker (keep swiping to maintain)" with a motivational tint of `colors.muted` |
| **Loading** | Skeleton placeholder |

### Integration

```typescript
// In ProfileScreen.tsx, near VerificationBadge:
{profile?.role === 'candidate' && (
  <ActiveSeekerBadge 
    earned={streakData?.activeSeekerBadgeEarned ?? false}
    currentStreak={streakData?.currentStreak ?? 0}
  />
)}
```

### Microcopy

- **Earned:** "🏆 Active Seeker" — subtitle tooltip: "30-day streak achiever"
- **Lapsed:** "🏆 Active Seeker (maintain your streak)" — subtitle: "Swipe daily to keep your badge visible"

### Accessibility

- `accessibilityLabel="Active Seeker badge — awarded for maintaining a thirty day streak"`
- Badge should be a non-interactive `View` with `accessibilityRole="text"`

### Theme Compatibility

Trophy color uses `colors.accent` for the emoji glow effect. The badge label uses `colors.text`. For **hustle** (amber), the trophy pairs naturally. For **slate**, the trophy has muted visual weight.

---

## 9. Empty / Initial State

### Context: First-time user on deck screen

**Location:** `apps/mobile/app/(candidate)/(tabs)/deck.tsx` (modify render logic)

**Purpose:** New users who haven't swiped yet see a warm invitation to begin their streak journey alongside their first swipe session.

**User goal:** Understand the streak mechanic and feel motivated to try it.

### Layout

```
┌──────────────────────────────────────────────┐
│  🔥  0-day streak     ○○○○○  0/5 swipes    │
│                                              │
│  Start your streak — swipe 5 jobs today!     │
│  Consistent seekers get matched faster.      │
│                                              │
│              [Swipe Deck below]              │
└──────────────────────────────────────────────┘
```

The `StreakIndicator` renders normally with `currentStreak=0`, `todaySwipes=0`. Below the indicator row, show a one-line prompt.

### States

| State | Visual | Copy |
|-------|--------|------|
| **Brand new user (no prior streak db entry)** | Streak fires at zero; encouragement text below | "Swipe 5 jobs today to start your streak 🔥" |
| **Day 1 (first swipe done)** | Prompt changes | "4 more swipes to lock in day 1!" |
| **Streak achieved (5/5)** | ✅ check + "Streak secured" | "✅ Day 1 locked! Come back tomorrow." |
| **Loading (data not yet fetched)** | Minimal skeleton | — |

### Microcopy variants

| Context | Text |
|---------|------|
| Initial (0 swipes) | "Swipe 5 jobs today to start your streak — consistent seekers get noticed." |
| Partial progress (1-4 swipes) | "{N} more swipe{N} to lock in today's streak!" |
| Completed (5/5) | "✅ Day streak secured! You're on fire." |

### Interaction

- Counter dots animate on first swipe (see §3)
- No separate "streak intro modal" — the streak indicator with 0 days + the text prompt is self-explanatory

### Accessibility

The initial state text should have `accessibilityLiveRegion="polite"` so it's announced when the deck loads.

---

## 10. Edge States

### 10a. Loading State

**When:** Streak data is being fetched from AsyncStorage or Supabase.  

**Visual:** Skeleton bar with animated shimmer (repeating linear gradient, ~1.5s cycle).  
- Width matches `StreakIndicator` row  
- Height ~28px  
- Uses `colors.surface` base with `colors.border` shimmer highlights  

**Duration threshold:** If load > 2s, show a reduced version with just text: "Loading streak..."
On web, the skeleton is a CSS animation; on native, use Reanimated with a moving gradient.

### 10b. Error State

**When:** AsyncStorage read fails, or Supabase query returns error.  

**Visual:** Streak indicator shows greyed-out flame with `colors.danger`-tinted text:  
`"Streak unavailable — tap to retry"`  

**Recovery:** 
- Tap the indicator triggers a retry
- Retry count capped at 3 with exponential backoff
- If all retries fail, show a non-blocking toast: "Can't load streak data. Your swipes are still being saved."
- Swipes continue to count regardless of streak fetch failure (fire-and-forget write to AsyncStorage)

**Error logging:** Use existing `analytics.ts` pattern to log `streak_load_error` event.

### 10c. Streak Counter Animation During Swipe

**When:** A swipe completes (left/right) and the counter increments.  

**Flow:**
1. `SwipeCard.tsx` calls `onSwipeLeft/Right` → `deck.tsx` → `swipe()` in `useJobDeck`
2. On swipe success (inside `handleSwipe` callback), `useStreak.incrementSwipes()` is called
3. The `StreakSwipeCounter` dot fills with animation (scale bounce from `withSpring`)

**Animation detail:**
```typescript
// In StreakIndicator, when todaySwipes changes:
const dotScale = useSharedValue(0);
// On increment:
dotScale.value = withSpring(1.4, { damping: 6, stiffness: 180 });
// Then auto-return to 1:
dotScale.value = withTiming(1, { duration: 200 });
```

**Edge case — swipe fails after optimistic counter increment:**
- Optimistically increment counter on swipe start
- If swipe API call fails (shown in existing error bar in `deck.tsx`), decrement counter and animate dot backward
- Backward animation: `withTiming(unfilled, { duration: 150 })` with a softer haptic

### 10d. Streak Reset at Midnight

**When:** User opens app after midnight AEDT (new calendar day).  

**Detection:** `todayDateString()` comparison (same pattern as Super Apply in `SwipeCard.tsx`).  

**Flow:**
1. `useStreak` initializes, calls `getStreakState()`
2. Compares stored `lastActiveDate` against today's date
3. If mismatch:
   - If `todaySwipes >= 5` on previous date → increment `currentStreak` by 1
   - If `todaySwipes < 5` → reset `currentStreak` to 0 (broken streak)
   - Reset `todaySwipes = 0`
   - Store new `lastActiveDate = today`
4. If previous streak was >= 5 days and now broken → show `StreakBrokenSheet`

### 10e. Cross-Device / Multi-Session

**When:** User has the app on multiple devices or reinstalls.  

**Strategy:**
- Primary source of truth: AsyncStorage (low-latency, offline-first)
- Secondary sync: Supabase `candidate_profiles` table via `useStreak` on mount and on milestone
- If Supabase sync fails, app continues with AsyncStorage — data loss only if device is wiped
- On conflict (e.g., streak on phone vs tablet), take the higher streak value (optimistic for user retention)

### 10f. AEDT Time Zone Edge Cases

- All streak date checks use AEDT (UTC+11 during DST, UTC+10 otherwise)
- `todayDateStringAEDT()` helper in `lib/streak.ts` handles offset
- Notifications triggered at 22:00 AEDT from server-side cron / Edge Function
- During daylight saving transitions: no double-count. A 23-hour day or 25-hour day still counts as one calendar day.

---

## 11. Component Tree & Integration Map

### Deck Screen Integration (`deck.tsx`)

Current structure:
```
AppScreen
  TabWebShell
    ScreenHeader
    RadiusFilter          ← StreakIndicator goes here
    SwipeDeck
      SwipeCard (x3)
```

Modified structure:
```
AppScreen
  StreakAtRiskBanner       ← conditionally rendered
  TabWebShell
    ScreenHeader
    StreakIndicator         ← NEW (positioned above RadiusFilter)
    RadiusFilter
    SwipeDeck
      SwipeCard (x3)
  StreakSuperApplyBonus     ← toast, above tab bar
  StreakMilestoneOverlay    ← full-screen modal
  StreakBrokenSheet         ← full-screen modal (only on first broken day)
```

### Hook Integration

```typescript
// In deck.tsx:
import { useStreak } from '@/hooks/useStreak';
import { StreakIndicator } from '@/components/streak/StreakIndicator';

// Inside DeckScreen component:
const {
  currentStreak,
  todaySwipes,
  dailyTarget,         // = 5
  isLoading,
  error,
  incrementSwipes,
  streakMilestone,     // 7 | 30 | null
  clearMilestone,
  streakBroken,        // boolean
  dismissBroken,
  bonusEarned,         // boolean (for +2 SA)
  dismissBonus,
  atRisk,
  dismissAtRisk,
} = useStreak();
```

### Profile Screen Integration

```typescript
// In ProfileScreen.tsx (near VerificationBadge block, around line 30-40):
import { ActiveSeekerBadge } from '@/components/streak/ActiveSeekerBadge';
// ...inside profile rendering:
{profile?.role === 'candidate' && (
  <ActiveSeekerBadge 
    earned={streakData?.activeSeekerBadgeEarned ?? false}
    currentStreak={streakData?.currentStreak ?? 0}
  />
)}
```

---

## 12. Data Layer Contract

### `useStreak` Hook Interface

```typescript
interface StreakState {
  currentStreak: number;          // 0 means no active streak
  todaySwipes: number;            // 0-5
  dailyTarget: number;            // const 5
  lastActiveDate: string;         // YYYY-MM-DD in AEDT
  streakMilestone: 7 | 30 | null; // which milestone was just reached
  streakBroken: boolean;          // true if streak just broke this session
  bonusEarned7: boolean;          // +2 Super Applies awarded this session
  activeSeekerBadgeEarned: boolean; // achieved 30-day streak ever
  isLoading: boolean;
  error: string | null;
  atRisk: boolean;                // true if 22:00+ AEDT and <5 swipes
}

interface StreakActions {
  incrementSwipes: () => void;
  clearMilestone: () => void;
  dismissBroken: () => void;
  dismissBonus: () => void;
  dismissAtRisk: () => void;
  refresh: () => Promise<void>;
}
```

### AsyncStorage Keys

| Key | Type | Purpose |
|-----|------|---------|
| `streak_count` | `number` | Current streak length |
| `streak_today_swipes` | `number` | Swipes today (0-5) |
| `streak_last_active_date` | `string` | Last date in AEDT (YYYY-MM-DD) |
| `streak_30_badge_earned` | `boolean` | Whether 30-day badge was ever earned |
| `streak_broken_dismissed_{date}` | `boolean` | Per-date broken sheet dismissal |
| `streak_bonus_shown_7` | `boolean` | Whether +2 SA toast was shown |
| `streak_milestone_{7\|30}_{date}` | `boolean` | Whether milestone overlay was shown for this instance |

### Supabase Sync (optional, future)

Table: `candidate_profiles`
Column additions:
- `streak_count: int2` — current streak
- `streak_longest: int2` — longest streak ever (for badge eligibility)
- `streak_30_badge_earned: boolean` — badge unlock state
- `streak_last_active_date: date` — date of last swipe activity (AEDT)

### Notification Types (for push)

```typescript
type StreakPushNotification = {
  type: 'streak_at_risk';
  remainingSwipes: number;
  currentStreak: number;
};
```

---

## Appendix: Implementation Order

| Priority | Component | Dependencies | Effort |
|----------|-----------|-------------|--------|
| P0 | `useStreak` hook + `lib/streak.ts` | None (pure logic) | 2-3 days |
| P0 | `StreakIndicator` | `useStreak` | 1 day |
| P0 | `StreakSwipeCounter` (dot animation) | `useStreak` | 1 day |
| P0 | Deck screen integration | All above | 0.5 day |
| P1 | `StreakMilestoneOverlay` (7-day) | `useStreak`, confetti logic | 1.5 days |
| P1 | `StreakSuperApplyBonus` toast | `StreakMilestoneOverlay` close event | 0.5 day |
| P2 | `StreakAtRiskBanner` | `useStreak.atRisk` | 0.5 day |
| P2 | Push notification (22:00 AEDT) | Server-side Edge Function | 1 day |
| P2 | `StreakBrokenSheet` | `useStreak.streakBroken` | 1 day |
| P3 | `ActiveSeekerBadge` (profile) | 30-day milestone, badge persistence | 0.5 day |
| P3 | Cross-device Supabase sync | `useStreak` + Supabase integration | 1 day |

**Total estimated effort: 9.5-12 days**

### Acceptance Criteria (QA Checklist)

- [ ] Streak indicator reads from AsyncStorage with correct count
- [ ] 5 swipes in a day increments streak by 1 at midnight AEDT
- [ ] <5 swipes resets streak to 0 (broken)
- [ ] Progress dots animate on each swipe
- [ ] 7-day milestone shows overlay with confetti + +2 Super Apply toast
- [ ] 30-day milestone shows overlay with badge unlock notification
- [ ] Active Seeker badge appears in profile after 30-day streak
- [ ] At-risk banner appears at 22:00 AEDT if <5 swipes
- [ ] Push notification fires at 22:00 AEDT
- [ ] Broken streak sheet appears on first open after missed day
- [ ] Error state gracefully degrades without blocking swipes
- [ ] Loading state shows skeleton
- [ ] All 5 accent themes render correctly — no hardcoded colors
- [ ] Accessibility: screen reader announces streak progress
- [ ] Haptic feedback disabled when user preference is off (`settings_haptics_enabled`)
- [ ] Web-safe: no native-only crashes on web (Platform.OS gates)
- [ ] Swipe counter rollback if API fails (optimistic UI)
- [ ] 30-day badge persists across device resets (Synced to Supabase)

---

*End of UX Handoff — Maya*
