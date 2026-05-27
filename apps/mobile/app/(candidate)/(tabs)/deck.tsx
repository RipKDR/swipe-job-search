/**
 * Candidate job deck (U5 complete)
 * Uses SwipeDeck + useJobDeck + optimistic swipes + a11y + haptics
 */
import { useRouter } from 'expo-router';
import { View, Text, Alert } from 'react-native';
import { SwipeDeck } from '@/components/deck/SwipeDeck';
import { useJobDeck } from '@/hooks/useJobDeck';

export default function DeckScreen() {
  const router = useRouter();
  const { jobs, isLoading, error, swipe, isEmpty, reset } = useJobDeck();

  const handleSwipe = async (jobId: string, direction: 'left' | 'right') => {
    try {
      await swipe(direction);
    } catch (e: any) {
      // Rollback + toast (AE: failed upsert)
      Alert.alert('Swipe failed', 'Could not save your choice. Please try again.', [
        { text: 'OK' },
        { text: 'Retry deck', onPress: reset },
      ]);
    }
  };

  const handleCardPress = (job: any) => {
    router.push(`/job/${job.id}` as any);
  };

  if (isEmpty) {
    return (
      <View className="flex-1 bg-slate-950">
        <SwipeDeck jobs={[]} onSwipe={handleSwipe} onCardPress={handleCardPress} />
      </View>
    );
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
        <Text className="text-red-400 text-center p-2 text-xs">Last action failed — changes rolled back.</Text>
      )}
    </View>
  );
}
