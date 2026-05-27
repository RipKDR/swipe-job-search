import { View, Text } from 'react-native';

/**
 * Empty state for candidate deck (copy inspired by 02-mvp + "you are the algorithm").
 * No overbuild: simple, a11y, high contrast.
 */
export function EmptyDeck() {
  return (
    <View className="flex-1 items-center justify-center bg-slate-950 px-8">
      <Text className="text-6xl mb-4">📭</Text>
      <Text className="text-white text-2xl font-semibold text-center">No more jobs right now</Text>
      <Text className="text-slate-400 text-center mt-3 text-base leading-6">
        New casual roles are posted daily in your circle.{'\n'}Check back soon or talk to your provider about expanding circles.
      </Text>
      <Text className="text-[#4ade80] mt-6 text-sm">You are the algorithm.</Text>
    </View>
  );
}
