/**
 * StreakMilestoneOverlay — Full-screen celebration for 7-day and 30-day milestones.
 *
 * 7-day:  "🔥 7-day streak! +2 Super Applies earned"
 * 30-day: "🔥 30-day streak! Active Seeker badge unlocked!"
 *
 * Features confetti-like particle animation using Reanimated shared values.
 * Pattern follows MatchCelebration.tsx (full-screen Modal with centered card).
 *
 * @see /plans/streak-maya-handoff.md §4
 */

import React, { useEffect, useMemo } from 'react';
import { View, Text, Pressable } from '@/components/tw';
import { Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';

// ─── Types ────────────────────────────────────────────────────────────────

export interface StreakMilestoneOverlayProps {
  visible: boolean;
  milestone: 7 | 30;
  onAcknowledge: () => void;
  onClose: () => void;
}

// ─── Confetti Particle ────────────────────────────────────────────────────

interface ParticleConfig {
  x: number;
  y: number;
  color: string;
  size: number;
}

function ConfettiParticle({ config }: { config: ParticleConfig }) {
  const translateX = useSharedValue(config.x);
  const translateY = useSharedValue(config.y - 100); // start above center
  const particleScale = useSharedValue(0);
  const particleOpacity = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Stagger the start slightly
    const delay = Math.random() * 300;
    particleOpacity.value = withDelay(delay, withTiming(1, { duration: 100 }));
    particleScale.value = withDelay(delay, withSpring(1, { damping: 8, stiffness: 150 }));
    // Animate to final positions
    translateX.value = withDelay(delay, withSpring(config.x + (Math.random() - 0.5) * 60, {
      damping: 12,
      stiffness: 80,
    }));
    translateY.value = withDelay(delay, withSpring(config.y + Math.random() * 80 + 20, {
      damping: 10,
      stiffness: 60,
    }));
    rotation.value = withDelay(delay, withSpring(Math.random() * 360, {
      damping: 8,
      stiffness: 40,
    }));
  }, [translateX, translateY, particleScale, particleOpacity, rotation, config]);

  const particleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { scale: particleScale.value },
    ],
    opacity: particleOpacity.value,
    width: config.size,
    height: config.size,
    borderRadius: config.size / 2,
    backgroundColor: config.color,
    position: 'absolute' as const,
  }));

  return <Animated.View style={particleStyle} />;
}

// ─── Main Component ───────────────────────────────────────────────────────

export function StreakMilestoneOverlay({
  visible,
  milestone,
  onAcknowledge,
  onClose,
}: StreakMilestoneOverlayProps) {
  const { colors } = useTheme();
  const backdropOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.85);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 300 });
      cardScale.value = withSpring(1, { damping: 14, stiffness: 180 });

      const timer = setTimeout(() => {
        runOnJS(onClose)();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      cardScale.value = withTiming(0.85, { duration: 200 });
    }
  }, [visible, backdropOpacity, cardScale, onClose]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  // Generate confetti particles
  const particles = useMemo(() => {
    const confettiColors = [
      colors.primary,
      colors.accent,
      '#FFD700',
      '#FF6B6B',
      '#48DBFB',
      '#FF9FF3',
      '#FFFFFF',
    ];
    const items: ParticleConfig[] = [];
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const radius = 60 + Math.random() * 100;
      items.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.6,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        size: 6 + Math.random() * 8,
      });
    }
    return items;
  }, [colors.primary, colors.accent]);

  const isSeven = milestone === 7;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
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
        accessibilityLiveRegion="polite"
        accessibilityLabel={
          isSeven
            ? 'Congratulations! You reached a 7-day streak and earned 2 bonus Super Applies.'
            : 'Congratulations! You reached a 30-day streak and unlocked the Active Seeker badge.'
        }
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
          {/* Confetti layer */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              overflow: 'hidden',
              borderRadius: 24,
            }}
            pointerEvents="none"
          >
            {visible && particles.map((p, i) => (
              <ConfettiParticle key={i} config={p} />
            ))}
          </View>

          {/* Content */}
          <View className="items-center gap-4" accessibilityElementsHidden={false}>
            <Text className="text-5xl mb-2" accessibilityElementsHidden aria-hidden>
              {isSeven ? '🔥' : '🏆'}
            </Text>

            <Text className="text-2xl font-bold text-white text-center">
              {isSeven ? '7-Day Streak!' : '30-Day Streak!'}
            </Text>

            <Text className="text-base text-slate-300 text-center leading-6">
              {isSeven
                ? 'You earned +2 Super Applies!'
                : 'You unlocked the Active Seeker badge!'}
            </Text>

            <Pressable
              onPress={() => {
                onAcknowledge();
                onClose();
              }}
              className="mt-4 px-8 py-3 rounded-full bg-indigo-600 active:bg-indigo-500"
              accessibilityRole="button"
              accessibilityLabel={
                isSeven ? 'Continue and claim your reward' : 'Continue and show off your badge'
              }
            >
              <Text className="text-white font-semibold text-base">
                Awesome! Continue
              </Text>
            </Pressable>

            <Pressable onPress={onClose} className="mt-2" accessibilityRole="button">
              <Text className="text-slate-500 text-sm">Skip</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export default StreakMilestoneOverlay;
