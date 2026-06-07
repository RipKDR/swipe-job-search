/**
 * ActiveSeekerBadge — Verified-like badge for profile after 30-day streak achievement.
 *
 * Shows below user name/subtitle on the profile screen.
 * When earned:  🏆  Active Seeker (accent color)
 * When lapsed:  🏆  Active Seeker (greyed out, motivational text)
 *
 * @see /plans/streak-maya-handoff.md §8
 * @see /plans/streak-jordan-handoff.md §7
 */

import React from 'react';
import { View, Text } from '@/components/tw';
import { useTheme } from '@/providers/ThemeProvider';

// ─── Types ────────────────────────────────────────────────────────────────

export interface ActiveSeekerBadgeProps {
  /** Whether the 30-day streak badge has been earned ever. */
  earned: boolean;
  /** Current streak count (for maintaining badge visibility). */
  currentStreak: number;
}

// ─── Component ────────────────────────────────────────────────────────────

export function ActiveSeekerBadge({
  earned,
  currentStreak,
}: ActiveSeekerBadgeProps) {
  const { colors } = useTheme();

  // Not earned at all — don't render anything
  if (!earned) return null;

  const isActive = currentStreak >= 1;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
        opacity: isActive ? 1 : 0.6,
      }}
      accessibilityRole="text"
      accessibilityLabel={
        isActive
          ? 'Active Seeker badge — awarded for maintaining a thirty day streak'
          : 'Active Seeker badge — keep swiping daily to maintain visibility'
      }
    >
      <Text style={{ fontSize: 14 }}>🏆</Text>
      <Text
        style={{
          color: isActive ? colors.accent : colors.muted,
          fontSize: 13,
          fontWeight: '600',
        }}
      >
        Active Seeker
      </Text>
      {!isActive && (
        <Text style={{ color: colors.muted, fontSize: 11, marginLeft: 4 }}>
          (maintain your streak)
        </Text>
      )}
    </View>
  );
}

export default ActiveSeekerBadge;
