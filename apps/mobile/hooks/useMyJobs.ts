import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export type MyJobItem = {
  id: string
  title: string
  suburb: string
  pay_display: string
  status: string
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
      const { data: jobsData, error: jobsError } = await (supabase as any)
        .from('jobs')
        .select('id,title,suburb,pay_display,status,expires_at,created_at')
        .eq('employer_id', profile!.id)
        .order('created_at', { ascending: false })

      if (jobsError) throw jobsError

      const jobs = (jobsData ?? []) as any[]
      const jobIds = (jobs ?? []).map((job) => job.id as string)
      if (jobIds.length === 0) return []

      const { data: swipesData, error: swipesError } = await (supabase as any)
        .from('swipes')
        .select('job_id')
        .eq('direction', 'right')
        .in('job_id', jobIds)

      if (swipesError) throw swipesError

      const swipes = (swipesData ?? []) as any[]
      const counts = new Map<string, number>()
      for (const swipe of swipes ?? []) {
        const jobId = swipe.job_id as string
        counts.set(jobId, (counts.get(jobId) ?? 0) + 1)
      }

      return (jobs ?? []).map((job) => ({
        ...(job as Omit<MyJobItem, 'interestedCount'>),
        interestedCount: counts.get(job.id as string) ?? 0,
      }))
    },
  })
}
