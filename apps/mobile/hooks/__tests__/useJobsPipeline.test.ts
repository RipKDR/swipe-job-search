import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from '@hi-hired/shared';

// Mock dependencies
const mockPrefetchQuery = vi.fn();
mockPrefetchQuery.mockResolvedValue(undefined);

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useQueryClient: () => ({
    prefetchQuery: mockPrefetchQuery,
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gt: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
        })),
      })),
    })),
  },
}));

const mockUseQuery = vi.fn();

function makeJob(id: string, overrides: Partial<Job> = {}): Job {
  return {
    id,
    employer_id: 'emp-1',
    circle_id: 'circle-1',
    title: `Job ${id}`,
    job_type: 'casual',
    pay_display: '$32/hr',
    pay_amount: 32,
    pay_period: 'hour',
    hours_text: 'Full time',
    suburb: 'Brunswick',
    description: 'A test job',
    photo_url: null,
    status: 'active',
    expires_at: '2026-12-31T00:00:00.000Z',
    hired_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makePage(pageNum: number, count: number = 20): Job[] {
  const jobs: Job[] = [];
  const start = pageNum * 20;
  for (let i = 0; i < count; i++) {
    jobs.push(makeJob(`job-${start + i + 1}`));
  }
  return jobs;
}

type MockQueryResult = {
  data: Job[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
};

function createMockQueryResult(overrides: Partial<MockQueryResult> = {}): MockQueryResult {
  return {
    data: undefined,
    isLoading: false,
    isFetching: false,
    error: null,
    ...overrides,
  };
}

// Default useQuery return type shape
const useQueryDefault: MockQueryResult = {
  data: undefined as Job[] | undefined,
  isLoading: false,
  isFetching: false,
  error: null as Error | null,
};

describe('useJobsPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial page of 20 jobs from TanStack Query', async () => {
    const page0 = makePage(0);
    mockUseQuery.mockReturnValue(createMockQueryResult({ data: page0 }));

    const { useJobsPipeline } = await import('../useJobsPipeline');
    let latest: any = null;

    const React = await import('react');
    const renderer = await import('react-test-renderer');
    const HookProbe = () => {
      latest = useJobsPipeline();
      return null;
    };

    renderer.act(() => {
      renderer.default.create(React.createElement(HookProbe));
    });

    expect(latest).not.toBeNull();
    expect(latest!.jobs).toHaveLength(20);
    expect(latest!.currentPage).toBe(0);
    expect(latest!.isEmpty).toBe(false);
  });

  it('advanceIndex pops top job and moves to next', async () => {
    const page0 = makePage(0);
    mockUseQuery.mockReturnValue(createMockQueryResult({ data: page0 }));

    const { useJobsPipeline } = await import('../useJobsPipeline');
    let latest: any = null;

    const React = await import('react');
    const renderer = await import('react-test-renderer');
    const HookProbe = () => {
      latest = useJobsPipeline();
      return null;
    };

    renderer.act(() => {
      renderer.default.create(React.createElement(HookProbe));
    });

    expect(latest!.jobs).toHaveLength(20);
    const firstJobId = latest!.jobs[0]?.id;

    renderer.act(() => {
      latest!.advanceIndex();
    });

    expect(latest!.jobs).toHaveLength(19);
    expect(latest!.jobs[0]?.id).not.toBe(firstJobId);
  });

  it('pre-fetches next page when index reaches 10 (50%)', async () => {
    const page0 = makePage(0);
    mockUseQuery.mockReturnValue(createMockQueryResult({ data: page0 }));

    const { useJobsPipeline } = await import('../useJobsPipeline');
    let latest: any = null;

    const React = await import('react');
    const renderer = await import('react-test-renderer');
    const HookProbe = () => {
      latest = useJobsPipeline();
      return null;
    };

    renderer.act(() => {
      renderer.default.create(React.createElement(HookProbe));
    });

    // Advance 10 times to trigger pre-fetch (at index 10, which means 11th call)
    for (let i = 0; i < 10; i++) {
      renderer.act(() => {
        latest!.advanceIndex();
      });
    }

    // Should have triggered prefetch
    expect(mockPrefetchQuery).toHaveBeenCalledTimes(1);
    expect(mockPrefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['jobs-pipeline', 1],
      })
    );
  });

  it('handles page boundary — swaps to pre-fetched batch when current exhausted', async () => {
    const page0 = makePage(0);
    mockUseQuery.mockReturnValue(createMockQueryResult({ data: page0 }));

    const { useJobsPipeline } = await import('../useJobsPipeline');
    let latest: any = null;

    const React = await import('react');
    const renderer = await import('react-test-renderer');
    const HookProbe = () => {
      latest = useJobsPipeline();
      return null;
    };

    renderer.act(() => {
      renderer.default.create(React.createElement(HookProbe));
    });

    // Advance through all 20 jobs
    for (let i = 0; i < 20; i++) {
      renderer.act(() => {
        latest!.advanceIndex();
      });
    }

    // After 20 advances, currentPage should be 1 (swapped batch)
    expect(latest!.currentPage).toBe(1);
  });

  it('exposes isLoading, isFetchingNext, error, isEmpty, refresh', async () => {
    mockUseQuery.mockReturnValue(createMockQueryResult({
      data: [],
      isLoading: true,
    }));

    const { useJobsPipeline } = await import('../useJobsPipeline');
    let latest: any = null;

    const React = await import('react');
    const renderer = await import('react-test-renderer');
    const HookProbe = () => {
      latest = useJobsPipeline();
      return null;
    };

    renderer.act(() => {
      renderer.default.create(React.createElement(HookProbe));
    });

    expect(latest!.isLoading).toBe(true);
    // isEmpty is false when loading (data may still arrive)
    expect(latest!.isEmpty).toBe(false);
    expect(latest!.error).toBeNull();
    expect(typeof latest!.refresh).toBe('function');
  });
});
