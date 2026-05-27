import { View, Text, Pressable } from 'react-native';

interface EmptyDeckProps {
  onRefresh?: () => void;
}

/**
 * Empty state for candidate deck.
 * Aligned with 02-mvp + GUARDRAILS (a11y, high contrast, inclusive language).
 */
export function EmptyDeck({ onRefresh }: EmptyDeckProps) {
  return (
    <View className="flex-1 items-center justify-center bg-slate-950 px-8">
      <Text className="text-6xl mb-4">📭</Text>
      <Text className="text-white text-2xl font-semibold text-center">No more jobs right now</Text>
      <Text className="text-slate-400 text-center mt-3 text-base leading-6">
        New casual roles are posted daily in your circle.{'\n'}Check back soon or talk to your provider about expanding circles.
      </Text>

      {onRefresh && (
        <Pressable
          onPress={onRefresh}
          accessibilityRole="button"
          className="mt-8 px-6 py-3 rounded-full border border-[#4ade80] active:opacity-80"
        >
          <Text className="text-[#4ade80] font-medium">Check for new jobs</Text>
        </Pressable>
      )}

      <Text className="text-[#4ade80] mt-6 text-sm tracking-wide">You are the algorithm.</Text>
    </View>
  );
}
