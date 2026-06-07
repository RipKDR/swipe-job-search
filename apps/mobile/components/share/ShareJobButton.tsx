/**
 * ShareJobButton — Share icon button for swipe card overlay and job detail header.
 *
 * Two variants:
 * - 'card': absolute positioned on swipe cards, semi-transparent pill bg
 * - 'header': inline button in job detail ScreenHeader actions
 *
 * @see share-maya-handoff.md §2–3
 */

import React, { useCallback } from 'react';
import { Pressable, Text, View } from '@/components/tw';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/providers/ThemeProvider';
import { useShareJob } from '@/hooks/useShareJob';
import type { Job } from '@hi-hired/shared';

// ─── Types ───────────────────────────────────────────────

export interface ShareJobButtonProps {
  job: Job;
  /** User's display name to personalise the share message, if available */
  sharerName?: string | null;
  /** Visual variant */
  variant: 'card' | 'header';
}

// ─── Component ───────────────────────────────────────────

const TOUCH_SIZE = 44;

export function ShareJobButton({
  job,
  sharerName,
  variant,
}: ShareJobButtonProps) {
  const { colors } = useTheme();
  const { shareJob, isSharing } = useShareJob();

  const handlePress = useCallback(() => {
    if (isSharing || !job?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    shareJob({
      job,
      sharerName,
      source: variant === 'card' ? 'card' : 'detail',
    });
  }, [job, sharerName, variant, shareJob, isSharing]);

  // Card variant: absolute positioned in card overlay area
  if (variant === 'card') {
    return (
      <Pressable
        onPress={handlePress}
        disabled={isSharing}
        style={{
          width: TOUCH_SIZE,
          height: TOUCH_SIZE,
          borderRadius: TOUCH_SIZE / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isSharing
            ? `${colors.accent}20`
            : 'rgba(0, 0, 0, 0.4)',
        }}
        className="active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel={`Share ${job.title} job`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text
          className="text-base"
          style={{ opacity: isSharing ? 0.5 : 1 }}
          accessibilityElementsHidden
          aria-hidden
        >
          ↗️
        </Text>
      </Pressable>
    );
  }

  // Header variant: inline in header action row
  return (
    <Pressable
      onPress={handlePress}
      disabled={isSharing}
      style={{
        width: TOUCH_SIZE,
        height: TOUCH_SIZE,
        borderRadius: TOUCH_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isSharing ? 0.5 : 1,
      }}
      className="active:opacity-70"
      accessibilityRole="button"
      accessibilityLabel={`Share ${job.title} job`}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text className="text-lg" accessibilityElementsHidden aria-hidden>
        ↗️
      </Text>
    </Pressable>
  );
}

export default ShareJobButton;
