import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePostHog } from '@/hooks/usePostHog';
import { useSwipe } from './useSwipe';
import { supabase } from '@/lib/supabase';
import type { Job } from '@hi-hired/shared';

export interface DeckState {
  jobs: Job[];
  currentIndex: number;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetch job deck from Supabase.
 * Returns active jobs not yet swiped by the current candidate.
 * Falls back to empty array on error (no mock data in production).
 */
export async function fetchJobDeck(): Promise<Job[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Fetch active jobs
  const { data: jobs, error: jobsError } = await (supabase as any)
    .from('jobs')
    .select('*')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(50);

  if (jobsError) {
    console.warn('[fetchJobDeck] jobs query failed:', jobsError.message);
    return [];
  }

  if (!jobs || jobs.length === 0) return [];

  // Fetch swiped job IDs to exclude them
  const { data: swipes } = await (supabase as any)
    .from('swipes')
    .select('job_id')
    .eq('candidate_id', user.id);

  const swipedIds = new Set((swipes ?? []).map((s: { job_id: string }) => s.job_id));
  const unswiped = (jobs as Job[]).filter((j) => !swipedIds.has(j.id));

  return unswiped;
}

/**
 * useJobDeck: manages candidate deck with real Supabase data.
 * TanStack Query for fetch, optimistic remove on swipe via useSwipe.
 * Falls back to empty state when no data — no mock data in production.
 */
export function useJobDeck() {
  const posthog = usePostHog();
  const deckQuery = useQuery<Job[], Error>({
    queryKey: ['job-deck'],
    queryFn: fetchJobDeck,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
  const [jobs, setJobs] = useState<Job[]>(deckQuery.data ?? []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeError, setSwipeError] = useState<Error | null>(null);

  const { swipe: doSwipe } = useSwipe();

  useEffect(() => {
    if (deckQuery.data) {
      setJobs(deckQuery.data);
    }
  }, [deckQuery.data]);

  const remainingJobs = jobs.slice(currentIndex);
  const topJob = remainingJobs[0] ?? null;

  const swipe = useCallback(async (direction: 'left' | 'right') => {
    if (!topJob) return;

    setIsSwiping(true);
    setSwipeError(null);

    // Optimistic advance
    const prevJobs = jobs;
    const prevIndex = currentIndex;
    setCurrentIndex((i) => i + 1);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await doSwipe({
        candidateId: user.id,
        jobId: topJob.id,
        direction,
      });
      posthog.capture('job_swiped', {
        direction,
        job_id: topJob.id,
        job_title: (topJob as any).title ?? undefined,
      });
    } catch (e: any) {
      // Rollback
      setJobs(prevJobs);
      setCurrentIndex(prevIndex);
      setSwipeError(e);
      console.warn('[useJobDeck] swipe rollback', e?.message);
    } finally {
      setIsSwiping(false);
    }
  }, [topJob, jobs, currentIndex, doSwipe, posthog]);

  const reset = useCallback(() => {
    setJobs(deckQuery.data ?? []);
    setCurrentIndex(0);
    setSwipeError(null);
  }, [deckQuery.data]);

  const error = swipeError ?? deckQuery.error ?? null;
  const isLoading = isSwiping || deckQuery.isLoading;

  return {
    jobs: remainingJobs,
    allJobs: jobs,
    currentIndex,
    topJob,
    isLoading,
    error,
    swipe,
    reset,
    isEmpty: remainingJobs.length === 0 && !isLoading,
  };
}
