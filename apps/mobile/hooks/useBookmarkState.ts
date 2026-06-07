/**
 * useBookmarkState — Lightweight hook for checking/setting individual bookmark state.
 *
 * Used on SwipeCard + job detail for a single job-id toggle.
 * Fetches bookmark existence for one job, provides optimistic toggle via RPC.
 *
 * @see bookmarks-jordan-handoff.md §8.4
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// ─── Types ────────────────────────────────────────────────────────────────

interface BookmarkStateReturn {
  isBookmarked: boolean;
  isLoading: boolean;
  toggle: () => Promise<void>;
}

// ─── Query ────────────────────────────────────────────────────────────────

async function fetchBookmarkState(jobId: string, userId: string): Promise<boolean> {
  // Use type cast since the bookmarks table isn't in generated Database types yet
  const { data, error } = await (supabase as any)
    .from('bookmarks')
    .select('id')
    .eq('user_id', userId)
    .eq('job_id', jobId)
    .maybeSingle();

  if (error) {
    console.warn('[useBookmarkState] fetch error:', error.message);
    return false;
  }

  return data !== null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useBookmarkState(jobId: string | undefined): BookmarkStateReturn {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const queryKey = ['bookmark-state', jobId, userId] as const;

  const { data: isBookmarked = false, isLoading } = useQuery<boolean>({
    queryKey,
    queryFn: () => fetchBookmarkState(jobId!, userId!),
    enabled: Boolean(jobId && userId),
    staleTime: 60_000, // 1 minute — bookmarks don't change often
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!jobId || !userId) throw new Error('Not authenticated');
      // Cast RPC since toggle_bookmark isn't in generated types yet
      const { data, error } = await (supabase.rpc as any)('toggle_bookmark', {
        p_job_id: jobId,
      });
      if (error) throw error;
      return (data as { bookmarked?: boolean })?.bookmarked ?? !isBookmarked;
    },
    onMutate: async () => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previous = queryClient.getQueryData<boolean>(queryKey);

      // Optimistically flip
      queryClient.setQueryData<boolean>(queryKey, !isBookmarked);

      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previous !== undefined) {
        queryClient.setQueryData<boolean>(queryKey, context.previous);
      }
    },
    onSettled: () => {
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['bookmark-state'] });
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      // Also invalidate the job detail query so bookmark state is consistent
      if (jobId) {
        queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      }
    },
  });

  const toggle = useCallback(async () => {
    if (!jobId || !userId) return;
    await mutation.mutateAsync();
  }, [jobId, userId, mutation]);

  return {
    isBookmarked,
    isLoading,
    toggle,
  };
}
