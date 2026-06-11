/**
 * BookmarkButton — Reusable bookmark toggle button.
 *
 * Two variants:
 * - 'card': positioned absolute top-right on swipe cards, semi-transparent bg
 * - 'header': inline button for job detail screen header
 *
 * Features spring scale animation on toggle + haptic feedback.
 *
 * @see bookmarks-maya-handoff.md §3
 */

import React, { useCallback } from 'react';
import { Pressable, Text, View } from '@/components/tw';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useBookmarkState } from '@/hooks/useBookmarkState';

// ─── Types ────────────────────────────────────────────────────────────────

export interface BookmarkButtonProps {
  jobId: string;
  size?: number; // Default: 24
  variant?: 'card' | 'header';
}

// ─── Component ────────────────────────────────────────────────────────────

const TOUCH_SIZE = 44;
const DEFAULT_ICON_SIZE = 24;

/**
 * Renders a ★/☆ emoji bookmark toggle button.
 * Uses useBookmarkState for lightweight per-job state fetching and toggling.
 *
 * Card variant: absolute positioned, small semi-transparent background
 * Header variant: inline, standard opacity
 */
export function BookmarkButton({
  jobId,
  size = DEFAULT_ICON_SIZE,
  variant = 'card',
}: BookmarkButtonProps) {
  const { isBookmarked, isLoading, toggle } = useBookmarkState(jobId);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(
    async (e: { stopPropagation?: () => void }) => {
      // Stop event from bubbling up to swipe gesture
      e.stopPropagation?.();

      if (isLoading) return;

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      // Spring animation: scale up then back
      scale.set(
        withSpring(1.2, { damping: 8, stiffness: 200 }, () => {
          scale.set(withSpring(1, { damping: 12, stiffness: 180 }));
        }),
      );

      // Toggle bookmark state
      await toggle();
    },
    [isLoading, scale, toggle],
  );

  const containerStyle: Record<string, unknown> =
    variant === 'card'
      ? {
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 10,
        }
      : {};

  return (
    <View style={containerStyle}>
      <Pressable
        onPress={handlePress}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityLabel={isBookmarked ? 'Remove saved job' : 'Save job'}
        accessibilityState={{ selected: isBookmarked }}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={{
          width: TOUCH_SIZE,
          height: TOUCH_SIZE,
          borderRadius: TOUCH_SIZE / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isBookmarked
            ? 'rgba(99, 102, 241, 0.2)' // indigo accent at low opacity
            : variant === 'card'
              ? 'rgba(0, 0, 0, 0.4)'
              : 'transparent',
          opacity: isLoading ? 0.5 : 1,
        }}
      >
        <Animated.View style={animatedStyle}>
          <Text
            style={{
              fontSize: size,
              lineHeight: size * 1.2,
              color: isBookmarked ? '#818cf8' : '#f8fafc',
            }}
          >
            {isBookmarked ? '★' : '☆'}
          </Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}
