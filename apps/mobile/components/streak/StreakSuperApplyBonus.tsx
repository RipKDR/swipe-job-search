/**
 * StreakSuperApplyBonus — Toast notification for +2 Super Applies earned.
 *
 * Shows as a bottom-anchored toast above the tab bar after 7-day milestone overlay.
 * Auto-dismisses after 4 seconds or manual swipe-away.
 *
 * @see /plans/streak-maya-handoff.md §7
 */

import React, { useEffect } from 'react';
import { View, Text, Pressable } from '@/components/tw';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';
import * as Haptics from 'expo-haptics';

// ─── Types ────────────────────────────────────────────────────────────────

export interface StreakSuperApplyBonusProps {
  visible: boolean;
  onDismiss: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────

export function StreakSuperApplyBonus({
  visible,
  onDismiss,
}: StreakSuperApplyBonusProps) {
  const { colors } = useTheme();
  const translateY = useSharedValue(100);
  const toastOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // Slide in with 500ms delay
      translateY.value = withDelay(500, withTiming(0, { duration: 400 }));
      toastOpacity.value = withDelay(500, withTiming(1, { duration: 300 }));

      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => {
        translateY.value = withTiming(100, { duration: 300 });
        toastOpacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(onDismiss)();
        });
      }, 4000);

      return () => clearTimeout(timer);
    } else {
      translateY.value = withTiming(100, { duration: 200 });
      toastOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible, translateY, toastOpacity, onDismiss]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: toastOpacity.value,
  }));

  const dismiss = () => {
    translateY.set(withTiming(100, { duration: 200 }));
    toastOpacity.set(
      withTiming(0, { duration: 150 }, () => {
        runOnJS(onDismiss)();
      }),
    );
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 80, // Above tab bar
          left: 16,
          right: 16,
          maxWidth: 400,
          alignSelf: 'center',
          borderRadius: 16,
          backgroundColor: colors.elevated,
          borderLeftWidth: 4,
          borderLeftColor: colors.accent,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
          zIndex: 100,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 10,
        },
        animatedStyle,
      ]}
      accessibilityRole="alert"
      accessibilityLabel="Two bonus Super Applies added to your account for your 7-day streak."
    >
      <Pressable
        onPress={dismiss}
        className="flex-row items-start gap-3"
        accessibilityRole="button"
        accessibilityLabel="Dismiss reward notification"
      >
        {/* Icon */}
        <View className="mt-0.5">
          <Text className="text-xl" accessibilityElementsHidden aria-hidden>
            ✨
          </Text>
        </View>

        {/* Content */}
        <View className="flex-1">
          <Text className="text-white font-semibold text-sm">
            +2 Super Applies earned!
          </Text>
          <Text className="text-slate-400 text-xs mt-0.5">
            Your 7-day streak reward
          </Text>
        </View>

        {/* Close button */}
        <Pressable
          onPress={dismiss}
          className="p-1"
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <Text className="text-slate-500 text-sm">✕</Text>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

export default StreakSuperApplyBonus;
