import { View, Text } from '@/components/tw'
;

/** SwipeOverlay labels (integrated in SwipeDeck for perf; stub for import completeness) */
export function SwipeOverlay({ direction }: { direction: 'left' | 'right' | null }) {
  if (!direction) return null;
  return (
    <View className={`absolute top-1/3 ${direction === 'right' ? 'right-6 bg-[#166534]' : 'left-6 bg-[#475569]'} px-4 py-1 rounded-full`}>
      <Text className="text-white text-2xl font-bold tracking-[3px]">{direction === 'right' ? 'APPLY' : 'PASS'}</Text>
    </View>
  );
}
