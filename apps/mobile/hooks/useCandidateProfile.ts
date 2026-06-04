import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type CandidateProfile = {
  id: string
  fullName: string
  suburb: string
  skills: string[]
  avatarUrl: string | null
  experienceText: string | null
  availabilityText: string | null
  workRights: string | null
}

export function useCandidateProfile(candidateId: string) {
  return useQuery({
    queryKey: ['candidate-profile', candidateId],
    enabled: Boolean(candidateId),
    queryFn: async (): Promise<CandidateProfile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,full_name,suburb,skills,avatar_url,experience_text,availability_text,work_rights')
        .eq('id', candidateId)
        .single()

      if (error) throw error
      if (!data) throw new Error('Candidate not found')

      const p = data as any
      return {
        id: p.id as string,
        fullName: (p.full_name as string | null) ?? 'Candidate',
        suburb: (p.suburb as string | null) ?? 'Unknown suburb',
        skills: (p.skills as string[] | null) ?? [],
        avatarUrl: (p.avatar_url as string | null) ?? null,
        experienceText: (p.experience_text as string | null) ?? null,
        availabilityText: (p.availability_text as string | null) ?? null,
        workRights: (p.work_rights as string | null) ?? null,
      }
    },
  })
}
