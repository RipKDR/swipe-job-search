/**
 * StreakAtRiskBanner — Amber/orange warning banner shown 22:00+ AEDT if <5 swipes today.
 *
 * Slides in from the top with an animated entrance.
 * "Swipe now" navigates to the top of deck; dismiss hides for the day.
 *
 * @see /plans/streak-maya-handoff.md §5
 */

import React, { useEffect } from 'react';
import { View, Text, Pressable } from '@/components/tw';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// ─── Types ────────────────────────────────────────────────────────────────

export interface StreakAtRiskBannerProps {
  visible: boolean;
  remainingSwipes: number;
  currentStreak: number;
  onDismiss: () => void;
  onSwipeNow: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────

export function StreakAtRiskBanner({
  visible,
  remainingSwipes,
  currentStreak,
  onDismiss,
  onSwipeNow,
}: StreakAtRiskBannerProps) {
  const translateY = useSharedValue(-100);
  const bannerOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Slide in from top
      translateY.value = withSpring(0, { damping: 12, stiffness: 150 });
      bannerOpacity.value = withTiming(1, { duration: 300 });
    } else {
      // Slide back up
      translateY.value = withTiming(-100, { duration: 300 });
      bannerOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, translateY, bannerOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: bannerOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        {
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          borderBottomWidth: 1,
          borderColor: '#f59e0b',
          zIndex: 50,
        },
        animatedStyle,
      ]}
      accessibilityRole="alert"
      accessibilityLabel={`Streak at risk. You need ${remainingSwipes} more swipes before midnight to keep your ${currentStreak}-day streak.`}
    >
      <View className="flex-row items-center justify-between px-4 sm:px-6 lg:px-8 py-3 max-w-4xl self-center w-full">
        {/* Left: icon + message */}
        <View className="flex-1 flex-row items-center gap-3">
          <Text className="text-lg">⏰</Text>
          <View className="flex-1">
            <Text className="text-amber-300 text-sm font-semibold">
              Streak at risk!
            </Text>
            <Text className="text-amber-200/80 text-xs mt-0.5">
              {remainingSwipes} more swipe{remainingSwipes !== 1 ? 's' : ''} needed
              {currentStreak > 0 ? ` to keep your ${currentStreak}-day streak` : ''}
              {' '}before midnight
            </Text>
          </View>
        </View>

        {/* Right: actions */}
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onSwipeNow();
            }}
            className="px-4 py-2 rounded-full bg-amber-600 active:bg-amber-500"
            accessibilityRole="button"
            accessibilityLabel="Open swipe deck to save your streak"
          >
            <Text className="text-white text-xs font-semibold">Swipe now</Text>
          </Pressable>
          <Pressable
            onPress={onDismiss}
            className="p-2"
            accessibilityRole="button"
            accessibilityLabel="Dismiss streak at risk warning"
          >
            <Text className="text-amber-400/60 text-lg leading-none">✕</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

export default StreakAtRiskBanner;
