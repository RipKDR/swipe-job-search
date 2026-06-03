import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRpc = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
  },
}))

describe('useHireConfirm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls confirm_hire RPC with match id', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null })

    const { confirmHireRpc } = await import('../useHireConfirm')
    await confirmHireRpc('match-1')

    expect(mockRpc).toHaveBeenCalledWith('confirm_hire', { p_match_id: 'match-1' })
  })

  it('maps MATCH_NOT_FOUND_OR_FORBIDDEN to user-facing error', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'MATCH_NOT_FOUND_OR_FORBIDDEN' },
    })

    const { confirmHireRpc } = await import('../useHireConfirm')

    await expect(confirmHireRpc('match-1')).rejects.toThrow(
      'Match was not found or you are not a participant'
    )
  })

  it('AE4 edge: first hire tap state is hire_pending with one party confirmed', async () => {
    const { getHireBarState } = await import('../useHireConfirm')

    const state = getHireBarState(
      {
        status: 'hire_pending',
        candidate_hire_confirmed: true,
        employer_hire_confirmed: false,
        hire_initiated_by: 'candidate-1',
      },
      'candidate-1'
    )

    expect(state).toEqual({
      phase: 'awaiting_other',
      userConfirmed: true,
      otherConfirmed: false,
      canConfirm: false,
    })
  })

  it('AE4 edge: second confirm completes when both parties confirmed', async () => {
    const { getHireBarState } = await import('../useHireConfirm')

    const state = getHireBarState(
      {
        status: 'hired',
        candidate_hire_confirmed: true,
        employer_hire_confirmed: true,
        hire_initiated_by: 'candidate-1',
      },
      'employer-1'
    )

    expect(state).toEqual({
      phase: 'hired',
      userConfirmed: true,
      otherConfirmed: true,
      canConfirm: false,
    })
  })

  it('first hire tap allows confirm when status is chatting', async () => {
    const { getHireBarState } = await import('../useHireConfirm')

    const state = getHireBarState(
      {
        status: 'chatting',
        candidate_hire_confirmed: false,
        employer_hire_confirmed: false,
        hire_initiated_by: null,
      },
      'employer-1'
    )

    expect(state).toEqual({
      phase: 'can_initiate',
      userConfirmed: false,
      otherConfirmed: false,
      canConfirm: true,
    })
  })

  it('calls unmatch RPC with match id', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null })

    const { unmatchRpc } = await import('../useHireConfirm')
    await unmatchRpc('match-2')

    expect(mockRpc).toHaveBeenCalledWith('unmatch', { p_match_id: 'match-2' })
  })

  it('requires confirmation when unmatching with messages', async () => {
    const { shouldConfirmUnmatch } = await import('../useHireConfirm')

    expect(shouldConfirmUnmatch(3)).toBe(true)
    expect(shouldConfirmUnmatch(1)).toBe(true)
  })

  it('unmatches immediately when no messages exist', async () => {
    const { shouldConfirmUnmatch } = await import('../useHireConfirm')

    expect(shouldConfirmUnmatch(0)).toBe(false)
  })
})
