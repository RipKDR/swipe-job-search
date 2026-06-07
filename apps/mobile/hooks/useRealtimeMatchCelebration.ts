import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useMatchCelebration } from '@/hooks/useMatchCelebration';

/**
 * useRealtimeMatchCelebration
 * Subscribes to Supabase Realtime on `matches` table for the current candidate.
 * When a new match is inserted (mutual right-swipe), triggers celebration overlay
 * via useMatchCelebration hook.
 *
 * Only runs on mobile (not web) and respects user's notification preferences.
 *
 * Source: Supabase Realtime docs (https://supabase.com/docs/guides/realtime)
 */
export function useRealtimeMatchCelebration() {
  const { user } = useAuth();
  const { triggerCelebration } = useMatchCelebration();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`matches-celebration-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
          filter: `candidate_id=eq.${user.id}`,
        },
        async (payload) => {
          const match = payload.new as {
            id: string;
            job_id: string;
            employer_id: string;
            jobs?: { title: string } | null;
            employer_profiles?: { business_name: string } | null;
          };

          if (!match) return;

          // Fetch job details for celebration (title + company)
          const { data: job } = await supabase
            .from('jobs')
            .select('title')
            .eq('id', match.job_id)
            .single();

          const { data: employer } = await supabase
            .from('employer_profiles')
            .select('business_name')
            .eq('profile_id', match.employer_id)
            .single();

          triggerCelebration({
            id: match.id,
            title: job?.title ?? 'Job',
            company: employer?.business_name ?? 'Employer',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, triggerCelebration]);
}
