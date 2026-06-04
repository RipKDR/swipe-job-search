import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePostHog } from '@/hooks/usePostHog';
import { useSwipe } from '@/hooks/useSwipe';
import { useUserLocation, type UserLocation } from '@/hooks/useUserLocation';
import { useJobsPipeline } from '@/hooks/useJobsPipeline';
import { supabase } from '@/lib/supabase';
import { filterJobsByDistance } from '@/lib/distance';
import type { Job } from '@hi-hired/shared';

export interface DeckState {
  jobs: Job[];
  currentIndex: number;
  isLoading: boolean;
  error: Error | null;
}

export interface UseJobDeckOptions {
  /** Optional radius in km for GPS proximity filtering. Omit or set 0 for no filtering. */
  radius_km?: number;
}

/**
 * Fetch job deck from Supabase.
 * Returns active jobs not yet swiped by the current candidate.
 * Falls back to empty array on error (no mock data in production).
 */
export async function fetchJobDeck(): Promise<Job[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Fetch active jobs including lat/lng fields
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
 *
 * When `radius_km` is provided (> 0), uses the paged JobsPipeline
 * approach for predictive buffering instead of the full 50-job fetch.
 */
export function useJobDeck(options?: UseJobDeckOptions) {
  const radius_km = options?.radius_km ?? 0;
  const posthog = usePostHog();
  const { location: userLocation } = useUserLocation();

  // When radius_km is set and user location is available, use paged pipeline
  const usePipeline = radius_km > 0;

  // Pipeline-based approach (paged, with predictive buffering)
  const pipeline = useJobsPipeline(
    usePipeline
      ? {
          radius_km,
          userLat: userLocation?.latitude,
          userLng: userLocation?.longitude,
        }
      : undefined,
  );

  // Traditional full-fetch approach (no radius filtering)
  const deckQuery = useQuery<Job[], Error>({
    queryKey: ['job-deck'],
    queryFn: fetchJobDeck,
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !usePipeline,
  });

  const [jobs, setJobs] = useState<Job[]>(deckQuery.data ?? []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeError, setSwipeError] = useState<Error | null>(null);

  const { swipe: doSwipe } = useSwipe();

  // Apply distance filtering when fetching completes and radius is active (non-pipeline mode)
  useEffect(() => {
    if (usePipeline) return; // Pipeline handles its own filtering

    let filtered = deckQuery.data ?? [];

    if (radius_km > 0 && userLocation) {
      filtered = filterJobsByDistance(
        filtered,
        userLocation.latitude,
        userLocation.longitude,
        radius_km,
      );
    }

    if (filtered !== jobs) {
      setJobs(filtered);
      setCurrentIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckQuery.data, radius_km, userLocation?.latitude, userLocation?.longitude, usePipeline]);

  const remainingJobs = useMemo(
    () => (usePipeline ? pipeline.jobs : jobs.slice(currentIndex)),
    [usePipeline, pipeline.jobs, jobs, currentIndex],
  );
  const topJob = useMemo(() => remainingJobs[0] ?? null, [remainingJobs]);
  const allJobs = useMemo(
    () => (usePipeline ? pipeline.jobs : jobs),
    [usePipeline, pipeline.jobs, jobs],
  );

  const swipe = useCallback(async (direction: 'left' | 'right') => {
    if (!topJob) return;

    setIsSwiping(true);
    setSwipeError(null);

    // Optimistic advance
    const prevJobs = jobs;
    const prevIndex = currentIndex;

    if (usePipeline) {
      pipeline.advanceIndex();
    } else {
      setCurrentIndex((i) => i + 1);
    }

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
  }, [topJob, jobs, currentIndex, doSwipe, posthog, usePipeline, pipeline]);

  const reset = useCallback(() => {
    if (usePipeline) {
      pipeline.refresh();
    } else {
      setJobs(deckQuery.data ?? []);
      setCurrentIndex(0);
    }
    setSwipeError(null);
  }, [deckQuery.data, usePipeline, pipeline]);

  const error = swipeError ?? (usePipeline ? pipeline.error : deckQuery.error) ?? null;
  const isLoading = isSwiping || (usePipeline ? pipeline.isLoading : deckQuery.isLoading);

  // Churn signal: fire once when the candidate has swiped through every job and
  // the deck is now empty (had jobs, finished loading, nothing left).
  const deckEmptiedRef = useRef(false);
  useEffect(() => {
    const isEmpty = remainingJobs.length === 0 && !isLoading;
    if (isEmpty && allJobs.length > 0 && !deckEmptiedRef.current) {
      deckEmptiedRef.current = true;
      posthog.capture('job_deck_emptied', { jobs_seen: allJobs.length });
    }
    // Allow a fresh "emptied" event after the deck is refilled.
    if (remainingJobs.length > 0) {
      deckEmptiedRef.current = false;
    }
  }, [remainingJobs.length, isLoading, allJobs.length, posthog]);

  return {
    jobs: remainingJobs,
    allJobs,
    currentIndex: usePipeline ? pipeline.currentIndex : currentIndex,
    topJob,
    isLoading,
    error,
    swipe,
    reset,
    isEmpty: remainingJobs.length === 0 && !isLoading,
    /** Current user location (for distance badge display) */
    userLocation,
  };
}

export type { UserLocation };
