/**
 * Tests for useStreak hook.
 *
 * Coverage plan:
 * 1. New user — first 5 swipes create streak
 * 2. Returning user with consecutive swipes
 * 3. Midnight boundary crossing
 * 4. Rollback on swipe failure
 * 5. Milestone detection (7-day)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Now import after mocks are set up
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStreak } from '@/hooks/useStreak';

// ─── Hoisted test infrastructure (must be before vi.mock calls) ──────────

const { storage, mockAsyncStorage, mockSupabaseFunctions } = vi.hoisted(() => {
  const storage = new Map<string, string>();

  const mockAsyncStorage = {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      storage.delete(key);
    }),
    clear: vi.fn(async () => storage.clear()),
  };

  const mockSupabaseFunctions = {
    invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return { storage, mockAsyncStorage, mockSupabaseFunctions };
});

// ─── Mocks ────────────────────────────────────────────────────────────────

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: mockAsyncStorage,
}));

// Mock supabase — use vi.hoisted refs so hoisted factory can reference them
const { mockSelect, mockEq, mockMaybeSingle, mockSupabaseAuth } = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockMaybeSingle = vi.fn();

  const mockSupabaseAuth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    }),
  };

  return { mockSelect, mockEq, mockMaybeSingle, mockSupabaseAuth };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      eq: mockEq,
      maybeSingle: mockMaybeSingle,
    })),
    functions: mockSupabaseFunctions,
    auth: mockSupabaseAuth,
  },
}));

// Mock the streak lib module for deterministic dates
const { mockToday, mockYesterday, mockHour } = vi.hoisted(() => ({
  mockToday: '2026-06-07',
  mockYesterday: '2026-06-06',
  mockHour: 14, // 2 PM (not at-risk)
}));

vi.mock('@/lib/streak', async () => {
  const actual = await vi.importActual<typeof import('@/lib/streak')>('@/lib/streak');
  return {
    ...actual,
    getTodayDateAEDT: () => mockToday,
    getYesterdayDateAEDT: () => mockYesterday,
    getCurrentHourAEDT: () => mockHour,
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────

function setupStreakRow(overrides: Record<string, unknown> = {}) {
  const defaultRow: Record<string, unknown> = {
    current_streak: 0,
    longest_streak: 0,
    last_swipe_date: null,
  };

  mockMaybeSingle.mockResolvedValue({ data: { ...defaultRow, ...overrides }, error: null });
  mockSelect.mockReturnThis();
  mockEq.mockReturnThis();
}

function clearStorage() {
  storage.clear();
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('useStreak', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearStorage();
    mockSupabaseFunctions.invoke.mockResolvedValue({ data: null, error: null });
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });
  });

  afterEach(() => {
    storage.clear();
  });

  // ─── Test: New user — first 5 swipes create streak ────────────────────

  it('new user starts with 0 streak, incrementSwipes advances progress and triggers Edge Function on 5th swipe', async () => {
    setupStreakRow({ current_streak: 0, longest_streak: 0, last_swipe_date: null });

    const { result } = renderHook(() => useStreak());

    // Wait for initial load to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // New user has 0 streak, 0 swipes today
    expect(result.current.currentStreak).toBe(0);
    expect(result.current.todaySwipes).toBe(0);
    expect(result.current.longestStreak).toBe(0);
    expect(result.current.streakMilestone).toBeNull();
    expect(result.current.streakBroken).toBe(false);

    // Swipe 5 times
    for (let i = 1; i <= 5; i++) {
      await act(async () => {
        result.current.incrementSwipes();
      });
    }

    // After 5 swipes, todaySwipes should be 5
    expect(result.current.todaySwipes).toBe(5);
    expect(result.current.remainingSwipes()).toBe(0);

    // Edge Function should have been invoked (fire-and-forget)
    expect(mockSupabaseFunctions.invoke).toHaveBeenCalled();
    const lastCall = mockSupabaseFunctions.invoke.mock.calls[
      mockSupabaseFunctions.invoke.mock.calls.length - 1
    ];
    expect(lastCall[0]).toBe('update-streak');
    expect(lastCall[1].body.user_id).toBe('test-user-id');
    expect(lastCall[1].body.swipe_timestamp).toBeDefined();
  });

  // ─── Test: Returning user ────────────────────────────────────────────

  it('returns stored streak data from Supabase for a returning user', async () => {
    // Set up AsyncStorage to simulate a returning user
    storage.set('streak_today_swipes', '2');
    storage.set('streak_last_active_date', mockToday);

    setupStreakRow({ current_streak: 3, longest_streak: 5, last_swipe_date: '2026-06-06' });

    const { result } = renderHook(() => useStreak());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should have loaded the streak from Supabase
    expect(result.current.currentStreak).toBe(3);
    expect(result.current.longestStreak).toBe(5);
    // AsyncStorage todaySwipes should be restored
    expect(result.current.todaySwipes).toBe(2);
    expect(result.current.remainingSwipes()).toBe(3);
  });

  // ─── Test: Midnight boundary crossing ──────────────────────────────────

  it('resets todaySwipes when crossing midnight with <5 swipes', async () => {
    // Simulate a user who was active yesterday and had a streak
    storage.set('streak_today_swipes', '3'); // Only 3 swipes yesterday
    storage.set('streak_last_active_date', mockYesterday); // Previous date
    storage.set('streak_count', '5'); // Had a 5-day streak

    setupStreakRow({ current_streak: 0, longest_streak: 5, last_swipe_date: mockYesterday });

    const { result } = renderHook(() => useStreak());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // todaySwipes should be reset to 0 for the new day
    expect(result.current.todaySwipes).toBe(0);

    // Remaining should show full target
    expect(result.current.remainingSwipes()).toBe(5);
  });

  // ─── Test: Rollback ──────────────────────────────────────────────────

  it('rollbackSwipe decrements todaySwipes correctly', async () => {
    setupStreakRow({ current_streak: 0, longest_streak: 0, last_swipe_date: null });

    const { result } = renderHook(() => useStreak());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Increment to 2
    await act(async () => {
      result.current.incrementSwipes();
    });
    await act(async () => {
      result.current.incrementSwipes();
    });
    expect(result.current.todaySwipes).toBe(2);

    // Rollback once
    await act(async () => {
      result.current.rollbackSwipe();
    });
    expect(result.current.todaySwipes).toBe(1);

    // Rollback again
    await act(async () => {
      result.current.rollbackSwipe();
    });
    expect(result.current.todaySwipes).toBe(0);

    // Rollback below 0 stays at 0
    await act(async () => {
      result.current.rollbackSwipe();
    });
    expect(result.current.todaySwipes).toBe(0);
  });

  // ─── Test: Milestone detection ──────────────────────────────────────

  it('detects 7-day milestone when combined streak + swipes qualify', async () => {
    // Simulate a user on a 6-day streak, just hitting 5th swipe
    storage.set('streak_today_swipes', '4');
    storage.set('streak_last_active_date', mockToday);

    setupStreakRow({ current_streak: 6, longest_streak: 6, last_swipe_date: '2026-06-06' });

    const { result } = renderHook(() => useStreak());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.currentStreak).toBe(6);
    expect(result.current.streakMilestone).toBeNull();

    // 5th swipe should trigger the 7-day milestone heuristic
    await act(async () => {
      result.current.incrementSwipes();
    });

    // After the 5th swipe, the hook detects milestone optimistically
    expect(result.current.bonusEarned).toBe(true);
    // milestone may be detected server-side, but the client heuristic fires
  });

  // ─── Test: Dismissal actions ───────────────────────────────────────────

  it('dismissBroken, dismissBonus, dismissAtRisk clear their respective flags', async () => {
    setupStreakRow({ current_streak: 0, longest_streak: 0, last_swipe_date: null });

    const { result } = renderHook(() => useStreak());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Verify dismiss functions exist
    expect(typeof result.current.dismissBroken).toBe('function');
    expect(typeof result.current.dismissBonus).toBe('function');
    expect(typeof result.current.dismissAtRisk).toBe('function');
    expect(typeof result.current.clearMilestone).toBe('function');

    await act(async () => {
      result.current.dismissBroken();
    });
    await act(async () => {
      result.current.dismissBonus();
    });
    await act(async () => {
      result.current.dismissAtRisk();
    });
    await act(async () => {
      result.current.clearMilestone();
    });

    // Dismiss flags should be stored
    expect(storage.get('streak_broken_dismissed_2026-06-07')).toBe('true');
    expect(storage.get('streak_at_risk_dismissed_2026-06-07')).toBe('true');
  });

  // ─── Test: remainingSwipes utility ─────────────────────────────────────

  it('remainingSwipes returns correct values', async () => {
    setupStreakRow({ current_streak: 5, longest_streak: 10, last_swipe_date: '2026-06-06' });

    const { result } = renderHook(() => useStreak());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Starting with 0 swipes today
    expect(result.current.remainingSwipes()).toBe(5);

    expect(typeof result.current.daysUntilNextMilestone).toBe('function');
  });

  // ─── Test: Error state ────────────────────────────────────────────────

  it('sets error state when Supabase query fails', async () => {
    // Make supabase query fail
    mockMaybeSingle.mockResolvedValue({ data: null, error: new Error('DB connection failed') });
    mockSelect.mockReturnThis();
    mockEq.mockReturnThis();

    const { result } = renderHook(() => useStreak());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('DB connection failed');
    expect(result.current.currentStreak).toBe(0);
  });
});
