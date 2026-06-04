import React from 'react';
import { View, Text, Pressable } from '@/components/tw';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { SwipeCard } from './SwipeCard';
import { EmptyDeck } from './EmptyDeck';
import type { Job } from '@hi-hired/shared';

interface SwipeDeckProps {
  jobs: Job[];
  onSwipe: (jobId: string, direction: 'left' | 'right') => Promise<void> | void;
  onCardPress?: (job: Job) => void;
  isLoading?: boolean;
  /** Current user location for distance badge on JobCard */
  userLocation?: { latitude: number; longitude: number } | null;
}

/**
 * SwipeDeck: gesture + Reanimated physics per GUARDRAILS + tinder ref (NativeWind).
 *
 * Renders up to 3 SwipeCards for a visual peek stack.
 * Only the top card (index 0) is interactive — indices 1 and 2 provide
 * visual depth with progressively smaller scale and lower opacity.
 *
 * Includes a11y tap buttons (PASS/APPLY) as keyboard/motor-impaired alternatives.
 */
export function SwipeDeck({ jobs, onSwipe, onCardPress, isLoading, userLocation }: SwipeDeckProps) {
  const [localJobs, setLocalJobs] = React.useState(jobs);

  React.useEffect(() => { setLocalJobs(jobs); }, [jobs]);

  // Show up to 3 cards for the peek stack
  const visibleJobs = localJobs.slice(0, 3);

  const handleSwipeLeft = React.useCallback((jobId: string) => {
    setLocalJobs((prev) => prev.filter((j) => j.id !== jobId));
    onSwipe(jobId, 'left');
  }, [onSwipe]);

  const handleSwipeRight = React.useCallback((jobId: string) => {
    setLocalJobs((prev) => prev.filter((j) => j.id !== jobId));
    onSwipe(jobId, 'right');
  }, [onSwipe]);

  const handleA11ySwipe = React.useCallback((direction: 'left' | 'right') => {
    const topJob = localJobs[0];
    if (!topJob) return;
    setLocalJobs((prev) => prev.slice(1));
    onSwipe(topJob.id, direction);
  }, [localJobs, onSwipe]);

  if (visibleJobs.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <EmptyDeck />
        {isLoading && <Text className="text-[#4ade80] mt-2 text-sm">Loading...</Text>}
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center px-4 sm:px-6 pt-6 sm:pt-8 w-full">
      {/* Card stack — render in reverse order so index 2 is at the bottom */}
      {visibleJobs.map((job, displayIndex) => {
        // Map reversed: last item in visibleJobs gets index 2 (bottom of stack)
        const stackDepth = visibleJobs.length - 1 - displayIndex;
        return (
          <ErrorBoundary key={job.id} fallback={<Text className="text-slate-400 p-4">Something went wrong here.</Text>}>
            <SwipeCard
              job={job}
              index={stackDepth as 0 | 1 | 2}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              onCardPress={onCardPress}
              userLocation={userLocation}
              isInteractive={stackDepth === 0}
            />
          </ErrorBoundary>
        );
      })}

      {/* A11y buttons (tap == swipe, motor impairment per GUARDRAILS WCAG 2.1.1) */}
      <View className="flex-row gap-6 mt-8">
        <Pressable
          onPress={() => handleA11ySwipe('left')}
          accessibilityRole="button"
          accessibilityLabel="Pass this job (swipe left)"
          className="w-16 h-16 rounded-full bg-slate-600 items-center justify-center active:opacity-80"
          testID="pass-button"
        >
          <Text className="text-white text-3xl">✕</Text>
        </Pressable>

        <Pressable
          onPress={() => handleA11ySwipe('right')}
          accessibilityRole="button"
          accessibilityLabel="I'm interested — swipe right to apply"
          className="w-16 h-16 rounded-full bg-[#166534] items-center justify-center active:opacity-80"
          testID="apply-button"
        >
          <Text className="text-white text-3xl">✓</Text>
        </Pressable>
      </View>

      <Text className="text-slate-500 text-xs mt-4 tracking-wide">
        Swipe or tap • {localJobs.length} left in circle
      </Text>

      {isLoading && <Text className="text-[#4ade80] mt-2 text-sm">Saving...</Text>}
    </View>
  );
}

export default SwipeDeck;
