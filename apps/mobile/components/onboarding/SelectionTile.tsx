import { View, Text, Pressable } from '@/components/tw';
import type { ReactNode } from 'react';

type SelectionTileProps = {
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
  trailing?: ReactNode;
};

export function SelectionTile({
  title,
  description,
  selected,
  onPress,
  compact = false,
  trailing,
}: SelectionTileProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className={`rounded-xl border-2 ${
        selected
          ? 'border-indigo-500 bg-indigo-500/10'
          : 'border-slate-800 bg-slate-900/80 active:bg-slate-800/90'
      } ${compact ? 'px-4 py-3' : 'px-5 py-4'}`}
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text
            className={`font-semibold ${compact ? 'text-sm' : 'text-base'} ${
              selected ? 'text-indigo-200' : 'text-white'
            }`}
          >
            {title}
          </Text>
          {description ? (
            <Text className="text-slate-400 text-sm mt-1 leading-relaxed">{description}</Text>
          ) : null}
        </View>
        {trailing ?? (
          <View
            className={`h-5 w-5 rounded-full border-2 items-center justify-center ${
              selected ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600 bg-transparent'
            }`}
          >
            {selected ? <View className="h-2 w-2 rounded-full bg-white" /> : null}
          </View>
        )}
      </View>
    </Pressable>
  );
}
