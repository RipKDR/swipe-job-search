/**
 * useStreak — Full Daily Streak hook with AsyncStorage + Supabase.
 *
 * State duality:
 *   - AsyncStorage: todaySwipes, lastActiveDate (low-latency, offline-first)
 *   - Supabase: currentStreak, longestStreak, activeSeekerBadgeEarned (source of truth)
 *
 * Data flow (per Jordan handoff §6):
 *   1. User swipes → deck handleSwipe → incrementSwipes()
 *   2. incrementSwipes() optimistically updates AsyncStorage, fires Edge Function
 *   3. On app open → initializeStreak() reads AsyncStorage → checks midnight → fetches Supabase
 *   4. Conflict resolution: Supabase is always source of truth for streak count
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import {
  STORAGE_KEYS,
  DAILY_TARGET,
  getTodayDateAEDT,
  getCurrentHourAEDT,
  getNextMilestone,
  daysUntilNextMilestone,
  isMilestoneDay,
  SUPER_APPLY_STREAK_BONUS_KEY,
} from '@/lib/streak';

// ─── Types ────────────────────────────────────────────────────────────────

export interface StreakState {
  /** Current consecutive days (0 = no active streak, 1 = day 1 achieved, etc.) */
  currentStreak: number;
  /** Longest streak ever achieved (from Supabase) */
  longestStreak: number;
  /** Swipes completed today (0-5, from AsyncStorage for low latency) */
  todaySwipes: number;
  /** Daily target (always 5 for MVP) */
  dailyTarget: number;
  /** Last active date in YYYY-MM-DD (AEDT-based) */
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

