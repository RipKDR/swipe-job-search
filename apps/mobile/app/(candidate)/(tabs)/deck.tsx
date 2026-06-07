import React, { useCallback } from 'react';
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

  const handleRadiusChange = useCallback((newRadius: number) => {
    setRadiusKm(newRadius);
  }, [setRadiusKm]);

  // Scroll-to-top ref for "swipe now" from at-risk banner
  const deckRef = React.useRef<{ scrollToTop: () => void }>(null);

  const handleSwipe = useCallback(
    async (_jobId: string, direction: 'left' | 'right' | 'super') => {
      try {
        await swipe(direction);
        // Optimistic streak increment on successful swipe
        incrementSwipes();
      } catch {
        // Roll back streak counter on swipe failure
        rollbackSwipe();
        Alert.alert('Swipe failed', 'Could not save your choice. Please try again.', [
          { text: 'OK' },
          { text: 'Retry deck', onPress: reset },
        ]);
      }
    },
    [swipe, reset, incrementSwipes, rollbackSwipe],
  );

  const handleSwipeNow = useCallback(() => {
    // Navigate to top of deck — the deck list ref callback
    refreshStreak();
  }, [refreshStreak]);

  const handleStartNewStreak = useCallback(() => {
    // Dismiss broken sheet and refresh
    dismissBroken();
    refreshStreak();
  }, [dismissBroken, refreshStreak]);

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
        <EmptyDeck onRefresh={reset} />
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
