import React from 'react';
import { View, Text, Pressable } from '@/components/tw';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { JobCard } from './JobCard';
import { EmptyDeck } from './EmptyDeck';
import { computeSwipeDirection, SWIPE_THRESHOLD } from '@/lib/gesture';
import type { Job } from '@hi-hired/shared';

interface SwipeDeckProps {
  jobs: Job[];
  onSwipe: (jobId: string, direction: 'left' | 'right') => Promise<void> | void;
  onCardPress?: (job: Job) => void;
  isLoading?: boolean;
}

/**
 * SwipeDeck: gesture + Reanimated physics per GUARDRAILS + tinder ref (NativeWind).
 * - Horizontal pan only (no super/up per U5 scope)
 * - Threshold via pure lib/gesture (TDD'd)
 * - Live overlays PASS / APPLY
 * - A11y tap buttons duplicate gesture
 * - Peek stack (2 behind)
 * - Spring fly or reset
 */
export function SwipeDeck({ jobs, onSwipe, onCardPress, isLoading }: SwipeDeckProps) {
  const translateX = useSharedValue(0);
  const [localJobs, setLocalJobs] = React.useState(jobs);

  React.useEffect(() => { setLocalJobs(jobs); }, [jobs]);

  const topJob = localJobs[0];

  const handleSwipeComplete = React.useCallback((direction: 'left' | 'right') => {
    if (!topJob) return;
    // Remove top optimistically (parent also does via hook)
    setLocalJobs((prev) => prev.slice(1));
    translateX.value = 0;
    onSwipe(topJob.id, direction);
  }, [topJob, onSwipe, translateX]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      const direction = computeSwipeDirection(e.translationX, SWIPE_THRESHOLD);
      if (direction) {
        // Fly off with spring
        const to = direction === 'right' ? 500 : -500;
        translateX.value = withSpring(to, { damping: 20, stiffness: 100 }, () => {
          runOnJS(handleSwipeComplete)(direction);
        });
      } else {
        // Snap back
        translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${translateX.value / 20}deg` },
      { scale: withSpring(translateX.value !== 0 ? 1.02 : 1, { damping: 20 }) },
    ],
  }));

  const leftOpacity = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, -translateX.value / (SWIPE_THRESHOLD * 1.5))),
  }));

  const rightOpacity = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, translateX.value / (SWIPE_THRESHOLD * 1.5))),
  }));

  if (!topJob) {
    return <EmptyDeck />;
  }

  return (
    <View className="flex-1 bg-slate-950 items-center justify-center px-4 pt-8">
      {/* Peek stack (visual weight per ref) */}
      <View className="absolute w-[92%] h-[92%] -bottom-3 left-[-4%] bg-[#1f1c18] rounded-3xl border border-[#2a2723]" />
      <View className="absolute w-[96%] h-[96%] -bottom-1.5 left-[-2%] bg-[#2a2723] rounded-3xl border border-[#3a3630]" />

      {/* Top card with gesture */}
      <GestureDetector gesture={pan}>
        <Animated.View style={[cardStyle, { width: '100%', maxWidth: 340 }]}>
          <JobCard
            job={topJob}
            onPress={() => onCardPress?.(topJob)}
            testID={`job-card-${topJob.id}`}
          />
          {/* Live overlays (green APPLY / red PASS) */}
          <Animated.View
            pointerEvents="none"
            style={[leftOpacity, { position: 'absolute', top: '33%', left: 24, backgroundColor: '#475569', paddingHorizontal: 16, paddingVertical: 4, borderRadius: 9999 }]}
          >
            <Text className="text-white text-2xl font-bold tracking-[3px]">PASS</Text>
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[rightOpacity, { position: 'absolute', top: '33%', right: 24, backgroundColor: '#166534', paddingHorizontal: 16, paddingVertical: 4, borderRadius: 9999 }]}
          >
            <Text className="text-white text-2xl font-bold tracking-[3px]">APPLY</Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {/* A11y buttons (tap == swipe, motor impairment per GUARDRAILS WCAG 2.1.1) */}
      <View className="flex-row gap-6 mt-8">
        <Pressable
          onPress={() => handleSwipeComplete('left')}
          accessibilityRole="button"
          accessibilityLabel="Pass this job (swipe left)"
          className="w-16 h-16 rounded-full bg-[#475569] items-center justify-center active:opacity-80"
          testID="pass-button"
        >
          <Text className="text-white text-3xl">✕</Text>
        </Pressable>

        <Pressable
          onPress={() => handleSwipeComplete('right')}
          accessibilityRole="button"
          accessibilityLabel="I'm interested — swipe right to apply"
          className="w-16 h-16 rounded-full bg-[#166534] items-center justify-center active:opacity-80"
          testID="apply-button"
        >
          <Text className="text-white text-3xl">✓</Text>
        </Pressable>
      </View>

      <Text className="text-[#6b665f] text-xs mt-4 tracking-wide">Swipe or tap • {localJobs.length} left in circle</Text>

      {isLoading && <Text className="text-[#4ade80] mt-2 text-sm">Saving...</Text>}
    </View>
  );
}
