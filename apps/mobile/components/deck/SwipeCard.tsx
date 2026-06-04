import React from 'react';
import { Text } from '@/components/tw';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { JobCard } from './JobCard';
import { computeRotation, computeOverlayOpacity, shouldSwipe } from '@/lib/swipe-engine';
import type { Job } from '@hi-hired/shared';

/** Cache for haptics enabled preference — avoids AsyncStorage read on every swipe. */
let hapticsEnabledCache: boolean | null = null;

async function isHapticsEnabled(): Promise<boolean> {
  if (hapticsEnabledCache !== null) return hapticsEnabledCache;
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const val = await AsyncStorage.getItem('settings_haptics_enabled');
    hapticsEnabledCache = val !== 'false';
  } catch {
    hapticsEnabledCache = true;
  }
  return hapticsEnabledCache;
}

interface SwipeCardProps {
  job: Job;
  index: 0 | 1 | 2;
  onSwipeLeft?: (jobId: string) => void;
  onSwipeRight?: (jobId: string) => void;
  onCardPress?: (job: Job) => void;
  /** Current user location for distance badge on JobCard */
  userLocation?: { latitude: number; longitude: number } | null;
  /** Whether this card is interactive (top of stack). Background cards skip expensive queries. */
  isInteractive?: boolean;
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
const OVERLAY_BADGE_STYLE = {
  position: 'absolute',
  top: '33%',
  paddingHorizontal: 16,
  paddingVertical: 4,
  borderRadius: 9999,
} as const;

/**
 * Trigger haptic feedback based on swipe direction.
 * Respects user preference stored in AsyncStorage (cached after first read).
 * Uses light impact for pass (left) and medium for apply (right).
 */
async function triggerSwipeHaptic(direction: 'left' | 'right') {
  try {
    const enabled = await isHapticsEnabled();
    if (!enabled) return;

    if (direction === 'right') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // Haptics not available on web/simulator — silently ignore
  }
}

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
 * - Haptic feedback on swipe decision (light for pass, medium for apply)
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
  isInteractive,
}: SwipeCardProps) {
  const { width: screenWidth } = useWindowDimensions();

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(STACK_CONFIG[index].scale);
  const cardOpacity = useSharedValue(STACK_CONFIG[index].opacity);
  const stackOffsetY = useSharedValue(STACK_CONFIG[index].translateY);

  // Reactive dimension shared values — synced via useEffect so animations
  // on the UI thread always use the latest window width (handles rotation,
  // iPad split view, foldable resizes).
  const screenWidthSV = useSharedValue(screenWidth);
  const screenWidthHalfSV = useSharedValue(screenWidth / 2);
  const swipeOffScreenSV = useSharedValue(screenWidth * 1.5);

  // Sync shared values when window dimensions change
  React.useEffect(() => {
    screenWidthSV.value = screenWidth;
    screenWidthHalfSV.value = screenWidth / 2;
    swipeOffScreenSV.value = screenWidth * 1.5;
  }, [screenWidth, screenWidthSV, screenWidthHalfSV, swipeOffScreenSV]);

  const isTop = index === 0;

  const handleSwipeComplete = React.useCallback(
    (direction: 'left' | 'right') => {
      triggerSwipeHaptic(direction);
      if (direction === 'left') {
        onSwipeLeft?.(job.id);
      } else {
        onSwipeRight?.(job.id);
      }
    },
    [job.id, onSwipeLeft, onSwipeRight],
  );

  const pan = React.useMemo(() => {
    return Gesture.Pan()
      .enabled(isTop)
      .onUpdate((e) => {
        translateX.value = e.translationX;
        translateY.value = e.translationY * 0.3; // Subtle vertical movement
      })
      .onEnd((e) => {
        const sw = screenWidthSV.value;
        const decision = shouldSwipe(e.translationX, sw);

        if (decision) {
          // Swipe past threshold — animate off screen
          const offX = decision.direction === 'right' ? swipeOffScreenSV.value : -swipeOffScreenSV.value;
          translateX.value = withSpring(offX, { damping: 15, stiffness: 100 }, () => {
            runOnJS(handleSwipeComplete)(decision.direction);
          });
        } else {
          // Snap back to center
          translateX.value = withSpring(0, { damping: 20, stiffness: 150 });
          translateY.value = withSpring(0, { damping: 20, stiffness: 150 });
        }
      });
  }, [isTop]);

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const half = screenWidthHalfSV.value;
    const rotation = computeRotation(translateX.value, half);

    // Shadow intensifies during active swipe
    const shadowOpacity = Math.min(0.5, Math.abs(translateX.value) / half * 0.3 + 0.15);
    const shadowRadius = Math.min(25, Math.abs(translateX.value) / half * 10 + 15);

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
    const opacity = computeOverlayOpacity(translateX.value, 'left', screenWidthSV.value);
    return { opacity };
  });

  const rightOverlayStyle = useAnimatedStyle(() => {
    const opacity = computeOverlayOpacity(translateX.value, 'right', screenWidthSV.value);
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
          isInteractive={isInteractive}
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
