import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import renderer from 'react-test-renderer';
import type { Job } from '@hi-hired/shared';
import type { JobsPipelineState } from '@/hooks/useJobsPipeline';

const mockSwipe = vi.fn().mockResolvedValue(undefined);
const mockUseQuery = vi.fn();

vi.mock('@/hooks/useSwipe', () => ({
  useSwipe: () => ({ swipe: mockSwipe }),
}));

vi.mock('expo-haptics', () => ({
  selectionAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
    },
  },
}));

vi.mock('@/hooks/useUserLocation', () => ({
  useUserLocation: () => ({
    location: null as null,
    isLoading: false,
    error: null as string | null,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/useJobsPipeline', () => ({
  useJobsPipeline: (): JobsPipelineState => ({
    jobs: [] as Job[],
    currentPage: 0,
    currentIndex: 0,
    isLoading: false,
    isFetchingNext: false,
    error: null,
    advanceIndex: vi.fn(),
    refresh: vi.fn(),
    isEmpty: true,
    prefetchNextPage: vi.fn(),
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useQueryClient: () => ({
    prefetchQuery: vi.fn(),
    invalidateQueries: vi.fn(),
  }),
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
      } as unknown as Job,
    ];

    mockUseQuery.mockReturnValue({
      data: queriedJobs,
      isLoading: false,
      error: null,
    });

    const { useJobDeck } = await import('../useJobDeck');
    let latest: any = null;
    const HookProbe = (): null => {
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
