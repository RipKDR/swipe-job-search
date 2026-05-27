import { useState, useCallback } from 'react';
import { useSwipe } from './useSwipe';
import { mockJobs } from '@/lib/mocks/jobs';
import type { Job } from '@hi-hired/shared';
import * as Haptics from 'expo-haptics'; // for deck scroll selection if needed

export interface DeckState {
  jobs: Job[];
  currentIndex: number;
  isLoading: boolean;
  error: Error | null;
}

/**
 * useJobDeck: manages candidate deck (mock for U5, TanStack ready).
 * Per plan: TanStack for fetch (future), Zustand light for index/anim (here useState for minimal).
 * Optimistic remove on swipe via useSwipe + rollback support.
 * Excludes swiped (simulated).
 */
export function useJobDeck(initialJobs: Job[] = mockJobs) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { swipe: doSwipe } = useSwipe();

  const remainingJobs = jobs.slice(currentIndex);
  const topJob = remainingJobs[0] ?? null;

  const swipe = useCallback(async (direction: 'left' | 'right') => {
    if (!topJob) return;

    setIsLoading(true);
    setError(null);

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
      // success: list already advanced
      await Haptics.selectionAsync();
    } catch (e: any) {
      // Rollback
      setJobs(prevJobs);
      setCurrentIndex(prevIndex);
      setError(e);
      // Toast surface (caller or here simple alert for U5)
      console.warn('[useJobDeck] swipe rollback', e?.message);
    } finally {
      setIsLoading(false);
    }
  }, [topJob, jobs, currentIndex, doSwipe]);

  const reset = useCallback(() => {
    setJobs(initialJobs);
    setCurrentIndex(0);
    setError(null);
  }, [initialJobs]);

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
