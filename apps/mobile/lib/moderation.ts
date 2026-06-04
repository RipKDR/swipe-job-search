import { supabase } from '@/lib/supabase'
import type { Database } from '@hi-hired/shared'

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
  const payload: Database['public']['Tables']['reports']['Insert'] = {
    reporter_id: reporterId,
    reported_id: reportedId,
    reason,
    details: details?.trim() || null,
    job_id: jobId ?? null,
    match_id: matchId ?? null,
  }

  const { error } = await supabase.from('reports').insert(payload)

  if (error) throw error
}

export async function blockUser(blockerId: string, blockedId: string) {
  const payload: Database['public']['Tables']['blocks']['Insert'] = {
    blocker_id: blockerId,
    blocked_id: blockedId,
  }

  const { error } = await supabase.from('blocks').insert(payload)

  if (error) throw error
}
