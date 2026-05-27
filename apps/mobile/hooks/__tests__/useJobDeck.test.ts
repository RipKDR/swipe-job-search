import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import renderer from 'react-test-renderer';
import type { Job } from '@hi-hired/shared';

const mockSwipe = vi.fn().mockResolvedValue(undefined);
const mockUseQuery = vi.fn();

vi.mock('@/hooks/useSwipe', () => ({
  useSwipe: () => ({ swipe: mockSwipe }),
}));

vi.mock('expo-haptics', () => ({
  selectionAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

describe('useJobDeck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses TanStack query data as deck source', async () => {
    const queriedJobs: Job[] = [
      {
        id: 'job-query-1',
        employer_id: 'employer-1',
        title: 'Kitchen Hand',
        suburb: 'Brunswick',
        pay_type: 'hourly',
        pay_min: 30,
        pay_max: 34,
        pay_currency: 'AUD',
        pay_display: '$30-$34/hr',
        status: 'open',
        expires_at: '2026-06-30T00:00:00.000Z',
        created_at: '2026-05-28T00:00:00.000Z',
      } as Job,
    ];

    mockUseQuery.mockReturnValue({
      data: queriedJobs,
      isLoading: false,
      error: null,
    });

    const { useJobDeck } = await import('../useJobDeck');
    let latest: ReturnType<typeof useJobDeck> | null = null;
    const HookProbe = () => {
      latest = useJobDeck();
      return null;
    };

    renderer.act(() => {
      renderer.create(React.createElement(HookProbe));
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['job-deck'],
      })
    );
    expect(latest?.topJob?.id).toBe('job-query-1');
  });
});