export interface StreakActions {
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

export type UseStreakReturn = StreakState & StreakActions;

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useStreak(): UseStreakReturn {
  // AsyncStorage-backed state (low-latency, offline-capable)
  const [todaySwipes, setTodaySwipes] = useState<number>(0);
  const [lastActiveDate, setLastActiveDate] = useState<string>('');

  // Supabase-backed state (source of truth)
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [longestStreak, setLongestStreak] = useState<number>(0);
  const [streakMilestone, setStreakMilestone] = useState<7 | 30 | null>(null);
  const [streakBroken, setStreakBroken] = useState<boolean>(false);
  const [bonusEarned, setBonusEarned] = useState<boolean>(false);
  const [activeSeekerBadgeEarned, setActiveSeekerBadgeEarned] = useState<boolean>(false);
  const [atRisk, setAtRisk] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Guard against calling setState after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Track the current user ID for the Edge Function call
  const userIdRef = useRef<string | null>(null);

  // ─── Initialization ─────────────────────────────────────────────────────

  const initializeStreak = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const today = getTodayDateAEDT();

      // 0. Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      userIdRef.current = user.id;

      // 1. Read AsyncStorage
      const [storedSwipes, storedDate, storedBadge, storedBrokenDismissed] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.TODAY_SWIPES),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_ACTIVE_DATE),
        AsyncStorage.getItem(STORAGE_KEYS.BADGE_30_EARNED),
        AsyncStorage.getItem(STORAGE_KEYS.BROKEN_DISMISSED_PREFIX + today),
      ]);

      const prevDate = storedDate ?? '';
      const prevSwipes = storedSwipes ? parseInt(storedSwipes, 10) : 0;

      // 2. Detect day change (midnight boundary)
      if (prevDate && prevDate !== today) {
        // Crossed midnight — yesterday's session is over
        // The streak increment/reset is handled by the Edge Function.
        // We just reset the local counter.
        await AsyncStorage.setItem(STORAGE_KEYS.TODAY_SWIPES, '0');
        setTodaySwipes(0);

        // Check if yesterday had enough swipes; if not and there was a streak,
        // show broken sheet (but only once per date)
        if (prevSwipes < DAILY_TARGET) {
          const streakCountStr = await AsyncStorage.getItem(STORAGE_KEYS.STREAK_COUNT);
          const cachedStreak = streakCountStr ? parseInt(streakCountStr, 10) : 0;
          if (cachedStreak >= 1 && !storedBrokenDismissed) {
            setStreakBroken(true);
          }
        }

        await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_DATE, today);
        setLastActiveDate(today);
      } else {
        setTodaySwipes(prevSwipes);
        setLastActiveDate(prevDate || today);
        if (!prevDate) {
          await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_DATE, today);
        }
      }

      // 3. Fetch streak from Supabase (source of truth)
      // The 'streaks' table is added by migration 202606070003_streaks.sql
       
      const streakQuery = (supabase as any)
        .from('streaks')
        .select('current_streak, longest_streak, last_swipe_date')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: streakData, error: streakError } = await (streakQuery as Promise<{ data: unknown; error: { message: string } | null }>);

      if (streakError) {
        throw streakError;
      }

      if (streakData) {
        const typed = streakData as { current_streak: number; longest_streak: number; last_swipe_date: string | null };
        setCurrentStreak(typed.current_streak);
        setLongestStreak(typed.longest_streak);

        // Cache current streak for midnight detection
        await AsyncStorage.setItem(
          STORAGE_KEYS.STREAK_COUNT,
          String(typed.current_streak),
        );

        // Check Active Seeker badge eligibility
        if (typed.longest_streak >= 30) {
          setActiveSeekerBadgeEarned(true);
          await AsyncStorage.setItem(STORAGE_KEYS.BADGE_30_EARNED, 'true');
        } else {
          // Also check stored badge flag (for cross-device fallback)
          if (storedBadge === 'true') {
            setActiveSeekerBadgeEarned(true);
          }
        }
      }

      // 4. Check at-risk status (22:00+ AEDT, <5 swipes, active streak)
      const hour = getCurrentHourAEDT();
      if (hour >= 22 && todaySwipes < DAILY_TARGET && currentStreak >= 1) {
        const dismissed = await AsyncStorage.getItem(
          STORAGE_KEYS.AT_RISK_DISMISSED + today,
        );
        if (!dismissed) {
          setAtRisk(true);
        }
      }

      setIsLoading(false);
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load streak');
        setIsLoading(false);
      }
    }
  }, [todaySwipes, currentStreak]);

  // Initialize on mount
  useEffect(() => {
    initializeStreak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Core actions ───────────────────────────────────────────────────────

  /** Internal helper to handle milestone detection. */
  const handleMilestone = useCallback(
    async (day: 7 | 30) => {
      const today = getTodayDateAEDT();
      const storageKey = day === 7 ? STORAGE_KEYS.MILESTONE_7 : STORAGE_KEYS.MILESTONE_30;
      const alreadyShown = await AsyncStorage.getItem(storageKey + today);
      if (alreadyShown) return;

      setStreakMilestone(day);
      await AsyncStorage.setItem(storageKey + today, 'true');
      if (day === 7) {
        setBonusEarned(true);
        await AsyncStorage.setItem(SUPER_APPLY_STREAK_BONUS_KEY, 'true');
      } else {
        setActiveSeekerBadgeEarned(true);
        await AsyncStorage.setItem(STORAGE_KEYS.BADGE_30_EARNED, 'true');
      }
    },
    [],
  );

  const incrementSwipes = useCallback(async () => {
    const today = getTodayDateAEDT();
    const newCount = Math.min(todaySwipes + 1, DAILY_TARGET);

    // Optimistic UI update
    setTodaySwipes(newCount);

    // Persist to AsyncStorage
    await AsyncStorage.setItem(STORAGE_KEYS.TODAY_SWIPES, String(newCount));
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_DATE, today);
    setLastActiveDate(today);

    // Fire-and-forget: invoke Edge Function (non-blocking)
    const userId = userIdRef.current;
    if (userId) {
      supabase.functions
        .invoke('update-streak', {
          body: {
            user_id: userId,
            swipe_timestamp: new Date().toISOString(),
          },
        })
        .then(async (response) => {
          // Parse the Edge Function response to detect milestones
          if (response?.data) {
            const data = response.data as Record<string, unknown>;
            const currentStreakVal = typeof data.current_streak === 'number' ? data.current_streak : undefined;
            const longestStreakVal = typeof data.longest_streak === 'number' ? data.longest_streak : undefined;

            // Update server-backed state
            if (currentStreakVal !== undefined) {
              setCurrentStreak(currentStreakVal);
              await AsyncStorage.setItem(
                STORAGE_KEYS.STREAK_COUNT,
                String(currentStreakVal),
              );
            }
            if (longestStreakVal !== undefined) {
              setLongestStreak(longestStreakVal);
            }

            // Milestone detection from server response
            const milestoneDetected = data.milestone_detected === true;
            const milestoneDay = typeof data.milestone_day === 'number' ? data.milestone_day : 0;
            if (milestoneDetected && (milestoneDay === 7 || milestoneDay === 30)) {
              handleMilestone(milestoneDay as 7 | 30);
            }
          }
        })
        .catch(() => {
          // Edge Function failure is non-critical
          console.warn('[streak] update-streak invoke failed');
        });
    }

    // Client-side heuristic milestone check (optimistic, before server responds)
    if (newCount === DAILY_TARGET) {
      const effectiveStreak = currentStreak + 1; // will be +1 after server processes
      if (isMilestoneDay(effectiveStreak)) {
        await handleMilestone(effectiveStreak);
      }
    }

    setAtRisk(false);
  }, [todaySwipes, currentStreak, handleMilestone]);

  const rollbackSwipe = useCallback(async () => {
    const newCount = Math.max(todaySwipes - 1, 0);
    setTodaySwipes(newCount);
    await AsyncStorage.setItem(STORAGE_KEYS.TODAY_SWIPES, String(newCount));
  }, [todaySwipes]);

  // ─── Dismissal actions ──────────────────────────────────────────────────

  const clearMilestone = useCallback(() => {
    setStreakMilestone(null);
  }, []);

  const dismissBroken = useCallback(async () => {
    setStreakBroken(false);
    const today = getTodayDateAEDT();
    await AsyncStorage.setItem(STORAGE_KEYS.BROKEN_DISMISSED_PREFIX + today, 'true');
  }, []);

  const dismissBonus = useCallback(() => {
    setBonusEarned(false);
  }, []);

  const dismissAtRisk = useCallback(async () => {
    setAtRisk(false);
    const today = getTodayDateAEDT();
    await AsyncStorage.setItem(STORAGE_KEYS.AT_RISK_DISMISSED + today, 'true');
  }, []);

  // ─── Utility functions ──────────────────────────────────────────────────

  const remaining = useCallback(() => Math.max(DAILY_TARGET - todaySwipes, 0), [todaySwipes]);

  const daysToNextMilestone = useCallback(
    () => daysUntilNextMilestone(currentStreak),
    [currentStreak],
  );

  // ─── Return ─────────────────────────────────────────────────────────────

  return {
    // State
    currentStreak,
    longestStreak,
    todaySwipes,
    dailyTarget: DAILY_TARGET,
    lastActiveDate,
    streakMilestone,
    streakBroken,
    bonusEarned,
    activeSeekerBadgeEarned,
    atRisk,
    isLoading,
    error,
    // Actions
    incrementSwipes,
    clearMilestone,
    dismissBroken,
    dismissBonus,
    dismissAtRisk,
    refresh: initializeStreak,
    rollbackSwipe,
    remainingSwipes: remaining,
    daysUntilNextMilestone: daysToNextMilestone,
  };
}

export default useStreak;
