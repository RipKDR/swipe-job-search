/**
 * Candidate job deck (U5 complete)
 * Uses SwipeDeck + useJobDeck + optimistic swipes + a11y + haptics
 */
import { useRouter } from 'expo-router';
import { View, Text, Pressable } from '@/components/tw';
import { Alert } from 'react-native';
import { SwipeDeck } from '@/components/deck/SwipeDeck';
import { EmptyDeck } from '@/components/deck/EmptyDeck';
import { useJobDeck } from '@/hooks/useJobDeck';

export default function DeckScreen() {
  const router = useRouter();
  const { jobs, isLoading, error, swipe, isEmpty, reset } = useJobDeck();

  const handleSwipe = async (_jobId: string, direction: 'left' | 'right') => {
    try {
      await swipe(direction);
    } catch {
      Alert.alert('Swipe failed', 'Could not save your choice. Please try again.', [
        { text: 'OK' },
        { text: 'Retry deck', onPress: reset },
      ]);
    }
  };

  const handleCardPress = (job: { id: string }) => {
    router.push(`/job/${job.id}` as any);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <Text className="text-white text-base">Loading jobs near you…</Text>
      </View>
    );
  }

  if (isEmpty) {
    return <EmptyDeck onRefresh={reset} />;
  }

  return (
    <View className="flex-1 bg-slate-950">
      <SwipeDeck
        jobs={jobs}
        onSwipe={handleSwipe}
        onCardPress={handleCardPress}
        isLoading={isLoading}
      />

      {error && (
        <View className="absolute bottom-24 left-4 right-4 bg-red-950/90 rounded-xl px-4 py-3">
          <Text className="text-red-400 text-sm text-center">
            Something went wrong. Your last swipe was rolled back.
          </Text>
          <Pressable onPress={reset} className="mt-2">
            <Text className="text-white text-center font-medium underline">Try again</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
