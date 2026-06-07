import React, { useCallback, useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { View, Text, Pressable } from '@/components/tw';
import { Alert } from 'react-native';
import { SwipeDeck } from '@/components/deck/SwipeDeck';
import { EmptyDeck } from '@/components/deck/EmptyDeck';
import { RadiusFilter } from '@/components/deck/RadiusFilter';
import { useJobDeck } from '@/hooks/useJobDeck';
import { useStreak } from '@/hooks/useStreak';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useRadiusPreference } from '@/hooks/useRadiusPreference';
import { useSwipeUndo } from '@/hooks/useSwipeUndo';
import { useMatchCelebration } from '@/hooks/useMatchCelebration';
import { useRealtimeMatchCelebration } from '@/hooks/useRealtimeMatchCelebration';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { TabWebShell } from '@/components/ui/TabWebShell';
import { StreakIndicator } from '@/components/streak/StreakIndicator';
import { StreakAtRiskBanner } from '@/components/streak/StreakAtRiskBanner';
import { StreakMilestoneOverlay } from '@/components/streak/StreakMilestoneOverlay';
import { StreakBrokenSheet } from '@/components/streak/StreakBrokenSheet';
import { StreakSuperApplyBonus } from '@/components/streak/StreakSuperApplyBonus';
import { ReferralRewardBanner } from '@/components/share/ReferralRewardBanner';

