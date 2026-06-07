import React from 'react';
import { View, Text } from '@/components/tw';
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
import { BookmarkButton } from '@/components/bookmarks/BookmarkButton';
import { ShareJobButton } from '@/components/share/ShareJobButton';
import {
  computeRotation,
  computeOverlayOpacity,
  computeUpOverlayOpacity,
  computeUpScale,
  shouldSwipe,
  shouldSwipeUp,
} from '@/lib/swipe-engine';
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

// ─── Super Apply counter helpers (dynamic quota: 3 default, 5 with streak bonus) ──

const SUPER_APPLY_COUNT_KEY = 'super_apply_count';
const SUPER_APPLY_DATE_KEY = 'super_apply_date';
const SUPER_APPLY_STREAK_BONUS_KEY = 'super_apply_streak_bonus';
const DAILY_LIMIT_DEFAULT = 3;
const DAILY_LIMIT_STREAK = 5;

/**
 * Get today's date string in YYYY-MM-DD format for consistent date comparison.
 */
function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Read the remaining super applies for today.
 * Returns 0 if the limit has been reached.
 * Daily limit is 3 by default, 5 if the 7-day streak bonus is active.
 */
async function getSuperApplyRemaining(): Promise<number> {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const storedDate = await AsyncStorage.getItem(SUPER_APPLY_DATE_KEY);
    const today = todayDateString();

    // Determine daily limit based on streak bonus flag
    const streakBonus = await AsyncStorage.getItem(SUPER_APPLY_STREAK_BONUS_KEY);
    const dailyLimit = streakBonus === 'true' ? DAILY_LIMIT_STREAK : DAILY_LIMIT_DEFAULT;

    // If stored date doesn't match today, reset count
    if (storedDate !== today) {
      await AsyncStorage.setItem(SUPER_APPLY_COUNT_KEY, '0');
      await AsyncStorage.setItem(SUPER_APPLY_DATE_KEY, today);
      return dailyLimit;
    }

    const countStr = await AsyncStorage.getItem(SUPER_APPLY_COUNT_KEY);
    const used = countStr ? parseInt(countStr, 10) : 0;
    return Math.max(0, dailyLimit - used);
  } catch {
    return DAILY_LIMIT_DEFAULT; // Default to allowing on error
  }
}

/**
 * Increment the super apply count and return the new remaining count.
 */
