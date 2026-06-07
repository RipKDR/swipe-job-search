/**
 * Daily Streak — Storage keys, AEDT date helpers, milestone constants.
 *
 * All streak date comparisons use Australia/Melbourne timezone (AEDT/AEST).
 * This matches the product requirement from the Alex handoff:
 * "P0 uses AEDT internally with UTC display" — the DB stores UTC dates,
 * but all client-side streak logic (today, yesterday, midnight boundary,
 * at-risk 22:00 check) uses AEDT.
 *
 * @see /plans/streak-jordan-handoff.md §8
 * @see /plans/streak-maya-handoff.md §12
 */

// ─── AsyncStorage Keys ───────────────────────────────────────────────────
// Namespaced with `streak_` to coexist with existing Super Apply keys.

export const STORAGE_KEYS = {
  /** Swipes completed today (0-5). Stored as string number. */
  TODAY_SWIPES: 'streak_today_swipes',
  /** Last date user was active in YYYY-MM-DD (AEDT). */
  LAST_ACTIVE_DATE: 'streak_last_active_date',
  /** Cached current_streak from Supabase (for midnight boundary detection). */
  STREAK_COUNT: 'streak_count',
  /** Whether 30-day Active Seeker badge was ever earned. */
  BADGE_30_EARNED: 'streak_30_badge_earned',
  /** Per-date broken-sheet dismissal flag. Append YYYY-MM-DD. */
  BROKEN_DISMISSED_PREFIX: 'streak_broken_dismissed_',
  /** Whether +2 SA toast has ever been shown overall. */
  BONUS_SHOWN_7: 'streak_bonus_shown_7',
  /** Per-occurrence 7-day milestone flag. Append YYYY-MM-DD. */
  MILESTONE_7: 'streak_milestone_7_',
  /** Per-occurrence 30-day milestone flag. Append YYYY-MM-DD. */
  MILESTONE_30: 'streak_milestone_30_',
  /** Per-date at-risk banner dismissal. Append YYYY-MM-DD. */
  AT_RISK_DISMISSED: 'streak_at_risk_dismissed_',
} as const;

/** AsyncStorage key for the Super Apply streak bonus (7-day milestone). */
export const SUPER_APPLY_STREAK_BONUS_KEY = 'super_apply_streak_bonus';

// ─── Milestone Constants ─────────────────────────────────────────────────

/** Number of swipes required per day to maintain a streak. */
export const DAILY_TARGET = 5;

/** Milestone definitions: key = streak day, value = reward label. */
export const MILESTONES: Record<number, string> = {
  7: 'super_applies',
  30: 'badge',
} as const;

/** Milestone days sorted ascending. */
export const MILESTONE_DAYS = Object.keys(MILESTONES).map(Number).sort((a, b) => a - b);

// ─── AEDT Date Helpers ────────────────────────────────────────────────────

/**
 * Returns today's date in YYYY-MM-DD format for the Australia/Melbourne timezone.
 * Used for all streak date comparison logic and AsyncStorage key suffixes.
 */
export function getTodayDateAEDT(): string {
  return formatDateAEDT(new Date());
}

/**
 * Returns yesterday's date in YYYY-MM-DD format (Australia/Melbourne).
 */
export function getYesterdayDateAEDT(): string {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86_400_000);
  return formatDateAEDT(yesterday);
}

/**
 * Format a Date object as YYYY-MM-DD in Australia/Melbourne timezone.
 */
function formatDateAEDT(date: Date): string {
  // en-CA locale produces YYYY-MM-DD format
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Returns the current hour in Australia/Melbourne timezone (0-23).
 * Used for the 22:00+ at-risk check.
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

/**
 * Check if a specific milestone day matches the given streak count.
 */
export function isMilestoneDay(currentStreak: number): currentStreak is 7 | 30 {
  return currentStreak in MILESTONES;
}

/**
 * Get the next milestone day (or null if beyond all milestones).
 */
export function getNextMilestone(currentStreak: number): number | null {
  for (const day of MILESTONE_DAYS) {
    if (day > currentStreak) return day;
  }
  return null;
}

/**
 * Get days remaining until the next milestone.
 */
export function daysUntilNextMilestone(currentStreak: number): number | null {
  const next = getNextMilestone(currentStreak);
  return next !== null ? next - currentStreak : null;
}
