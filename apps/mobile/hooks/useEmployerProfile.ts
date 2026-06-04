/**
 * useEmployerProfile - fetches employer_profiles row by profile_id
 * for displaying employer-specific information on the profile screen.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@hi-hired/shared';

export type EmployerProfile = Database['public']['Tables']['employer_profiles']['Row'];

/**
 * Fetch the employer_profiles row for a given profile id.
 * Returns null if no employer profile exists yet.
 */
export async function fetchEmployerProfile(profileId: string): Promise<EmployerProfile | null> {
  const { data, error } = await (supabase as any)
    .from('employer_profiles')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) throw error;

  return data as EmployerProfile | null;
}

/**
 * React hook to fetch and cache employer profile data.
 * Only enabled when profileId is provided and user role is 'employer'.
 */
export function useEmployerProfile(profileId: string | undefined) {
  return useQuery<EmployerProfile | null>({
    queryKey: ['employer-profile', profileId],
    queryFn: () => fetchEmployerProfile(profileId!),
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
