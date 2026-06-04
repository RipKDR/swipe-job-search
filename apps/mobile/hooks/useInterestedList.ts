import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export type InterestedCandidate = {
  id: string
  fullName: string
  suburb: string
  skills: string[]
  avatarUrl: string | null
  experienceText: string | null
  availabilityText: string | null
  workRights: string | null
}

export function useInterestedList(jobId: string) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['interested-list', jobId, profile?.id],
    enabled: Boolean(jobId && profile?.id),
    queryFn: async (): Promise<InterestedCandidate[]> => {
      const { data: swipesData, error: swipesError } = await supabase
        .from('swipes')
        .select('candidate_id')
        .eq('job_id', jobId)
        .eq('direction', 'right')

      if (swipesError) throw swipesError

      const swipes = (swipesData ?? []) as any[]
      const candidateIds = Array.from(new Set((swipes ?? []).map((row) => row.candidate_id as string)))
      if (candidateIds.length === 0) return []

      const [
        { data: profilesData, error: profilesError },
        { data: matchesData, error: matchesError },
        { data: blocksByEmployerData, error: blocksByEmployerError },
        { data: blocksByCandidateData, error: blocksByCandidateError },
      ] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('id,full_name,suburb,skills,avatar_url,experience_text,availability_text,work_rights')
            .in('id', candidateIds),
          supabase.from('matches').select('candidate_id').eq('job_id', jobId).in('candidate_id', candidateIds),
          supabase
            .from('blocks')
            .select('blocked_id')
            .eq('blocker_id', profile!.id)
            .in('blocked_id', candidateIds),
          supabase
            .from('blocks')
            .select('blocker_id')
            .eq('blocked_id', profile!.id)
            .in('blocker_id', candidateIds),
        ])

      if (profilesError) throw profilesError
      if (matchesError) throw matchesError
      if (blocksByEmployerError) throw blocksByEmployerError
      if (blocksByCandidateError) throw blocksByCandidateError

      const profiles = (profilesData ?? []) as any[]
      const matches = (matchesData ?? []) as any[]
      const blocksByEmployer = (blocksByEmployerData ?? []) as any[]
      const blocksByCandidate = (blocksByCandidateData ?? []) as any[]
      const matchedIds = new Set(matches.map((row) => row.candidate_id as string))
      const blockedIds = new Set([
        ...blocksByEmployer.map((row) => row.blocked_id as string),
        ...blocksByCandidate.map((row) => row.blocker_id as string),
      ])

      return (profiles ?? [])
        .filter((candidate) => !matchedIds.has(candidate.id as string) && !blockedIds.has(candidate.id as string))
        .map((candidate) => ({
          id: candidate.id as string,
          fullName: (candidate.full_name as string | null) ?? 'Candidate',
          suburb: (candidate.suburb as string | null) ?? 'Unknown suburb',
          skills: (candidate.skills as string[] | null) ?? [],
          avatarUrl: (candidate.avatar_url as string | null) ?? null,
          experienceText: (candidate.experience_text as string | null) ?? null,
          availabilityText: (candidate.availability_text as string | null) ?? null,
          workRights: (candidate.work_rights as string | null) ?? null,
        }))
    },
  })
}
