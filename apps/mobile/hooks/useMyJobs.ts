import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { JobStatus } from '@hi-hired/shared'

export type MyJobItem = {
  id: string
  title: string
  suburb: string
  pay_display: string
  status: JobStatus
  expires_at: string
  created_at: string
  interestedCount: number
}

export function useMyJobs() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['my-jobs', profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async (): Promise<MyJobItem[]> => {
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('id,title,suburb,pay_display,status,expires_at,created_at')
        .eq('employer_id', profile!.id)
        .order('created_at', { ascending: false })

      if (jobsError) throw jobsError

      const jobs = jobsData ?? []
      const jobIds = jobs.map((job) => job.id)
      if (jobIds.length === 0) return []

      const { data: swipesData, error: swipesError } = await supabase
        .from('swipes')
        .select('job_id, candidate_id')
        .eq('direction', 'right')
        .in('job_id', jobIds)

      if (swipesError) throw swipesError

      const swipes = (swipesData ?? []) as { job_id: string; candidate_id: string }[]
      const candidateIds = Array.from(new Set(swipes.map((row) => row.candidate_id)))

      const matchedPairs = new Set<string>()
      const blockedIds = new Set<string>()

      if (candidateIds.length > 0) {
        const [
          { data: matchesData, error: matchesError },
          { data: blocksData, error: blocksError },
        ] = await Promise.all([
          supabase
            .from('matches')
            .select('job_id, candidate_id')
            .in('job_id', jobIds)
            .in('candidate_id', candidateIds),
          supabase
            .from('blocks')
            .select('blocked_id')
            .eq('blocker_id', profile!.id)
            .in('blocked_id', candidateIds),
        ])

        if (matchesError) throw matchesError
        if (blocksError) throw blocksError

        for (const row of (matchesData ?? []) as { job_id: string; candidate_id: string }[]) {
          matchedPairs.add(`${row.job_id}:${row.candidate_id}`)
        }
        for (const row of (blocksData ?? []) as { blocked_id: string }[]) {
          blockedIds.add(row.blocked_id)
        }
      }

      const counts = new Map<string, number>()
      for (const swipe of swipes) {
        const pairKey = `${swipe.job_id}:${swipe.candidate_id}`
        if (matchedPairs.has(pairKey) || blockedIds.has(swipe.candidate_id)) continue
        counts.set(swipe.job_id, (counts.get(swipe.job_id) ?? 0) + 1)
      }

      return (jobs ?? []).map((job) => ({
        ...(job as Omit<MyJobItem, 'interestedCount'>),
        interestedCount: counts.get(job.id as string) ?? 0,
      }))
    },
  })
}
