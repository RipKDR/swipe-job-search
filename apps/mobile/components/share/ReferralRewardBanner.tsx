/**
 * ReferralRewardBanner — Claimable rewards banner.
 *
 * Shows when there are pending referral rewards.
 * Tap to claim individual rewards.
 *
 * @see share-jordan-handoff.md §3.8
 */

import React, { useCallback } from 'react';
import { Pressable, Text, View } from '@/components/tw';
import { useTheme } from '@/providers/ThemeProvider';
import { useReferralRewards } from '@/hooks/useReferralRewards';
import * as Haptics from 'expo-haptics';

// ─── Types ───────────────────────────────────────────────

export interface ReferralRewardBannerProps {
  /** Where this banner is shown (for analytics context) */
  location: 'deck' | 'profile';
}

// ─── Reward labels ───────────────────────────────────────

const REWARD_LABELS: Record<
  string,
  { emoji: string; label: string }
> = {
  super_applies: { emoji: '⚡', label: 'Super Apply' },
  streak_freeze: { emoji: '❄️', label: 'Streak Freeze' },
  streak_bonus: { emoji: '🔥', label: 'Streak Bonus Day' },
  badge: { emoji: '🏆', label: 'Top Referrer Badge' },
};

// ─── Component ───────────────────────────────────────────

export function ReferralRewardBanner({
  location,
}: ReferralRewardBannerProps) {
  const { colors } = useTheme();
  const {
    pendingRewards,
    isLoadingPending,
    claimReward,
    isClaiming,
  } = useReferralRewards();

  const handleClaim = useCallback(
    async (rewardId: string) => {
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
      try {
        await claimReward(rewardId);
      } catch (err) {
        console.error('[ReferralRewardBanner] Claim failed:', err);
      }
    },
    [claimReward],
  );

  // Don't render anything when loading or no rewards
  if (isLoadingPending || pendingRewards.length === 0) {
    return null;
  }

  return (
    <View className="px-4 py-2">
      {pendingRewards.map((reward) => {
        const meta = REWARD_LABELS[reward.reward_type] ?? {
          emoji: '🎁',
          label: 'Reward',
        };

        return (
          <Pressable
            key={reward.id}
            onPress={() => handleClaim(reward.id)}
            disabled={isClaiming}
            className="flex-row items-center gap-3 rounded-xl px-4 py-3 mb-2 active:opacity-80"
            style={{
              backgroundColor: colors.elevated,
              borderLeftWidth: 4,
              borderLeftColor: colors.accent,
              borderWidth: 1,
              borderColor: colors.border,
            }}
            accessibilityRole="button"
            accessibilityLabel={`You earned a ${meta.label}. Tap to claim.`}
          >
            <Text className="text-xl">{meta.emoji}</Text>
            <View className="flex-1">
              <Text className="text-sm font-semibold">
                You earned a reward!
              </Text>
              <Text className="text-xs" style={{ color: colors.muted }}>
                {meta.label} ×{reward.reward_amount} — Tap to claim
              </Text>
            </View>
            <Text
              className="text-xs font-semibold"
              style={{ color: colors.accent }}
            >
              {isClaiming ? '…' : 'Claim →'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default ReferralRewardBanner;
