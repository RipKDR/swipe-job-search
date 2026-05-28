import { useMutation } from '@tanstack/react-query'
import { usePostHog } from '@/hooks/usePostHog'
import { supabase } from '@/lib/supabase'

export type CreateMatchResult = {
  status: 'matched' | 'already_matched'
  matchId: string | null
}

function isIdempotentMatchError(error: { code?: string; message?: string } | null) {
  if (!error) return false
  return error.code === '23505' || error.message?.toLowerCase().includes('duplicate key') === true
}

function mapCreateMatchError(message?: string) {
  if (!message) return 'Unable to create match right now'
  if (message.includes('CANDIDATE_NOT_INTERESTED')) return 'Candidate has not swiped right yet'
  if (message.includes('JOB_NOT_FOUND_OR_FORBIDDEN')) return 'Job was not found or you do not own it'
  if (message.includes('BLOCKED_PAIR')) return "You can't match with this candidate because one of you has blocked the other"
  if (message.includes('RATE_LIMIT_EXCEEDED')) return 'Daily match limit reached — try again tomorrow'
  return message
}

export async function createMatchRpc(jobId: string, candidateId: string): Promise<CreateMatchResult> {
  const { data, error } = await (supabase as any).rpc('create_match', {
    p_job_id: jobId,
    p_candidate_id: candidateId,
  })

  if (error) {
    if (isIdempotentMatchError(error)) {
      return { status: 'already_matched', matchId: null }
    }
    throw new Error(mapCreateMatchError(error.message))
  }

  return { status: 'matched', matchId: (data as string | null) ?? null }
}

export function useCreateMatch() {
  const posthog = usePostHog();
  return useMutation({
    mutationKey: ['create-match'],
    mutationFn: ({ jobId, candidateId }: { jobId: string; candidateId: string }) =>
      createMatchRpc(jobId, candidateId),
    onSuccess: (result, { jobId, candidateId }) => {
      if (result.status === 'matched') {
        posthog.capture('match_created', { job_id: jobId, candidate_id: candidateId, match_id: result.matchId });
      }
    },
  })
}
