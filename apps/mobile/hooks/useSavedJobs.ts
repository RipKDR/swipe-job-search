/**
 * useSavedJobs — Full saved jobs list management hook.
 *
 * Fetches bookmarks INNER JOIN jobs, provides optimistic toggle/remove,
 * and O(1) isBookmarked lookup via a Set.
 *
 * @see bookmarks-jordan-handoff.md §8.3
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// ─── Types ────────────────────────────────────────────────────────────────

export type SavedJob = {
  id: string; // bookmark id
  job_id: string;
  title: string;
  employer_name: string | null;
  suburb: string;
  pay_display: string;
  pay_amount: number;
  job_type: string;
  hours_text: string | null;
  description: string | null;
  status: string | null;
  bookmarked_at: string;
};

export interface UseSavedJobsReturn {
  savedJobs: SavedJob[];
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  isFetching: boolean;
  toggleBookmark: (jobId: string) => Promise<void>;
  removeBookmark: (jobId: string) => Promise<void>;
  isBookmarked: (jobId: string) => boolean;
  refresh: () => Promise<void>;
}

// ─── Fetch saved jobs (bookmarks INNER JOIN jobs) ─────────────────────────

async function fetchSavedJobs(userId: string): Promise<SavedJob[]> {
  // Use raw query with type casting since the bookmarks table isn't in Database types yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('bookmarks')
    .select(`
      id,
      job_id,
      created_at,
      jobs!inner (
        id,
        title,
        employer_id,
        suburb,
        pay_display,
        pay_amount,
        job_type,
        hours_text,
        description,
        status
      )
    `)
    .eq('user_id', userId)
    .eq('jobs.status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[useSavedJobs] fetch error:', error.message);
    throw new Error(error.message);
  }

  // Resolve employer names via profiles table (batched)
  const employerIds = new Set<string>();
  const rawData = (data ?? []) as Array<Record<string, unknown>>;

  for (const b of rawData) {
    const job = (b as { jobs: Record<string, unknown> }).jobs as Record<string, unknown>;
    if (job.employer_id) {
      employerIds.add(job.employer_id as string);
    }
  }

  // Fetch employer names in one query
  const employerNames: Record<string, string> = {};
  if (employerIds.size > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (supabase as any)
      .from('profiles')
      .select('id, full_name')
      .in('id', Array.from(employerIds));

    if (profiles) {
      for (const p of profiles as Array<{ id: string; full_name: string | null }>) {
        if (p.full_name) {
          employerNames[p.id] = p.full_name;
        }
      }
    }
  }

  return rawData.map((b: Record<string, unknown>) => {
    const job = (b as { jobs: Record<string, unknown> }).jobs as Record<string, unknown>;
    return {
      id: b.id as string,
      job_id: b.job_id as string,
      title: job.title as string,
      employer_name: employerNames[job.employer_id as string] ?? null,
      suburb: job.suburb as string,
      pay_display: job.pay_display as string,
      pay_amount: job.pay_amount as number,
      job_type: job.job_type as string,
      hours_text: (job.hours_text as string | null) ?? null,
      description: (job.description as string | null) ?? null,
      status: (job.status as string | null) ?? null,
      bookmarked_at: b.created_at as string,
    };
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────

const SAVED_JOBS_KEY = 'bookmarks';

export function useSavedJobs(): UseSavedJobsReturn {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const queryKey = [SAVED_JOBS_KEY, userId] as const;

  const {
    data: savedJobs = [],
    isLoading,
    isError,
    error: queryError,
    isFetching,
    refetch,
  } = useQuery<SavedJob[]>({
    queryKey,
    queryFn: () => fetchSavedJobs(userId!),
    enabled: Boolean(userId),
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes in cache
  });

  // O(1) lookup Set
  const bookmarkedIds = useMemo(() => {
    return new Set(savedJobs.map((j) => j.job_id));
  }, [savedJobs]);

  const isBookmarked = useCallback(
    (jobId: string) => bookmarkedIds.has(jobId),
    [bookmarkedIds],
  );

  // ─── Mutation: toggle (via RPC) ─────────────────────────────────────────

  const toggleMutation = useMutation({
    mutationFn: async (jobId: string) => {
      if (!userId) throw new Error('Not authenticated');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('toggle_bookmark', {
        p_job_id: jobId,
      });
      if (error) throw error;
      return (data as { bookmarked: boolean })?.bookmarked ?? false;
    },
    onMutate: async (jobId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SavedJob[]>(queryKey);

      // Optimistically toggle: if currently bookmarked, remove from list.
      // If not bookmarked, we can't add optimistically (no job data), so just invalidate.
      if (previous && isBookmarked(jobId)) {
        queryClient.setQueryData<SavedJob[]>(
          queryKey,
          previous.filter((j) => j.job_id !== jobId),
        );
      }

      return { previous };
    },
    onError: (_err, _jobId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmark-state'] });
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // ─── Mutation: remove (direct delete) ───────────────────────────────────

  const removeMutation = useMutation({
    mutationFn: async (jobId: string) => {
      if (!userId) throw new Error('Not authenticated');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('job_id', jobId);
      if (error) throw error;
    },
    onMutate: async (jobId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SavedJob[]>(queryKey);

      // Optimistically remove
      if (previous) {
        queryClient.setQueryData<SavedJob[]>(
          queryKey,
          previous.filter((j) => j.job_id !== jobId),
        );
      }

      return { previous };
    },
    onError: (_err, _jobId, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmark-state'] });
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const toggleBookmark = useCallback(
    async (jobId: string) => {
      await toggleMutation.mutateAsync(jobId);
    },
    [toggleMutation],
  );

  const removeBookmark = useCallback(
    async (jobId: string) => {
      await removeMutation.mutateAsync(jobId);
    },
    [removeMutation],
  );

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    savedJobs,
    isLoading,
    isError,
    error: queryError?.message ?? null,
    isFetching,
    toggleBookmark,
    removeBookmark,
    isBookmarked,
    refresh,
  };
}