async function incrementSuperApply(): Promise<void> {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const storedDate = await AsyncStorage.getItem(SUPER_APPLY_DATE_KEY);
    const today = todayDateString();

    if (storedDate !== today) {
      // New day — reset and set 1
      await AsyncStorage.setItem(SUPER_APPLY_COUNT_KEY, '1');
      await AsyncStorage.setItem(SUPER_APPLY_DATE_KEY, today);
      return;
    }

    const countStr = await AsyncStorage.getItem(SUPER_APPLY_COUNT_KEY);
    const used = countStr ? parseInt(countStr, 10) : 0;
    await AsyncStorage.setItem(SUPER_APPLY_COUNT_KEY, String(used + 1));
  } catch {
    // Silently fail — counter is advisory
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

interface SwipeCardProps {
  job: Job;
  index: 0 | 1 | 2;
  onSwipeLeft?: (jobId: string) => void;
  onSwipeRight?: (jobId: string) => void;
  onSwipeUp?: (jobId: string) => void;
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

/** Style for the SUPER overlay badge (orange). */
const SUPER_OVERLAY_STYLE = {
  position: 'absolute',
  top: '20%',
  alignSelf: 'center',
  paddingHorizontal: 20,
  paddingVertical: 6,
  borderRadius: 9999,
  backgroundColor: '#c2410f',
} as const;

/** Style for the counter text shown during up-swipe. */
const SUPER_COUNTER_STYLE = {
  position: 'absolute',
  bottom: '25%',
  alignSelf: 'center',
} as const;

/**
 * Trigger haptic feedback based on swipe direction.
 * Respects user preference stored in AsyncStorage (cached after first read).
 * Uses light impact for pass (left) and medium for apply (right / up).
 */
async function triggerSwipeHaptic(direction: 'left' | 'right' | 'up') {
  try {
    const enabled = await isHapticsEnabled();
    if (!enabled) return;

    if (direction === 'left') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      // Right and up both use Medium feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
 * - "SUPER" (up, orange) overlay badge with 3/day limit counter
 * - Scale boost on upward drag
 * - Haptic feedback on swipe decision (light for pass, medium for apply/super)
 * - Spring animation on release or off-screen swipe
 * - Stack peek for cards at index 1 and 2
 */
export function SwipeCard({
  job,
  index,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onCardPress,
  userLocation,
  isInteractive,
}: SwipeCardProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const mountedRef = React.useRef(true);
  React.useEffect(() => () => { mountedRef.current = false; }, []);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(STACK_CONFIG[index].scale);
  const cardOpacity = useSharedValue(STACK_CONFIG[index].opacity);
  const stackOffsetY = useSharedValue(STACK_CONFIG[index].translateY);

  // Extra scale boost when dragging upward (1.0 → 1.05)
  const upScaleBoost = useSharedValue(1);

  // Reactive dimension shared values — synced via useEffect so animations
  // on the UI thread always use the latest window dimensions (handles rotation,
  // iPad split view, foldable resizes).
  const screenWidthSV = useSharedValue(screenWidth);
  const screenWidthHalfSV = useSharedValue(screenWidth / 2);
  const swipeOffScreenSV = useSharedValue(screenWidth * 1.5);
  const screenHeightSV = useSharedValue(screenHeight);

  // Sync shared values when window dimensions change
  React.useEffect(() => {
    screenWidthSV.value = screenWidth;
    screenWidthHalfSV.value = screenWidth / 2;
    swipeOffScreenSV.value = screenWidth * 1.5;
    screenHeightSV.value = screenHeight;
  }, [screenWidth, screenHeight, screenWidthSV, screenWidthHalfSV, swipeOffScreenSV, screenHeightSV]);

  const isTop = index === 0;

  const handleSwipeComplete = React.useCallback(
    (direction: 'left' | 'right' | 'up') => {
      if (!mountedRef.current) return;
      triggerSwipeHaptic(direction);
      if (direction === 'left') {
        onSwipeLeft?.(job.id);
      } else if (direction === 'right') {
        onSwipeRight?.(job.id);
      } else {
        onSwipeUp?.(job.id);
      }
    },
    [job.id, onSwipeLeft, onSwipeRight, onSwipeUp],
  );

  const pan = React.useMemo(() => {
    return Gesture.Pan()
      .enabled(isTop)
      .onUpdate((e) => {
        translateX.value = e.translationX;
        translateY.value = e.translationY * 0.3; // Subtle vertical movement

        // Scale boost on upward drag
        if (e.translationY < 0) {
          upScaleBoost.value = computeUpScale(e.translationY, screenHeightSV.value);
        } else {
          upScaleBoost.value = 1;
        }
      })
      .onEnd((e) => {
        const sw = screenWidthSV.value;
        const sh = screenHeightSV.value;
        const upScaleBoostBefore = upScaleBoost.value;

        // Reset up-scale boost immediately
        upScaleBoost.value = 1;

        // Check for up-swipe first (higher threshold, higher priority)
        const upDecision = shouldSwipeUp(e.translationY, sh, e.translationX, sw);
        if (upDecision) {
          // Check super apply limit before committing
          runOnJS(async () => {
            const remaining = await getSuperApplyRemaining();
            if (remaining > 0 && mountedRef.current) {
              // Animate card upward and off screen
              const offY = -sh * 1.5;
              translateY.value = withSpring(offY, { damping: 15, stiffness: 100 }, () => {
                runOnJS(handleSwipeComplete)('up');
              });
              runOnJS(incrementSuperApply)();
            } else {
              // Limit reached — snap back with a message
              translateY.value = withSpring(0, { damping: 20, stiffness: 150 });
              translateX.value = withSpring(0, { damping: 20, stiffness: 150 });
            }
          })();
          return;
        }

        // Check horizontal swipe
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

    const currentScale = scale.value * upScaleBoost.value;

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + stackOffsetY.value },
        { rotate: `${rotation}deg` },
        { scale: currentScale },
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

  const upOverlayStyle = useAnimatedStyle(() => {
    const opacity = computeUpOverlayOpacity(translateY.value, screenHeightSV.value);
    return { opacity };
  });

  // Determine the current super apply remaining count for the counter text
  const [superRemaining, setSuperRemaining] = React.useState<number>(3);
  const [superDailyLimit, setSuperDailyLimit] = React.useState<number>(3);

  React.useEffect(() => {
    getSuperApplyRemaining().then(setSuperRemaining);
    // Also check the streak bonus to get the correct daily limit
    import('@react-native-async-storage/async-storage').then(({ default: AsyncStorage }) => {
      AsyncStorage.getItem(SUPER_APPLY_STREAK_BONUS_KEY).then((val) => {
        setSuperDailyLimit(val === 'true' ? DAILY_LIMIT_STREAK : DAILY_LIMIT_DEFAULT);
      });
    }).catch(() => {});
  }, []);

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

        {/* Action buttons — absolute top-right, does not interfere with swipe gesture */}
        {/* Bookmark uses 'header' variant here so it doesn't add its own absolute positioning */}
        <View style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <BookmarkButton jobId={job.id} variant="header" size={24} />
          <ShareJobButton job={job} sharerName={undefined} variant="card" />
        </View>

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

        {/* SUPER overlay badge — orange, top center, only shows on up-swipe */}
        <Animated.View
          pointerEvents="none"
          style={[SUPER_OVERLAY_STYLE, upOverlayStyle]}
        >
          <Text className="text-white text-3xl font-bold tracking-[4px]">SUPER</Text>
        </Animated.View>

        {/* "1 of N used today" counter — shows on active up-swipe */}
        <Animated.View
          pointerEvents="none"
          style={[SUPER_COUNTER_STYLE, upOverlayStyle]}
        >
          <Text className="text-[#c2410f] text-sm font-semibold text-center">
            {superDailyLimit - superRemaining + 1} of {superDailyLimit} used today
          </Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

export default SwipeCard;
