/**
 * InviteFriendRow — Profile screen section for inviting friends.
 *
 * Shows:
 *   - Referral code with copy button
 *   - "Share invite link" CTA
 *   - Reward count badge if applicable
 *
 * @see share-maya-handoff.md §6
 */

import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from '@/components/tw';
import * as Haptics from 'expo-haptics';
import { setClipboardAsync } from '@/lib/clipboard';
import { useTheme } from '@/providers/ThemeProvider';
import { useInviteFriend } from '@/hooks/useInviteFriend';
import { useReferralRewards } from '@/hooks/useReferralRewards';

// ─── Component ───────────────────────────────────────────

export function InviteFriendRow() {
  const { colors } = useTheme();
  const {
    referralCode,
    inviteFriend,
    isSharing,
    isLoadingCode,
    codeError,
    refetchCode,
  } = useInviteFriend();

  const { pendingRewards } = useReferralRewards();

  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!referralCode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await setClipboardAsync(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [referralCode]);

  const handleShare = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    inviteFriend();
  }, [inviteFriend]);

  // ── Error state ──
  if (codeError) {
    return (
      <View className="px-4 py-3">
        <Pressable
          onPress={() => refetchCode()}
          className="flex-row items-center gap-2 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Tap to retry loading referral code"
        >
          <Text className="text-sm text-red-400">
            ⚠️ Couldn&rsquo;t load your referral code.{' '}
          </Text>
          <Text
            className="text-sm underline"
            style={{ color: colors.accent }}
          >
            Tap to retry.
          </Text>
        </Pressable>
      </View>
    );
  }

  // ── Loading state ──
  if (isLoadingCode) {
    return (
      <View className="px-4 py-4">
        <Text className="text-sm" style={{ color: colors.muted }}>
          Loading your referral code…
        </Text>
      </View>
    );
  }

  // ── Default state ──
  return (
    <View
      className="px-4 py-4 border-b"
      style={{ borderColor: `${colors.border}80` }}
    >
      <Pressable
        onPress={() => setShowCode(!showCode)}
        className="flex-row items-center gap-3 active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel="Invite friends"
      >
        <Text className="text-xl">📤</Text>
        <Text className="text-base flex-1" style={{ color: colors.text }}>
          Invite friends
        </Text>
        {pendingRewards.length > 0 && (
          <View
            className="rounded-full px-2 py-0.5"
            style={{ backgroundColor: colors.accent + '30' }}
          >
            <Text
              className="text-xs font-semibold"
              style={{ color: colors.accent }}
            >
              {pendingRewards.length} reward
              {pendingRewards.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
        <Text className="text-lg" style={{ color: `${colors.text}60` }}>
          ›
        </Text>
      </Pressable>

      {/* Expanded content */}
      {showCode && (
        <View className="mt-3 ml-1">
          <Text className="text-sm mb-2" style={{ color: colors.muted }}>
            Refer your friends and help them find local work on Hi-Hired.
          </Text>

          {/* Referral code row */}
          {referralCode && (
            <View
              className="flex-row items-center justify-between rounded-xl px-4 py-3 mb-3"
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View className="flex-row items-center gap-2">
                <Text className="text-sm" style={{ color: colors.muted }}>
                  Your code:
                </Text>
                <Text className="text-base font-mono font-bold tracking-wider">
                  {referralCode}
                </Text>
              </View>
              <Pressable
                onPress={handleCopy}
                className="px-3 py-1 rounded-lg"
                style={{ backgroundColor: colors.accent + '20' }}
                accessibilityRole="button"
                accessibilityLabel={`Copy referral code ${referralCode}`}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: colors.accent }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Share button */}
          <Pressable
            onPress={handleShare}
            disabled={isSharing}
            className="flex-row items-center justify-center gap-2 rounded-xl py-3"
            style={{
              backgroundColor: colors.accent,
              opacity: isSharing ? 0.6 : 1,
            }}
            accessibilityRole="button"
            accessibilityLabel="Share invite link"
          >
            <Text className="text-base">📤</Text>
            <Text
              className="text-sm font-semibold"
              style={{ color: '#fff' }}
            >
              {isSharing ? 'Preparing…' : 'Share invite link'}
            </Text>
          </Pressable>

          {/* Reward count */}
          {pendingRewards.length > 0 && (
            <Text className="text-xs mt-2 text-center" style={{ color: colors.accent }}>
              🎉 You&rsquo;ve earned {pendingRewards.length} reward
              {pendingRewards.length !== 1 ? 's' : ''}!
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export default InviteFriendRow;
