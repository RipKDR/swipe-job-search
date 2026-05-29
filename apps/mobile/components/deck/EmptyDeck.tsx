import React from 'react';
import { Pressable, Text, View } from '@/components/tw';

interface EmptyDeckProps {
  onRefresh?: () => void;
}

export const EmptyDeck = React.memo(function EmptyDeck({ onRefresh }: EmptyDeckProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <Text className="text-5xl mb-5">📭</Text>
      <Text className="text-white text-2xl font-bold text-center tracking-tight">No more jobs right now</Text>
      <Text className="text-slate-400 text-center mt-3 text-base leading-relaxed max-w-sm">
        New casual roles are posted daily in your circle. Check back soon or ask about expanding your area.
      </Text>
      <Pressable onPress={onRefresh} className="mt-8 px-6 py-3 rounded-full border border-indigo-500/60 active:opacity-80">
        <Text className="text-indigo-300 font-semibold">Try again</Text>
      </Pressable>
    </View>
  );
});

export default EmptyDeck;
