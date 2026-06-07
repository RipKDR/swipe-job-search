import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ===================== Hoisted Shared Mock State =====================

const {
  mockResponses,
  buildJobsChain,
  buildSwipesChain,
  buildMatchesChain,
  buildBlocksChain,
  authProfileRef,
} = vi.hoisted(() => {
  const authProfileRef = { current: { id: 'employer-1' } }

  const r = {
    jobsData: null as any,
    jobsError: null as any,
    swipesData: [] as any[],
    swipesError: null as any,
    interestedCount: 0,
    matchCount: 0,
  }

  const chain = (resolveWith: () => Promise<any>) => {
    const execute = () => resolveWith()
    const c: Record<string, any> = {
      select: vi.fn(() => c),
      eq: vi.fn(() => c),
      in: vi.fn(() => c),
      order: vi.fn(() => execute()),
      single: vi.fn(() => execute()),
      maybeSingle: vi.fn(() => execute()),
      range: vi.fn(() => c),
      limit: vi.fn(() => c),
      throwOnError: vi.fn(() => execute()),
      then: (resolve: (v: any) => any, reject: (r?: any) => void) =>
        execute().then(resolve, reject),
    }
    return c
  }

  const buildJobsChain = () =>
    chain(() => Promise.resolve({ data: r.jobsData, error: r.jobsError }))

  const buildSwipesChain = () =>
    chain(() =>
      Promise.resolve({
        data: r.swipesData,
        error: r.swipesError,
        count: r.interestedCount,
      }),
    )

  const buildMatchesChain = () =>
    chain(() =>
      Promise.resolve({ data: null, error: null, count: r.matchCount }),
    )

  const buildBlocksChain = () =>
    chain(() => Promise.resolve({ data: null, error: null }))

  return {
    mockResponses: r,
    buildJobsChain,
    buildSwipesChain,
    buildMatchesChain,
    buildBlocksChain,
    authProfileRef,
  }
})

// ===================== Module Mocks =====================

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      switch (table) {
        case 'jobs':
          return buildJobsChain()
        case 'swipes':
          return buildSwipesChain()
        case 'matches':
          return buildMatchesChain()
        case 'blocks':
          return buildBlocksChain()
        default:
          return buildSwipesChain()
      }
    }),
    rpc: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ profile: authProfileRef.current }),
}))

// ===================== Test Helpers =====================

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
}

