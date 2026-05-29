import { supabase } from '@/lib/supabase'

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'misleading_job'
  | 'inappropriate_content'
  | 'other'

export async function submitReport({
  reporterId,
  reportedId,
  reason,
  details,
  jobId,
  matchId,
}: {
  reporterId: string
  reportedId: string
  reason: ReportReason
  details?: string
  jobId?: string
  matchId?: string
}) {
  const { error } = await supabase.from('reports').insert({
    reporter_id: reporterId,
    reported_id: reportedId,
    reason,
    details: details?.trim() || null,
    job_id: jobId ?? null,
    match_id: matchId ?? null,
  })

  if (error) throw error
}

export async function blockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase.from('blocks').insert({
    blocker_id: blockerId,
    blocked_id: blockedId,
  })

  if (error) throw error
}
