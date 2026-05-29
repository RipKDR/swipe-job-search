import { View, Text, Pressable } from '@/components/tw';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { emptyStateMaxWidth, screenPadding } from '@/lib/responsive-layout';

type EmptyStateProps = {
  emoji?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondary?: ReactNode;
};

export function EmptyState({
  emoji = '✨',
  title,
  description,
  actionLabel,
  onAction,
  secondary,
}: EmptyStateProps) {
  return (
    <View className={`flex-1 items-center justify-center ${screenPadding} py-12 sm:py-16`}>
      <Text className="text-5xl sm:text-6xl mb-5">{emoji}</Text>
      <Text className="text-white text-xl sm:text-2xl font-bold text-center tracking-tight">{title}</Text>
      <Text className={`text-slate-400 text-center mt-3 text-sm sm:text-base leading-relaxed ${emptyStateMaxWidth}`}>
        {description}
      </Text>
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} className="mt-8 w-full max-w-xs sm:max-w-sm" fullWidth />
      ) : null}
      {onAction && !actionLabel ? (
        <Pressable onPress={onAction} className="mt-8 px-6 py-3 min-h-[44px] rounded-full border border-indigo-500/60 active:opacity-80 justify-center">
          <Text className="text-indigo-300 font-semibold">Try again</Text>
        </Pressable>
      ) : null}
      {secondary ? <View className="mt-6 w-full max-w-sm">{secondary}</View> : null}
    </View>
  );
}
