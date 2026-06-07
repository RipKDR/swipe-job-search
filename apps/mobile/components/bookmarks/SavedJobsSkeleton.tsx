/**
 * SavedJobsSkeleton — Loading skeleton for the saved jobs screen.
 *
 * Shows 3-4 card placeholders with shimmer animation using Reanimated.
 *
 * @see bookmarks-maya-handoff.md §6
 */

import React, { useEffect } from 'react';
import { View } from '@/components/tw';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';

// ─── SkeletonBlock ────────────────────────────────────────────────────────

function SkeletonBlock({
  width,
  height,
  borderRadius = 8,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
}) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: colors.elevated,
        },
        animatedStyle,
      ]}
    />
  );
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────

function SkeletonCard() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 16,
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
      }}
    >
      {/* Photo placeholder */}
      <SkeletonBlock width={64} height={64} borderRadius={12} />
      {/* Text lines */}
      <View className="flex-1 gap-2">
        <SkeletonBlock width="70%" height={17} borderRadius={4} />
        <SkeletonBlock width="50%" height={13} borderRadius={4} />
        <SkeletonBlock width="40%" height={13} borderRadius={4} />
        <View className="flex-row gap-3 mt-1">
          <SkeletonBlock width={60} height={16} borderRadius={4} />
          <SkeletonBlock width={50} height={16} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────

export function SavedJobsSkeleton() {
  const { colors } = useTheme();
  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header skeleton */}
      <View className="px-4 sm:px-6 lg:px-8 max-w-4xl self-center w-full pt-12 pb-4 gap-2">
        <SkeletonBlock width={80} height={28} borderRadius={6} />
        <SkeletonBlock width={240} height={16} borderRadius={4} />
      </View>

      {/* Search bar skeleton */}
      <View className="px-4 sm:px-6 lg:px-8 max-w-4xl self-center w-full mb-4">
        <SkeletonBlock width="100%" height={40} borderRadius={12} />
      </View>

      {/* Cards */}
      <View className="px-4 sm:px-6 lg:px-8 max-w-4xl self-center w-full gap-3">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </View>
    </View>
  );
}
