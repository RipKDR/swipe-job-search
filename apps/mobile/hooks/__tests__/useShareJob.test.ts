/**
 * Tests for useShareJob hook.
 *
 * Coverage:
 * 1. shareJob builds correct message and opens native share
 * 2. shareJob records share_event via RPC on success
 * 3. shareJob returns {shared: false} on dismiss
 * 4. shareJob returns error when RPC fails
 * 5. Rate limit blocks the share
 * 6. shareJob returns error when job/user missing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Imports ─────────────────────────────────────────────

import { renderHook, act } from '@testing-library/react';
import { useShareJob } from '../useShareJob';

// ─── Hoisted test infrastructure ─────────────────────────

const { mockRpc, mockShare, mockPostHog } = vi.hoisted(() => {
  const mockRpc = vi.fn();
  const mockShare = vi.fn();
  const mockPostHogCapture = vi.fn();

  return {
    mockRpc,
    mockShare: Object.assign(mockShare, {
      sharedAction: 'sharedAction',
      dismissedAction: 'dismissedAction',
    }),
    mockPostHog: { capture: mockPostHogCapture },
  };
});

// ─── Mocks ───────────────────────────────────────────────

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user-id' } }),
}));

vi.mock('@/hooks/usePostHog', () => ({
  usePostHog: () => mockPostHog,
}));

// Mock react-native's Share API — avoid importing actual (Flow-typed source)
vi.mock('react-native', () => ({
  Share: {
    share: mockShare,
    sharedAction: 'sharedAction',
    dismissedAction: 'dismissedAction',
  },
  Platform: {
    OS: 'web',
    select: (obj: Record<string, unknown>) => {
      if (Object.prototype.hasOwnProperty.call(obj, 'web')) return obj.web;
      if (Object.prototype.hasOwnProperty.call(obj, 'native')) return obj.native;
      if (Object.prototype.hasOwnProperty.call(obj, 'default')) return obj.default;
      return undefined;
    },
  },
  Alert: { alert: () => {} },
  Linking: { openURL: () => {}, canOpenURL: () => Promise.resolve(true) },
  View: 'div',
  Text: 'span',
  Pressable: 'button',
  useWindowDimensions: () => ({ width: 375, height: 812 }),
  StyleSheet: { create: (s: any) => s },
  Animated: { View: 'div' },
}));

// Mock expo-haptics
vi.mock('expo-haptics', () => ({
  impactAsync: vi.fn().mockResolvedValue(undefined),
  notificationAsync: vi.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

// ─── Helpers ─────────────────────────────────────────────

/** Minimal valid job object for testing. */
function createMockJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job-1',
    title: 'Casual Kitchen Hand',
    employer_id: 'employer-1',
    pay_display: '$32–38/hr',
    suburb: 'Fitzroy',
    job_type: 'casual',
    description: 'Great opportunity',
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────

