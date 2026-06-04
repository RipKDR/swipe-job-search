import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { filterJobsByDistance } from '@/lib/distance';
import type { Job } from '@hi-hired/shared';

const PAGE_SIZE = 20;
const PRE_FETCH_AT = 10; // 50% of 20-card deck
const STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes

export interface JobsPipelineOptions {
  /** Radius in km for GPS distance filtering (optional) */
  radius_km?: number;
  /** User latitude for distance filtering */
  userLat?: number;
  /** User longitude for distance filtering */
  userLng?: number;
}

export interface JobsPipelineState {
  jobs: Job[];
  currentPage: number;
  currentIndex: number;
  isLoading: boolean;
  isFetchingNext: boolean;
  error: Error | null;
  advanceIndex: () => void;
  refresh: () => void;
  isEmpty: boolean;
  /** Manually trigger prefetch of the next page (e.g. on app foreground). */
  prefetchNextPage: () => void;
}

/**
 * Fetch a specific page of jobs from Supabase (20 per page).
 * Excludes swiped jobs for the current user.
 */
async function fetchJobsPage(page: number): Promise<Job[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Fetch jobs for this page range
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .range(from, to);

  if (jobsError) {
    console.warn('[fetchJobsPage] jobs query failed:', jobsError.message);
    return [];
  }

  if (!jobs || jobs.length === 0) return [];

  // Fetch swiped job IDs to exclude them (limited to recent 500)
  const { data: swipes } = await supabase
    .from('swipes')
    .select('job_id')
    .eq('candidate_id', user.id)
    .order('created_at', { ascending: false })
    .limit(500);

  const swipedIds = new Set((swipes ?? []).map((s: { job_id: string }) => s.job_id));
  const unswiped = (jobs as Job[]).filter((j) => !swipedIds.has(j.id));

  return unswiped;
}

/**
 * Build the query key for a jobs page.
 */
function jobsQueryKey(page: number): [string, number] {
  return ['jobs-pipeline', page];
}

/**
 * useJobsPipeline — Predictive buffering for the job deck.
 *
 * Fetches jobs in pages of 20 with TanStack Query (5min staleTime).
 * Pre-fetches the next page when `currentIndex` reaches 10 (50% of the deck).
 * On page boundary, swaps to the pre-fetched batch.
 */
export function useJobsPipeline(options?: JobsPipelineOptions): JobsPipelineState {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const hasPrefetchedRef = useRef(false);

  const {
    data: fetchedJobs,
    isLoading,
    isFetching,
    error: queryError,
  } = useQuery<Job[], Error>({
    queryKey: jobsQueryKey(currentPage),
    queryFn: () => fetchJobsPage(currentPage),
    staleTime: STALE_TIME_MS,
  });

  const { radius_km, userLat, userLng } = options ?? {};
  const filteredJobs = useMemo(() => {
    if (!fetchedJobs) return [];
    if (radius_km && radius_km > 0 && userLat != null && userLng != null) {
      return filterJobsByDistance(fetchedJobs, userLat, userLng, radius_km);
    }
    return fetchedJobs;
  }, [fetchedJobs, radius_km, userLat, userLng]);

  /** Trigger prefetch of the next page. */
  const prefetchNextPage = useCallback(() => {
    const nextPage = currentPage + 1;
    queryClient.prefetchQuery({
      queryKey: jobsQueryKey(nextPage),
      queryFn: () => fetchJobsPage(nextPage),
      staleTime: STALE_TIME_MS,
    });
    hasPrefetchedRef.current = true;
  }, [currentPage, queryClient]);

  // Pre-fetch next page when currentIndex reaches 50%
  useEffect(() => {
    if (currentIndex >= PRE_FETCH_AT && !hasPrefetchedRef.current) {
      prefetchNextPage();
    }
  }, [currentIndex, prefetchNextPage]);

  // Re-prefetch on app foreground (reconnect/resume edge case)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        const nextPage = currentPage + 1;
        queryClient.prefetchQuery({
          queryKey: jobsQueryKey(nextPage),
          queryFn: () => fetchJobsPage(nextPage),
          staleTime: STALE_TIME_MS,
        });
      }
    });
    return () => subscription.remove();
  }, [currentPage, queryClient]);

  const advanceIndex = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (filteredJobs.length > 0 && nextIndex >= filteredJobs.length) {
      setCurrentPage(currentPage + 1);
      setCurrentIndex(0);
      hasPrefetchedRef.current = false;
    } else {
      setCurrentIndex(nextIndex);
    }
  }, [currentIndex, filteredJobs.length, currentPage]);

  const refresh = useCallback(() => {
    setCurrentPage(0);
    setCurrentIndex(0);
    hasPrefetchedRef.current = false;
    queryClient.invalidateQueries({ queryKey: ['jobs-pipeline'] });
  }, [queryClient]);

  const jobs = filteredJobs.slice(currentIndex);
  const isEmpty = jobs.length === 0 && !isLoading;
  const error = queryError ?? null;

  return {
    jobs,
    currentPage,
    currentIndex,
    isLoading,
    isFetchingNext: isFetching,
    error,
    advanceIndex,
    refresh,
    isEmpty,
    prefetchNextPage,
  };
}

export default useJobsPipeline;
