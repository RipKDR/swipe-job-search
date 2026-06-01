import React from 'react';
import { View, Text, Pressable } from '@/components/tw';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Dimensions, type ViewStyle } from 'react-native';
import { JobCard } from './JobCard';
import { computeRotation, computeOverlayOpacity, shouldSwipe } from '@/lib/swipe-engine';
import type { Job } from '@hi-hired/shared';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_WIDTH_HALF = SCREEN_WIDTH / 2;
const SWIPE_OFF_SCREEN = SCREEN_WIDTH * 1.5;

interface SwipeCardProps {
  job: Job;
  index: 0 | 1 | 2;
  onSwipeLeft?: (jobId: string) => void;
  onSwipeRight?: (jobId: string) => void;
  onCardPress?: (job: Job) => void;
  /** Current user location for distance badge on JobCard */
  userLocation?: { latitude: number; longitude: number } | null;
}

/**
 * Scale and opacity values for stack positions.
 * Index 0 (top card) is fully visible and interactive.
 * Index 1 and 2 are progressively smaller and more transparent.
 */
const STACK_CONFIG = {
  0: { scale: 1, opacity: 1, translateY: 0 },
  1: { scale: 0.95, opacity: 0.9, translateY: -8 },
  2: { scale: 0.9, opacity: 0.8, translateY: -16 },
} as const;

/** Shared style base for PASS/APPLY swipe overlays. */
const OVERLAY_BADGE_STYLE: ViewStyle = {
  position: 'absolute',
  top: '33%',
  paddingHorizontal: 16,
  paddingVertical: 4,
  borderRadius: 9999,
};

/**
 * SwipeCard — A production-ready swipe card using Reanimated v3 + Gesture Handler.
 *
 * Renders a JobCard with gesture-driven swipe physics.
 * Only the top card (index 0) is interactive.
 *
 * Visual features:
 * - Real-time rotation based on swipe distance
 * - Shadow intensifies during active swipe
 * - "PASS" (left, grey) and "APPLY" (right, green) overlay badges
 * - Spring animation on release or off-screen swipe
 * - Stack peek for cards at index 1 and 2
 */
export function SwipeCard({
  job,
  index,
  onSwipeLeft,
  onSwipeRight,
  onCardPress,
  userLocation,
}: SwipeCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(STACK_CONFIG[index].scale);
  const cardOpacity = useSharedValue(STACK_CONFIG[index].opacity);
  const stackOffsetY = useSharedValue(STACK_CONFIG[index].translateY);

  const isTop = index === 0;

  const handleSwipeComplete = React.useCallback(
    (direction: 'left' | 'right') => {
      if (direction === 'left') {
        onSwipeLeft?.(job.id);
      } else {
        onSwipeRight?.(job.id);
      }
    },
    [job.id, onSwipeLeft, onSwipeRight],
  );

  const pan = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.3; // Subtle vertical movement
    })
    .onEnd((e) => {
      const decision = shouldSwipe(e.translationX, SCREEN_WIDTH);

      if (decision) {
        // Swipe past threshold — animate off screen
        const offX = decision.direction === 'right' ? SWIPE_OFF_SCREEN : -SWIPE_OFF_SCREEN;
        translateX.value = withSpring(offX, { damping: 15, stiffness: 100 }, () => {
          runOnJS(handleSwipeComplete)(decision.direction);
        });
      } else {
        // Snap back to center
        translateX.value = withSpring(0, { damping: 20, stiffness: 150 });
        translateY.value = withSpring(0, { damping: 20, stiffness: 150 });
      }
    });

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotation = computeRotation(translateX.value, SCREEN_WIDTH_HALF);

    // Shadow intensifies during active swipe
    const shadowOpacity = Math.min(0.5, Math.abs(translateX.value) / SCREEN_WIDTH_HALF * 0.3 + 0.15);
    const shadowRadius = Math.min(25, Math.abs(translateX.value) / SCREEN_WIDTH_HALF * 10 + 15);

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + stackOffsetY.value },
        { rotate: `${rotation}deg` },
        { scale: scale.value },
      ],
      opacity: cardOpacity.value,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 + Math.abs(translateX.value) / 20 },
      shadowOpacity,
      shadowRadius,
      elevation: 8 + Math.floor(Math.abs(translateX.value) / 50),
    };
  });

  const leftOverlayStyle = useAnimatedStyle(() => {
    const opacity = computeOverlayOpacity(translateX.value, 'left', SCREEN_WIDTH);
    return { opacity };
  });

  const rightOverlayStyle = useAnimatedStyle(() => {
    const opacity = computeOverlayOpacity(translateX.value, 'right', SCREEN_WIDTH);
    return { opacity };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          cardAnimatedStyle,
          {
            position: 'absolute',
            width: '100%',
            maxWidth: 420,
            alignSelf: 'center',
          },
        ]}
      >
        <JobCard
          job={job}
          onPress={() => onCardPress?.(job)}
          testID={`job-card-${job.id}`}
          userLocation={userLocation}
        />

        {/* Live overlays */}
        <Animated.View
          pointerEvents="none"
          style={[
            leftOverlayStyle,
            { ...OVERLAY_BADGE_STYLE, left: 24, backgroundColor: '#475569' },
          ]}
        >
          <Text className="text-white text-2xl font-bold tracking-[3px]">PASS</Text>
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[
            rightOverlayStyle,
            { ...OVERLAY_BADGE_STYLE, right: 24, backgroundColor: '#166534' },
          ]}
        >
          <Text className="text-white text-2xl font-bold tracking-[3px]">APPLY</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

export default SwipeCard;
