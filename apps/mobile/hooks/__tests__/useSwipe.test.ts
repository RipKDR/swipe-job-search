import { describe, it, expect, vi, beforeEach } from 'vitest';

// NOTE: expo-haptics is mocked at setup level (vitest.setup.ts) with vi.fn() so
// Vite's runtime require('expo-haptics') in lib/swipe.ts intercepts through
// vitest's CJS layer. The Vite-level alias was removed to avoid bypassing the mock.

// Override Platform to non-web so haptics code path fires
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (obj: any) => obj.ios || obj.default },
}));

// Mock supabase used by pure fn
const mockUpsert = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({ upsert: mockUpsert })),
  },
}));

describe('useSwipe (TDD AE1 + rollback surface + haptics per plan/GUARDRAILS)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null, data: [{}] });
  });

  it('AE1: swipe right calls upsert with correct ON CONFLICT payload', async () => {
    const { performSwipe } = await import('@/lib/swipe');
    const fakeSupabase = { from: vi.fn(() => ({ upsert: mockUpsert })) } as any;

    await performSwipe(fakeSupabase, { candidateId: 'cand-123', jobId: 'job-456', direction: 'right' });

    expect(mockUpsert).toHaveBeenCalledWith(
      [{ candidate_id: 'cand-123', job_id: 'job-456', direction: 'right' }],
      { onConflict: 'candidate_id,job_id' }
    );
  });

  it('triggers selection + direction-specific notification haptics (2026-05-28 exact)', async () => {
    const H = await import('expo-haptics');
    const { performSwipe } = await import('@/lib/swipe');
    const fakeSupabase = { from: vi.fn(() => ({ upsert: mockUpsert })) } as any;

    await performSwipe(fakeSupabase, { candidateId: 'c', jobId: 'j', direction: 'right' });
    expect(H.selectionAsync).toHaveBeenCalled();
    expect(H.notificationAsync).toHaveBeenCalledWith(H.NotificationFeedbackType.Success);

    vi.clearAllMocks();
    await performSwipe(fakeSupabase, { candidateId: 'c', jobId: 'j2', direction: 'left' });
    expect(H.notificationAsync).toHaveBeenCalledWith(H.NotificationFeedbackType.Warning);
  });

  it('failed upsert throws (caller in deck does rollback + toast)', async () => {
    mockUpsert.mockResolvedValueOnce({ error: { message: 'upsert failed' }, data: null });
    const { performSwipe } = await import('@/lib/swipe');
    const fakeSupabase = { from: vi.fn(() => ({ upsert: mockUpsert })) } as any;

    await expect(
      performSwipe(fakeSupabase, { candidateId: 'c', jobId: 'j', direction: 'right' })
    ).rejects.toThrow('upsert failed');
  });

  it('maps swipe rate limit to friendly message', async () => {
    mockUpsert.mockResolvedValueOnce({
      error: { message: 'RATE_LIMIT_EXCEEDED: Too many swipes.' },
      data: null,
    });
    const { performSwipe } = await import('@/lib/swipe');
    const fakeSupabase = { from: vi.fn(() => ({ upsert: mockUpsert })) } as any;

    await expect(
      performSwipe(fakeSupabase, { candidateId: 'c', jobId: 'j', direction: 'right' })
    ).rejects.toThrow('Too many swipes — try again in a minute');
  });

  it('useSwipe hook exports and is importable (thin wrapper)', async () => {
    const mod = await import('../useSwipe');
    expect(mod.useSwipe).toBeDefined();
    expect(typeof mod.useSwipe).toBe('function');
  });
});