function createWrapper() {
  const queryClient = createQueryClient()
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const { createElement } = require('react')
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

// ===================== Tests =====================

describe('useMyJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses.jobsData = []
    mockResponses.jobsError = null
    mockResponses.swipesData = []
    mockResponses.swipesError = null
    mockResponses.interestedCount = 0
    mockResponses.matchCount = 0
    authProfileRef.current = { id: 'employer-1' }
  })

  it('returns job data with interestedCount', async () => {
    mockResponses.jobsData = [
      {
        id: 'job-1', title: 'Chef', suburb: 'CBD', pay_display: '$40/hr',
        status: 'open', expires_at: '2026-07-01', created_at: '2026-06-01',
      },
      {
        id: 'job-2', title: 'Waiter', suburb: 'Fitzroy', pay_display: '$32/hr',
        status: 'open', expires_at: '2026-07-15', created_at: '2026-06-02',
      },
    ]

    mockResponses.swipesData = [
      { job_id: 'job-1', candidate_id: 'cand-1' },
      { job_id: 'job-1', candidate_id: 'cand-2' },
      { job_id: 'job-1', candidate_id: 'cand-3' },
      { job_id: 'job-2', candidate_id: 'cand-1' },
      { job_id: 'job-2', candidate_id: 'cand-4' },
    ]

    const { useMyJobs } = await import('../useMyJobs')
    const { result } = renderHook(() => useMyJobs(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(2)
    expect(result.current.data![0].id).toBe('job-1')
    expect(result.current.data![0].interestedCount).toBe(3)
    expect(result.current.data![1].id).toBe('job-2')
    expect(result.current.data![1].interestedCount).toBe(2)
  })

  it('returns empty array when employer has no jobs', async () => {
    mockResponses.jobsData = []

    const { useMyJobs } = await import('../useMyJobs')
    const { result } = renderHook(() => useMyJobs(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([])
  })

  it('returns error when jobs query fails', async () => {
    mockResponses.jobsError = new Error('Database connection failed')

    const { useMyJobs } = await import('../useMyJobs')
    const { result } = renderHook(() => useMyJobs(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeDefined()
    expect((result.current.error as Error).message).toContain('Database connection failed')
  })

  it('returns error when swipes query fails', async () => {
    mockResponses.jobsData = [
      { id: 'job-1', title: 'Chef', suburb: 'CBD', pay_display: '$40/hr',
        status: 'open', expires_at: '2026-07-01', created_at: '2026-06-01' },
    ]
    mockResponses.swipesError = new Error('Swipes fetch failed')

    const { useMyJobs } = await import('../useMyJobs')
    const { result } = renderHook(() => useMyJobs(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect((result.current.error as Error).message).toContain('Swipes fetch failed')
  })

  it('handles swipes error gracefully without crashing', async () => {
    mockResponses.jobsData = [
      { id: 'job-1', title: 'Chef', suburb: 'CBD', pay_display: '$40/hr',
        status: 'open', expires_at: '2026-07-01', created_at: '2026-06-01' },
    ]
    mockResponses.swipesError = new Error('Swipes unavailable')

    const { useMyJobs } = await import('../useMyJobs')
    const { result } = renderHook(() => useMyJobs(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeDefined()
  })

  it('handles jobs having no swipes data (zero interested)', async () => {
    mockResponses.jobsData = [
      { id: 'job-1', title: 'Chef', suburb: 'CBD', pay_display: '$40/hr',
        status: 'open', expires_at: '2026-07-01', created_at: '2026-06-01' },
    ]
    mockResponses.swipesData = []

    const { useMyJobs } = await import('../useMyJobs')
    const { result } = renderHook(() => useMyJobs(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0].interestedCount).toBe(0)
  })

  it('deduplicates same candidate swiping right on same job', async () => {
    mockResponses.jobsData = [
      {
        id: 'job-1', title: 'Chef', suburb: 'CBD', pay_display: '$40/hr',
        status: 'open', expires_at: '2026-07-01', created_at: '2026-06-01',
      },
    ]

    mockResponses.swipesData = [
      { job_id: 'job-1', candidate_id: 'cand-1' },
      { job_id: 'job-1', candidate_id: 'cand-1' },
      { job_id: 'job-1', candidate_id: 'cand-2' },
      { job_id: 'job-1', candidate_id: 'cand-2' },
      { job_id: 'job-1', candidate_id: 'cand-2' },
    ]

    const { useMyJobs } = await import('../useMyJobs')
    const { result } = renderHook(() => useMyJobs(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // 5 rows but only 2 unique (job, candidate) pairs
    expect(result.current.data![0].interestedCount).toBe(2)
  })
})

// ===================== useMyJobDetail tests =====================

describe('useMyJobDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses.jobsData = {} as any
    mockResponses.jobsError = null
    mockResponses.swipesData = []
    mockResponses.swipesError = null
    mockResponses.interestedCount = 0
    mockResponses.matchCount = 0
    authProfileRef.current = { id: 'employer-1' }
  })

  it('returns job detail with interestedCount and matchCount', async () => {
    mockResponses.jobsData = {
      id: 'job-1',
      title: 'Chef',
      suburb: 'CBD',
      pay_display: '$40/hr',
      status: 'open',
      created_at: '2026-06-01',
    }
    mockResponses.interestedCount = 7
    mockResponses.matchCount = 3

    const { useMyJobDetail } = await import('../useMyJobs')
    const { result } = renderHook(() => useMyJobDetail('job-1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
    expect(result.current.data!.id).toBe('job-1')
    expect(result.current.data!.title).toBe('Chef')
    expect(result.current.data!.interestedCount).toBe(7)
    expect(result.current.data!.matchCount).toBe(3)
  })
})

// ===================== Query enabled gating tests =====================

describe('query enabled gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses.jobsData = []
    mockResponses.jobsError = null
    mockResponses.swipesData = []
    mockResponses.swipesError = null
    mockResponses.interestedCount = 0
    mockResponses.matchCount = 0
    authProfileRef.current = null as any
  })

  it('useMyJobs does not fetch when profile.id is missing', async () => {
    const { useMyJobs } = await import('../useMyJobs')
    const { result } = renderHook(() => useMyJobs(), { wrapper: createWrapper() })

    // With profile.id null, the query is not enabled (fetchStatus='idle')
    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.data).toBeUndefined()
  })

  it('useMyJobDetail does not fetch when profile.id is missing', async () => {
    const { useMyJobDetail } = await import('../useMyJobs')
    const { result } = renderHook(() => useMyJobDetail('job-1'), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.data).toBeUndefined()
  })

  it('useMyJobDetail does not fetch when jobId is empty', async () => {
    authProfileRef.current = { id: 'employer-1' }

    const { useMyJobDetail } = await import('../useMyJobs')
    const { result } = renderHook(() => useMyJobDetail(''), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.data).toBeUndefined()
  })
})
