/**
 * ShareToast — Post-share confirmation toast.
 *
 * Follows the StreakSuperApplyBonus pattern: animated slide-up from bottom,
 * auto-dismiss after 3s, dismissible on tap.
 *
 * @see share-maya-handoff.md §7
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

// ─── Config ──────────────────────────────────────────────

const CONFIG: Record<string, { icon: string; message: string }> = {
  job_shared: { icon: '↗️', message: 'Job shared!' },
  invite_sent: { icon: '📤', message: 'Invite sent!' },
};

// ─── Types ───────────────────────────────────────────────

export interface ShareToastProps {
  visible: boolean;
  variant: 'job_shared' | 'invite_sent';
  onDismiss: () => void;
}

// ─── Component ───────────────────────────────────────────

export function ShareToast({ visible, variant, onDismiss }: ShareToastProps) {
  const { colors } = useTheme();
  const translateY = useSharedValue(100);
  const toastOpacity = useSharedValue(0);
  const config = CONFIG[variant] ?? CONFIG.job_shared;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      translateY.value = withDelay(200, withTiming(0, { duration: 350 }));
      toastOpacity.value = withDelay(200, withTiming(1, { duration: 250 }));

      const timer = setTimeout(() => {
        translateY.value = withTiming(100, { duration: 250 });
        toastOpacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(onDismiss)();
        });
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      translateY.value = withTiming(100, { duration: 200 });
      toastOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible, variant, translateY, toastOpacity, onDismiss]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: toastOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 90,
          left: 16,
          right: 16,
          maxWidth: 400,
          alignSelf: 'center',
          borderRadius: 14,
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
    >
      <Pressable
        onPress={() => {
          translateY.set(withTiming(100, { duration: 200 }));
          toastOpacity.set(
            withTiming(0, { duration: 150 }, () => {
              runOnJS(onDismiss)();
            }),
          );
        }}
        className="flex-row items-center gap-3"
        accessibilityRole="button"
        accessibilityLabel={`${config.message} Tap to dismiss`}
      >
        <Text className="text-lg" accessibilityElementsHidden aria-hidden>
          {config.icon}
        </Text>
        <Text className="text-white font-semibold text-sm flex-1">
          {config.message}
        </Text>
        <Text className="text-slate-500 text-xs">✕</Text>
      </Pressable>
    </Animated.View>
  );
}

export default ShareToast;
