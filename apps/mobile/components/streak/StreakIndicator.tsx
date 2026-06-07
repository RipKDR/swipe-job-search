/**
 * StreakIndicator — Flame emoji + streak count + 5-dot progress bar.
 *
 * Positioned below ScreenHeader on the deck screen.
 * Uses Reanimated for dot-fill animations and NativeWind for layout.
 *
 * @see /plans/streak-maya-handoff.md §2
 */

import React, { useEffect } from 'react';
import { View, Text, Pressable } from '@/components/tw';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';
import { DAILY_TARGET, getNextMilestone } from '@/lib/streak';

// ─── Types ────────────────────────────────────────────────────────────────

export interface StreakIndicatorProps {
  currentStreak: number;
  todaySwipes: number;
  dailyTarget: number;
  isLoading: boolean;
  error: string | null;
  onStreakMilestone?: (day: number) => void;
}

// ─── Sub-component: Single progress dot ───────────────────────────────────

function ProgressDot({ filled, index }: { filled: boolean; index: number }) {
  const { colors } = useTheme();
  const scale = useSharedValue(filled ? 1 : 0.8);
  const opacity = useSharedValue(filled ? 1 : 0.4);

  useEffect(() => {
    if (filled) {
      // Animate in: scale up with bounce, then settle
      scale.value = withSpring(1.3, { damping: 5, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 150 });
      // Settle back to 1
      setTimeout(() => {
        scale.value = withSpring(1, { damping: 10, stiffness: 150 });
      }, 200);
    } else {
      scale.value = withTiming(0.8, { duration: 200 });
      opacity.value = withTiming(0.4, { duration: 200 });
    }
  }, [filled, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: filled ? colors.accent : 'transparent',
          borderWidth: filled ? 0 : 1.5,
          borderColor: colors.border,
        },
        animatedStyle,
      ]}
    />
  );
}

// ─── Milestone tooltip ────────────────────────────────────────────────────

function MilestoneTooltip({ currentStreak }: { currentStreak: number }) {
  const nextMilestone = getNextMilestone(currentStreak);
  const daysRemaining = nextMilestone ? nextMilestone - currentStreak : null;

  if (daysRemaining === null) return null;

  const rewardText =
    nextMilestone === 7
      ? '+2 Super Applies'
      : nextMilestone === 30
        ? 'Active Seeker badge'
        : '';

  return (
    <Text className="text-xs text-slate-400 mt-0.5">
      {daysRemaining} more day{daysRemaining !== 1 ? 's' : ''} for {rewardText}
    </Text>
  );
}

// ─── Main component ───────────────────────────────────────────────────────

export function StreakIndicator({
  currentStreak,
  todaySwipes,
  dailyTarget,
  isLoading,
  error,
}: StreakIndicatorProps) {
  const { colors } = useTheme();
  const [showTooltip, setShowTooltip] = React.useState(false);
  const tooltipOpacity = useSharedValue(0);

  const isComplete = todaySwipes >= dailyTarget;
  const progressDots = Array.from({ length: dailyTarget }, (_, i) => i < todaySwipes);

  // Pulse animation on the flame when complete
  const flameScale = useSharedValue(1);
  useEffect(() => {
    if (isComplete) {
      flameScale.value = withSpring(1.15, { damping: 4, stiffness: 180 });
      setTimeout(() => {
        flameScale.value = withSpring(1, { damping: 8, stiffness: 150 });
      }, 500);
    }
  }, [isComplete, flameScale]);

  const flameAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
  }));

  // Tooltip animation
  useEffect(() => {
    tooltipOpacity.value = withTiming(showTooltip ? 1 : 0, { duration: 200 });
  }, [showTooltip, tooltipOpacity]);

  const tooltipAnimatedStyle = useAnimatedStyle(() => ({
    opacity: tooltipOpacity.value,
  }));

  // Loading skeleton
  if (isLoading) {
    return (
      <View className="flex-row items-center justify-between px-4 sm:px-6 lg:px-8 py-3 max-w-4xl self-center w-full">
        <View className="flex-row items-center gap-2">
          <View className="w-6 h-6 rounded-full bg-slate-800/70 animate-pulse" />
          <View className="w-20 h-4 rounded bg-slate-800/70 animate-pulse" />
        </View>
        <View className="flex-row gap-2">
          {Array.from({ length: dailyTarget }, (_, i) => (
            <View key={i} className="w-2.5 h-2.5 rounded-full bg-slate-800/70 animate-pulse" />
          ))}
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <Pressable
        onPress={() => setShowTooltip(!showTooltip)}
        className="flex-row items-center justify-between px-4 sm:px-6 lg:px-8 py-3 max-w-4xl self-center w-full"
        accessibilityLabel="Streak unavailable — tap to retry"
        accessibilityRole="text"
      >
        <View className="flex-row items-center gap-2">
          <Text className="text-lg opacity-50">🔥</Text>
          <Text className="text-sm text-red-400">Streak — check connection</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => setShowTooltip(!showTooltip)}
      className="flex-row items-center justify-between px-4 sm:px-6 lg:px-8 py-3 max-w-4xl self-center w-full"
      accessibilityLabel={
        currentStreak > 0
          ? `Streak: ${currentStreak} days. You've completed ${todaySwipes} of ${dailyTarget} swipes today.`
          : `Start your streak. You've completed ${todaySwipes} of ${dailyTarget} swipes today.`
      }
      accessibilityRole="text"
      accessibilityValue={{ min: 0, max: dailyTarget, now: todaySwipes }}
    >
      {/* Left: flame + count */}
      <View className="flex-row items-center gap-2">
        <Animated.View style={flameAnimatedStyle}>
          <Text
            className={`text-lg ${isComplete ? '' : ''}`}
            accessibilityElementsHidden
            aria-hidden
          >
            🔥
          </Text>
        </Animated.View>

        <View>
          <Text className={`text-base font-bold ${currentStreak > 0 ? 'text-white' : 'text-slate-400'}`}>
            {currentStreak > 0
              ? `${currentStreak}-day streak`
              : '0-day streak'}
          </Text>
          {currentStreak > 0 && (
            <Text className="text-xs text-slate-500">
              {todaySwipes >= dailyTarget
                ? '✅ Today secured!'
                : `${dailyTarget - todaySwipes} more swipe${dailyTarget - todaySwipes !== 1 ? 's' : ''} today`}
            </Text>
          )}
          {/* Tooltip */}
          {showTooltip && currentStreak > 0 && (
            <Animated.View style={tooltipAnimatedStyle}>
              <MilestoneTooltip currentStreak={currentStreak} />
            </Animated.View>
          )}
          {currentStreak === 0 && (
            <Text className="text-xs text-slate-500">
              Swipe {dailyTarget} jobs today to start{' '}
              {todaySwipes > 0 ? '(keep going!)' : 'your streak 🔥'}
            </Text>
          )}
        </View>
      </View>

      {/* Right: progress dots */}
      <View className="flex-row items-center gap-1.5" role="progressbar" aria-valuenow={todaySwipes} aria-valuemin={0} aria-valuemax={dailyTarget}>
        {progressDots.map((filled, i) => (
          <ProgressDot key={i} filled={filled} index={i} />
        ))}
      </View>
    </Pressable>
  );
}

export default StreakIndicator;
