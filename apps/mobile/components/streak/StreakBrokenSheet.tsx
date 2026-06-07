/**
 * StreakBrokenSheet — Sympathetic bottom sheet/centered modal when a streak resets.
 *
 * Shows once on first app open after a missed day.
 * "Start new streak" navigates to deck; "Maybe later" dismisses for the day.
 *
 * @see /plans/streak-maya-handoff.md §6
 */

import React, { useEffect } from 'react';
import { View, Text, Pressable } from '@/components/tw';
import { Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';
import * as Haptics from 'expo-haptics';

// ─── Types ────────────────────────────────────────────────────────────────

export interface StreakBrokenSheetProps {
  visible: boolean;
  previousStreak: number;
  onStartNewStreak: () => void;
  onDismiss: () => void;
  onMaybeLater: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────

export function StreakBrokenSheet({
  visible,
  previousStreak,
  onStartNewStreak,
  onDismiss,
  onMaybeLater,
}: StreakBrokenSheetProps) {
  const { colors } = useTheme();
  const backdropOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.85);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 300 });
      cardScale.value = withSpring(1, { damping: 14, stiffness: 180 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      cardScale.value = withTiming(0.85, { duration: 200 });
    }
  }, [visible, backdropOpacity, cardScale]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const handleStartNewStreak = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onStartNewStreak();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Animated.View
        style={[
          {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            justifyContent: 'center',
            alignItems: 'center',
          },
          backdropStyle,
        ]}
        accessibilityRole="alert"
        accessibilityLabel={`Your ${previousStreak}-day streak has ended. Tap to start a new streak.`}
      >
        <Animated.View
          style={[
            {
              width: '85%',
              maxWidth: 400,
              borderRadius: 24,
              backgroundColor: colors.elevated,
              padding: 32,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            },
            cardStyle,
          ]}
        >
          {/* Sympathetic emoji */}
          <Text className="text-5xl mb-4" accessibilityElementsHidden aria-hidden>
            😔
          </Text>

          {/* Heading */}
          <Text className="text-xl font-bold text-white text-center mb-2">
            Your streak reset
          </Text>

          {/* Body */}
          <Text className="text-base text-slate-300 text-center leading-6 mb-1">
            That's okay — every day is a fresh start.
          </Text>

          {previousStreak > 1 && (
            <Text className="text-sm text-slate-400 text-center mb-4">
              You were at {previousStreak} days. Start a new streak today with 5 quick swipes!
            </Text>
          )}

          {previousStreak <= 1 && (
            <Text className="text-sm text-slate-400 text-center mb-4">
              Still time to start fresh — 5 swipes, you've got this.
            </Text>
          )}

          {/* CTA */}
          <Pressable
            onPress={handleStartNewStreak}
            className="mt-2 w-full px-8 py-3 rounded-full bg-indigo-600 active:bg-indigo-500 items-center"
            accessibilityRole="button"
            accessibilityLabel="Start a new streak"
          >
            <Text className="text-white font-semibold text-base">
              Start new streak
            </Text>
          </Pressable>

          {/* Maybe later */}
          <Pressable
            onPress={() => {
              onMaybeLater();
              onDismiss();
            }}
            className="mt-4 py-2"
            accessibilityRole="button"
          >
            <Text className="text-slate-500 text-sm">Maybe later</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export default StreakBrokenSheet;
