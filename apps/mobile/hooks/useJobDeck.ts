import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSwipe } from './useSwipe';
import { mockJobs } from '@/lib/mocks/jobs';
import type { Job } from '@hi-hired/shared';

export interface DeckState {
  jobs: Job[];
  currentIndex: number;
  isLoading: boolean;
  error: Error | null;
}

export async function fetchJobDeck(seedJobs: Job[] = mockJobs): Promise<Job[]> {
  return seedJobs;
}

/**
 * useJobDeck: manages candidate deck (mock for U5, TanStack ready).
 * Per plan: TanStack for fetch (future), Zustand light for index/anim (here useState for minimal).
 * Optimistic remove on swipe via useSwipe + rollback support.
 * Excludes swiped (simulated).
 */
export function useJobDeck(initialJobs: Job[] = mockJobs) {
  const deckQuery = useQuery<Job[], Error>({
    queryKey: ['job-deck'],
    queryFn: () => fetchJobDeck(initialJobs),
    initialData: initialJobs,
  });
  const [jobs, setJobs] = useState<Job[]>(deckQuery.data ?? initialJobs);
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
      // In real: candidateId from useAuth().profile.id
      await doSwipe({
        candidateId: 'mock-candidate-001', // TODO: wire real auth
        jobId: topJob.id,
        direction,
      });
      // success: list already advanced (haptics handled in performSwipe)
    } catch (e: any) {
      // Rollback
      setJobs(prevJobs);
      setCurrentIndex(prevIndex);
      setSwipeError(e);
      // Toast surface (caller or here simple alert for U5)
      console.warn('[useJobDeck] swipe rollback', e?.message);
    } finally {
      setIsSwiping(false);
    }
  }, [topJob, jobs, currentIndex, doSwipe]);

  const reset = useCallback(() => {
    setJobs(deckQuery.data ?? initialJobs);
    setCurrentIndex(0);
    setSwipeError(null);
  }, [deckQuery.data, initialJobs]);

  const error = swipeError ?? deckQuery.error ?? null;
  const isLoading = isSwiping || deckQuery.isLoading;

  return {
    jobs: remainingJobs,
    currentIndex,
    topJob,
    isLoading,
    error,
    swipe,
    reset,
    isEmpty: remainingJobs.length === 0,
  };
}