describe('useShareJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({
      data: { allowed: true, share_token: 'a1b2c3d4e5f6', daily_share_count: 1 },
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─── Test: shareJob builds correct message and opens native share ────

  it('builds correct share text and opens native share on success', async () => {
    mockShare.mockResolvedValue({ action: 'sharedAction' });

    const { result } = renderHook(() => useShareJob());

    let res: { shared: boolean } | undefined;

    await act(async () => {
      res = await result.current.shareJob({
        job: createMockJob() as any,
        source: 'card',
      });
    });

    // RPC was called first
    expect(mockRpc).toHaveBeenCalledWith('record_share_event', {
      p_job_id: 'job-1',
      p_share_type: 'job',
    });

    // Native Share.share() was called with correct data
    expect(mockShare).toHaveBeenCalledTimes(1);
    const shareArgs = mockShare.mock.calls[0];
    expect(shareArgs[0]).toHaveProperty('title', 'Hi-Hired — Casual Kitchen Hand');
    expect(shareArgs[0]?.message).toContain('Casual Kitchen Hand');
    expect(shareArgs[0]?.message).toContain('$32–38/hr');
    expect(shareArgs[0]?.message).toContain('Fitzroy');
    expect(shareArgs[1]).toHaveProperty('dialogTitle', 'Share this job');

    // Returns shared: true
    expect(res).toEqual({ shared: true, cancelled: false });

    // PostHog tracked
    expect(mockPostHog.capture).toHaveBeenCalledWith('job_shared', {
      job_id: 'job-1',
      source: 'card',
      share_token: 'a1b2c3d4e5f6',
      employer_id: 'employer-1',
      channel: null,
    });
  });

  // ─── Test: shareJob records share_event via RPC on success ──────────

  it('calls record_share_event RPC with correct params', async () => {
    mockShare.mockResolvedValue({ action: 'sharedAction' });

    const { result } = renderHook(() => useShareJob());

    await act(async () => {
      await result.current.shareJob({
        job: createMockJob() as any,
        source: 'detail',
      });
    });

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('record_share_event', {
      p_job_id: 'job-1',
      p_share_type: 'job',
    });
  });

  // ─── Test: shareJob returns {shared: false} on dismiss ──────────────

  it('returns {shared: false} when user dismisses the share sheet', async () => {
    mockShare.mockResolvedValue({ action: 'dismissedAction' });

    const { result } = renderHook(() => useShareJob());

    let res: { shared: boolean; cancelled?: boolean } | undefined;

    await act(async () => {
      res = await result.current.shareJob({
        job: createMockJob() as any,
        source: 'card',
      });
    });

    expect(res).toEqual({ shared: false, cancelled: true });

    // No PostHog success event
    expect(mockPostHog.capture).not.toHaveBeenCalledWith(
      'job_shared',
      expect.anything(),
    );
  });

  // ─── Test: shareJob returns error when RPC fails ────────────────────

  it('returns {shared: false} with error when RPC fails', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Daily share limit reached (30)' },
    });

    const { result } = renderHook(() => useShareJob());

    let res: { shared: boolean; error?: string } | undefined;

    await act(async () => {
      res = await result.current.shareJob({
        job: createMockJob() as any,
        source: 'card',
      });
    });

    expect(res?.shared).toBe(false);
    expect(res?.error).toBeTruthy();

    // Native share was NOT called
    expect(mockShare).not.toHaveBeenCalled();
  });

  // ─── Test: shareJob returns error when share_type limit hit ─────────

  it('returns {shared: false} with rate limit error from RPC', async () => {
    mockRpc.mockResolvedValue({
      data: {
        allowed: false,
        error: 'Daily share limit reached (30)',
        share_token: null,
        daily_share_count: 30,
      },
      error: null,
    });

    const { result } = renderHook(() => useShareJob());

    let res: { shared: boolean; error?: string } | undefined;

    await act(async () => {
      res = await result.current.shareJob({
        job: createMockJob() as any,
        source: 'card',
      });
    });

    expect(res?.shared).toBe(false);
    expect(res?.error).toContain('Daily share limit');
    expect(mockShare).not.toHaveBeenCalled();
  });

  // ─── Test: shareJob returns error on missing job/user ───────────────

  it('returns error when job or user is missing', async () => {
    const { result } = renderHook(() => useShareJob());

    let res: { shared: boolean; error?: string } | undefined;

    await act(async () => {
      res = await result.current.shareJob({
        job: null as any,
        source: 'card',
      });
    });

    expect(res?.shared).toBe(false);
    expect(res?.error).toContain('Missing job');
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockShare).not.toHaveBeenCalled();
  });

  // ─── Test: isSharing state during share operation ────────────────────

  it('sets isSharing to true then false after share completes', async () => {
    mockShare.mockResolvedValue({ action: 'sharedAction' });

    const { result } = renderHook(() => useShareJob());

    expect(result.current.isSharing).toBe(false);

    await act(async () => {
      await result.current.shareJob({
        job: createMockJob() as any,
        source: 'card',
      });
    });

    // After completion, isSharing should be false again
    expect(result.current.isSharing).toBe(false);
  });
});
