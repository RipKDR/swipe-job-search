import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type MatchHireFields = {
  status: 'chatting' | 'hire_pending' | 'hired' | 'unmatched' | 'archived'
  candidate_hire_confirmed: boolean
  employer_hire_confirmed: boolean
  hire_initiated_by: string | null
}

export type HireBarPhase = 'can_initiate' | 'awaiting_other' | 'can_confirm' | 'hired' | 'closed'

export type HireBarState = {
  phase: HireBarPhase
  userConfirmed: boolean
  otherConfirmed: boolean
  canConfirm: boolean
}

function mapHireError(message?: string) {
  if (!message) return 'Unable to update hire status right now'
  if (message.includes('MATCH_NOT_FOUND_OR_FORBIDDEN')) {
    return 'Match was not found or you are not a participant'
  }
  return message
}

export function getHireBarState(match: MatchHireFields, userId: string): HireBarState {
  if (match.status === 'hired') {
    return { phase: 'hired', userConfirmed: true, otherConfirmed: true, canConfirm: false }
  }

  if (match.status === 'unmatched' || match.status === 'archived') {
    return { phase: 'closed', userConfirmed: false, otherConfirmed: false, canConfirm: false }
  }

  if (match.status === 'chatting') {
    return { phase: 'can_initiate', userConfirmed: false, otherConfirmed: false, canConfirm: true }
  }

  const bothConfirmed = match.candidate_hire_confirmed && match.employer_hire_confirmed
  if (bothConfirmed) {
    return { phase: 'hired', userConfirmed: true, otherConfirmed: true, canConfirm: false }
  }

  const isInitiator = match.hire_initiated_by === userId
  if (isInitiator) {
    return { phase: 'awaiting_other', userConfirmed: true, otherConfirmed: false, canConfirm: false }
  }

  return { phase: 'can_confirm', userConfirmed: false, otherConfirmed: true, canConfirm: true }
}

export function shouldConfirmUnmatch(messageCount: number) {
  return messageCount > 0
}

export async function confirmHireRpc(matchId: string): Promise<void> {
  const { error } = await (supabase as any).rpc('confirm_hire', { p_match_id: matchId })
  if (error) throw new Error(mapHireError(error.message))
}

export async function unmatchRpc(matchId: string): Promise<void> {
  const { error } = await (supabase as any).rpc('unmatch', { p_match_id: matchId })
  if (error) throw new Error(mapHireError(error.message))
}

export function useHireConfirm() {
  const queryClient = useQueryClient()

  const confirmHire = useMutation({
    mutationKey: ['confirm-hire'],
    mutationFn: (matchId: string) => confirmHireRpc(matchId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['match-inbox'] });
      await queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
      await queryClient.invalidateQueries({ queryKey: ['interested-candidates'] });
    },
  })

  const unmatch = useMutation({
    mutationKey: ['unmatch'],
    mutationFn: (matchId: string) => unmatchRpc(matchId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['match-inbox'] });
      await queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
      await queryClient.invalidateQueries({ queryKey: ['interested-candidates'] });
    },
  })

  return { confirmHire, unmatch }
}
