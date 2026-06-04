import { View, Text, Pressable } from '@/components/tw';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { useTheme } from '@/providers/ThemeProvider';
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
  const { colors } = useTheme();

  return (
    <View className={`flex-1 items-center justify-center ${screenPadding} py-12 sm:py-16`}>
      <Text className="text-5xl sm:text-6xl mb-5">{emoji}</Text>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: 'bold', textAlign: 'center', letterSpacing: -0.5 }}>{title}</Text>
      <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 12, fontSize: 14, lineHeight: 22 }} className={emptyStateMaxWidth}>
        {description}
      </Text>
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} className="mt-8 w-full max-w-xs sm:max-w-sm" fullWidth />
      ) : null}
      {onAction && !actionLabel ? (
        <Pressable
          onPress={onAction}
          style={{
            marginTop: 32,
            paddingHorizontal: 24,
            paddingVertical: 12,
            minHeight: 44,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: `${colors.accent}99`,
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: colors.accentText, fontWeight: '600' }}>Try again</Text>
        </Pressable>
      ) : null}
      {secondary ? <View className="mt-6 w-full max-w-sm">{secondary}</View> : null}
    </View>
  );
}
