import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRpc = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
  },
}))

vi.mock('@/hooks/usePostHog', () => ({
  usePostHog: () => ({ capture: vi.fn() }),
}));

describe('useCreateMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls create_match RPC with expected args', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'match-1', error: null })

    const { createMatchRpc } = await import('../useCreateMatch')
    const result = await createMatchRpc('job-1', 'candidate-1')

    expect(mockRpc).toHaveBeenCalledWith('create_match', {
      p_job_id: 'job-1',
      p_candidate_id: 'candidate-1',
    })
    expect(result).toEqual({ status: 'matched', matchId: 'match-1' })
  })

  it('maps duplicate-key errors to idempotent already-matched state', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    })

    const { createMatchRpc } = await import('../useCreateMatch')
    const result = await createMatchRpc('job-1', 'candidate-1')

    expect(result).toEqual({ status: 'already_matched', matchId: null })
  })

  it('maps known RPC domain errors to user-facing messages', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'CANDIDATE_NOT_INTERESTED' },
    })

    const { createMatchRpc } = await import('../useCreateMatch')

    await expect(createMatchRpc('job-1', 'candidate-1')).rejects.toThrow(
      'Candidate has not swiped right yet'
    )
  })

  it('maps rate limit errors to user-facing messages', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'RATE_LIMIT_EXCEEDED: Daily match limit reached.' },
    })

    const { createMatchRpc } = await import('../useCreateMatch')

    await expect(createMatchRpc('job-1', 'candidate-1')).rejects.toThrow(
      'Daily match limit reached — try again tomorrow'
    )
  })
})