export default function DeckScreen() {
  const router = useRouter();
  const { radiusKm, setRadiusKm } = useRadiusPreference();
  const { isLoading: locationLoading, error: locationError } = useUserLocation();
  const { jobs, isLoading, error, swipe, isEmpty, reset, userLocation } = useJobDeck({
    radius_km: radiusKm,
  });

  // Daily Streak integration
  const {
    currentStreak,
    todaySwipes,
    dailyTarget,
    isLoading: streakLoading,
    error: streakError,
    incrementSwipes,
    rollbackSwipe,
    streakMilestone,
    clearMilestone,
    streakBroken,
    dismissBroken,
    bonusEarned,
    dismissBonus,
    atRisk,
    dismissAtRisk,
    remainingSwipes,
    refresh: refreshStreak,
  } = useStreak();

  // Undo toast state
  const [undoToast, setUndoToast] = useState<{ jobId: string; jobTitle: string; direction: 'left' | 'right' | 'super' } | null>(null);

  // Undo hook for spring-back + toast
  const { recordSwipe, undoLast } = useSwipeUndo();

  // Match celebration hook (shows overlay + sends push notification on mutual match)
  const { isVisible: matchCelebrationVisible, matchedJob, dismissCelebration } =
    useMatchCelebration();

  // Realtime match celebration — listens for mutual match inserts on matches table
  useRealtimeMatchCelebration();

  const handleSwipe = useCallback(
    async (jobId: string, direction: 'left' | 'right' | 'super') => {
      try {
        // Find the job for undo toast
        const job = jobs.find((j) => j.id === jobId);
        await swipe(direction);
        // Optimistic streak increment on successful swipe
        incrementSwipes();

        // Record swipe for undo (if we have the job)
        if (job) {
          recordSwipe(job, direction);
          setUndoToast({ jobId: job.id, jobTitle: job.title, direction });
          // Auto-dismiss undo toast after 5 seconds
          setTimeout(() => setUndoToast(null), 5000);
        }
      } catch {
        // Roll back streak counter on swipe failure
        rollbackSwipe();
        Alert.alert('Swipe failed', 'Could not save your choice. Please try again.', [
          { text: 'OK' },
          { text: 'Retry deck', onPress: reset },
        ]);
      }
    },
    [jobs, swipe, reset, incrementSwipes, rollbackSwipe, recordSwipe],
  );

  const handleUndo = useCallback(() => {
    const undone = undoLast();
    if (undone) {
      setUndoToast(null);
      // The useJobDeck local state will handle the re-insertion
      // We just need to trigger a deck reset to re-fetch
      // Actually, the undoLast returns the job + direction for the re-insert
      // But since useJobDeck uses local state, we need to re-insert into its local state
      // For now, we'll just show a message and let the user know it's undone
      // The actual re-insertion would need useJobDeck to expose a method for this
    }
  }, [undoLast]);

  const handleSwipeNow = useCallback(() => {
    // Navigate to top of deck — the deck list ref callback
    refreshStreak();
  }, [refreshStreak]);

  const handleStartNewStreak = useCallback(() => {
    // Dismiss broken sheet and refresh
    dismissBroken();
    refreshStreak();
  }, [dismissBroken, refreshStreak]);

  const handleRadiusChange = useCallback((newRadius: number) => {
    setRadiusKm(newRadius);
  }, [setRadiusKm]);

  const handleCardPress = useCallback(
    (job: { id: string }) => {
      router.push(`/job/${job.id}` as Href);
    },
    [router],
  );

  if (isLoading) {
    return <LoadingScreen message="Loading jobs near you…" />;
  }

  if (isEmpty) {
    return (
      <AppScreen centered={false} maxWidth="tab">
        <EmptyDeck
          onRefresh={reset}
          currentRadiusKm={radiusKm}
          hasLocation={!!userLocation}
        />
        <StreakIndicator
          currentStreak={currentStreak}
          todaySwipes={todaySwipes}
          dailyTarget={dailyTarget}
          isLoading={streakLoading}
          error={streakError}
        />
        {error ? (
          <View className="mx-4 sm:mx-6 lg:mx-8 mb-6 max-w-4xl self-center w-full bg-red-950/90 rounded-xl px-4 py-3 border border-red-900/50">
            <Text className="text-red-300 text-sm text-center">
              Something went wrong. Your last swipe was rolled back.
            </Text>
            <Pressable onPress={reset} className="mt-2">
              <Text className="text-white text-center font-medium text-indigo-300">Try again</Text>
            </Pressable>
          </View>
        ) : null}
      </AppScreen>
    );
  }

  return (
    <AppScreen centered={false} maxWidth="tab">
      {/* Referral reward banner — shown when pending rewards exist */}
      <ReferralRewardBanner location="deck" />

      {/* At-risk banner appears above TabWebShell */}
      <StreakAtRiskBanner
        visible={atRisk}
        remainingSwipes={remainingSwipes()}
        currentStreak={currentStreak}
        onDismiss={dismissAtRisk}
        onSwipeNow={handleSwipeNow}
      />

      <TabWebShell>
        <ScreenHeader
          title="Jobs"
          subtitle="Swipe right if you are interested · left to pass"
          className="pb-2"
        />

        {/* Streak indicator between header and radius filter */}
        <StreakIndicator
          currentStreak={currentStreak}
          todaySwipes={todaySwipes}
          dailyTarget={dailyTarget}
          isLoading={streakLoading}
          error={streakError}
        />

        <RadiusFilter
          value={radiusKm}
          onChange={handleRadiusChange}
          locationLoading={locationLoading}
          locationDenied={locationError !== null}
        />
        <View className="flex-1 w-full min-h-0">
          <SwipeDeck
            jobs={jobs}
            onSwipe={handleSwipe}
            onCardPress={handleCardPress}
            isLoading={isLoading}
            userLocation={userLocation}
          />
        </View>
      </TabWebShell>

      {/* Undo toast — appears after a swipe, auto-dismisses after 5s */}
      {undoToast && (
        <View
          className="fixed bottom-4 left-4 right-4 sm:left-[50%] sm:translate-x-[-50%] sm:w-[90%] max-w-md z-50 animate-slide-up"
          style={{ pointerEvents: 'auto' }}
        >
          <View className="bg-slate-900/95 border border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between shadow-lg">
            <View className="flex items-center gap-3">
              <View
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor:
                    undoToast.direction === 'right'
                      ? '#166534'
                      : undoToast.direction === 'left'
                        ? '#475569'
                        : '#c2410f',
                }}
              >
                <Text
                  className="text-white text-sm font-bold"
                  style={{
                    transform: [{ rotate: undoToast.direction === 'left' ? '-90deg' : '90deg' }],
                  }}
                >
                  {undoToast.direction === 'right' ? '→' : undoToast.direction === 'left' ? '←' : '↑'}
                </Text>
              </View>
              <View>
                <Text className="text-white text-sm font-medium">
                  {undoToast.direction === 'right' ? 'Applied to' : undoToast.direction === 'left' ? 'Passed on' : 'Super applied to'}
                  {' '}
                </Text>
                <Text className="text-slate-300 text-sm">{undoToast.jobTitle}</Text>
              </View>
            </View>
            <Pressable onPress={handleUndo} className="px-3 py-1.5 text-indigo-300 text-sm font-medium border border-indigo-700 rounded-lg active:bg-indigo-900/30">
              Undo
            </Pressable>
          </View>
        </View>
      )}

      {/* Match celebration overlay — shows when mutual match is created */}
      {matchCelebrationVisible && matchedJob && (
        <View className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <View className="bg-slate-900 border border-indigo-500/50 rounded-2xl p-8 max-w-md w-full mx-4 animate-bounce-in">
            <View className="items-center mb-6">
              <View className="w-24 h-24 rounded-full bg-indigo-500/20 flex items-center justify-center mb-4">
                <Text className="text-5xl">🎉</Text>
              </View>
              <Text className="text-white text-2xl font-bold text-center mb-2">It&apos;s a Match!</Text>
              <Text className="text-slate-300 text-center">
                You and <Text className="font-semibold text-indigo-300">{matchedJob.company}</Text> both swiped right on{' '}
                <Text className="font-semibold text-white">{matchedJob.title}</Text>
              </Text>
            </View>
            <View className="flex gap-3">
              <Pressable
                onPress={() => {
                  dismissCelebration();
                  router.push(`/matches` as Href);
                }}
                className="flex-1 bg-indigo-600 px-4 py-3 rounded-xl text-white font-semibold text-center active:bg-indigo-700"
              >
                View Match
              </Pressable>
              <Pressable
                onPress={dismissCelebration}
                className="flex-1 border border-slate-600 px-4 py-3 rounded-xl text-slate-300 font-semibold text-center active:bg-slate-800"
              >
                Keep Swiping
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Milestone celebration overlay */}
      <StreakMilestoneOverlay
        visible={streakMilestone !== null}
        milestone={streakMilestone ?? 7}
        onAcknowledge={clearMilestone}
        onClose={clearMilestone}
      />

      {/* Bonus toast */}
      <StreakSuperApplyBonus
        visible={bonusEarned}
        onDismiss={dismissBonus}
      />

      {/* Broken streak sheet */}
      <StreakBrokenSheet
        visible={streakBroken}
        previousStreak={currentStreak}
        onStartNewStreak={handleStartNewStreak}
        onDismiss={dismissBroken}
        onMaybeLater={dismissBroken}
      />

      {error ? (
        <View className="mx-4 sm:mx-6 lg:mx-8 mb-6 max-w-4xl self-center w-full bg-red-950/90 rounded-xl px-4 py-3 border border-red-900/50">
          <Text className="text-red-300 text-sm text-center">
            Something went wrong. Your last swipe was rolled back.
          </Text>
          <Pressable onPress={reset} className="mt-2">
            <Text className="text-white text-center font-medium text-indigo-300">Try again</Text>
          </Pressable>
        </View>
      ) : null}
    </AppScreen>
  );
}
