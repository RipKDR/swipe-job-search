import React, { useCallback, useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { View, Text, Pressable } from '@/components/tw';
import { Alert } from 'react-native';
import { SwipeDeck } from '@/components/deck/SwipeDeck';
import { EmptyDeck } from '@/components/deck/EmptyDeck';
import { RadiusFilter } from '@/components/deck/RadiusFilter';
import { useJobDeck } from '@/hooks/useJobDeck';
import { useUserLocation } from '@/hooks/useUserLocation';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { TabWebShell } from '@/components/ui/TabWebShell';

export default function DeckScreen() {
  const router = useRouter();
  const [radiusKm, setRadiusKm] = useState(0);
  const { isLoading: locationLoading, error: locationError } = useUserLocation();
  const { jobs, isLoading, error, swipe, isEmpty, reset, userLocation } = useJobDeck({
    radius_km: radiusKm,
  });

  const handleRadiusChange = useCallback((newRadius: number) => {
    setRadiusKm(newRadius);
  }, []);

  const handleSwipe = useCallback(
    async (_jobId: string, direction: 'left' | 'right' | 'super') => {
      try {
        await swipe(direction);
      } catch {
        Alert.alert('Swipe failed', 'Could not save your choice. Please try again.', [
          { text: 'OK' },
          { text: 'Retry deck', onPress: reset },
        ]);
      }
    },
    [swipe, reset],
  );

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
      <TabWebShell>
        <ScreenHeader
          title="Jobs"
          subtitle="Swipe right if you are interested · left to pass"
          className="pb-2"
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
