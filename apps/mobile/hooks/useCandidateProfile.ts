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

      return {
        id: data.id,
        fullName: data.full_name ?? 'Candidate',
        suburb: data.suburb ?? 'Unknown suburb',
        skills: (data.skills as string[] | null) ?? [],
        avatarUrl: data.avatar_url ?? null,
        experienceText: data.experience_text ?? null,
        availabilityText: data.availability_text ?? null,
        workRights: data.work_rights ?? null,
      }
    },
  })
}
