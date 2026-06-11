/**
 * useReferralRewards — Fetch, track, and claim referral rewards.
 *
 * Provides pending rewards query, referral stats, and claim mutations.
 *
 * @see share-jordan-handoff.md §3.5
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { usePostHog } from '@/hooks/usePostHog';

// ─── Types ───────────────────────────────────────────────

export interface ReferralReward {
  id: string;
  referrer_id: string;
  referee_id: string | null;
  reward_type: 'super_applies' | 'streak_freeze' | 'streak_bonus' | 'badge';
  reward_amount: number;
  status: 'pending' | 'claimed' | 'expired';
  created_at: string;
  claimed_at: string | null;
}

export interface ReferralStats {
  invites_sent: number;
  friends_joined: number;
  pending_rewards: number;
}

// ─── Hook ────────────────────────────────────────────────

/**
 * Type-safe table proxy for tables not yet in the Database type definitions.
 * Follows the existing pattern used in ProfileScreen.tsx for 'streaks' table.
 */
 
const sb = supabase as any;

export function useReferralRewards() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const posthog = usePostHog();

  // ── Pending rewards query ─────────────────────────────

  const pendingQuery = useQuery<ReferralReward[]>({
    queryKey: ['referral-rewards', 'pending', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await sb
        .from('referral_rewards')
        .select('*')
        .eq('referrer_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as ReferralReward[];
    },
    enabled: Boolean(user?.id),
    staleTime: 30_000, // 30s — rewards can change when referrals complete
    refetchOnWindowFocus: true,
  });

  // ── All rewards query (for history / total earned) ─────

  const allRewardsQuery = useQuery<ReferralReward[]>({
    queryKey: ['referral-rewards', 'all', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await sb
        .from('referral_rewards')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as ReferralReward[];
    },
    enabled: Boolean(user?.id),
    staleTime: 60_000, // 1 minute
  });

  // ── Referral stats query ───────────────────────────────

  const statsQuery = useQuery<ReferralStats>({
    queryKey: ['referral-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return { invites_sent: 0, friends_joined: 0, pending_rewards: 0 };
      }

      const { count: invitesSent } = await sb
        .from('share_events')
        .select('*', { count: 'exact', head: true })
        .eq('sharer_id', user.id);

      const { count: friendsJoined } = await sb
        .from('referral_rewards')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', user.id);

      const { count: pendingRewards } = await sb
        .from('referral_rewards')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', user.id)
        .eq('status', 'pending');

      return {
        invites_sent: invitesSent ?? 0,
        friends_joined: friendsJoined ?? 0,
        pending_rewards: pendingRewards ?? 0,
      };
    },
    enabled: Boolean(user?.id),
    staleTime: 60_000, // 1 minute
  });

  // ── Claim single reward mutation ───────────────────────

  const claimMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      const { error } = await sb
        .from('referral_rewards')
        .update({
          status: 'claimed',
          claimed_at: new Date().toISOString(),
        })
        .eq('id', rewardId)
        .eq('referrer_id', user?.id);

      if (error) throw error;
    },
    onSuccess: (_data, rewardId) => {
      const reward = pendingQuery.data?.find((r) => r.id === rewardId);
      posthog?.capture('referral_reward_claimed', {
        reward_id: rewardId,
        reward_type: reward?.reward_type ?? 'unknown',
        reward_amount: reward?.reward_amount ?? 1,
      });

      queryClient.invalidateQueries({
        queryKey: ['referral-rewards', 'pending', user?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['referral-rewards', 'all', user?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['referral-stats', user?.id],
      });
    },
  });

  // ── Claim all pending mutation ─────────────────────────

  const claimAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await sb
        .from('referral_rewards')
        .update({
          status: 'claimed',
          claimed_at: new Date().toISOString(),
        })
        .eq('referrer_id', user?.id)
        .eq('status', 'pending');

      if (error) throw error;
    },
    onSuccess: () => {
      posthog?.capture('referral_rewards_claimed_all', {
        count: pendingQuery.data?.length ?? 0,
      });

      queryClient.invalidateQueries({
        queryKey: ['referral-rewards', 'pending', user?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['referral-rewards', 'all', user?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['referral-stats', user?.id],
      });
    },
  });

  // ── Derived values ─────────────────────────────────────

  const totalEarned =
    allRewardsQuery.data
      ?.filter((r) => r.status === 'claimed')
      .reduce((sum, r) => sum + r.reward_amount, 0) ?? 0;

  return {
    // Pending rewards
    pendingRewards: pendingQuery.data ?? [],
    isLoadingPending: pendingQuery.isLoading,
    pendingError: pendingQuery.error,

    // All rewards
    allRewards: allRewardsQuery.data ?? [],
    isLoadingAll: allRewardsQuery.isLoading,

    // Stats
    stats: statsQuery.data ?? {
      invites_sent: 0,
      friends_joined: 0,
      pending_rewards: 0,
    },
    isLoadingStats: statsQuery.isLoading,

    // Actions
    claimReward: claimMutation.mutateAsync,
    isClaiming: claimMutation.isPending,
    claimAll: claimAllMutation.mutateAsync,
    isClaimingAll: claimAllMutation.isPending,

    // Derived
    totalEarned,

    // Refetch
    refetchPending: pendingQuery.refetch,
    refetchAll: allRewardsQuery.refetch,
    refetchStats: statsQuery.refetch,
  };
}
