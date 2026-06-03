import { View, Text, Pressable } from '@/components/tw';
import { fluidSubtitle, fluidTitle, screenTopInset } from '@/lib/responsive-layout';
import type { ReactNode } from 'react';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  actions?: ReactNode;
  className?: string;
};

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  backLabel = 'Back',
  actions,
  className,
}: ScreenHeaderProps) {
  return (
    <View className={`${screenTopInset} pb-4 gap-2 ${className ?? ''}`}>
      {(onBack || actions) ? (
        <View className="flex-row items-center justify-between mb-1">
          {onBack ? (
            <Pressable onPress={onBack} className="py-1 pr-3 min-h-[44px] justify-center" accessibilityRole="button">
              <Text className="text-indigo-400 text-base font-medium">{backLabel}</Text>
            </Pressable>
          ) : (
            <View />
          )}
          {actions ? <View className="flex-row items-center gap-3">{actions}</View> : null}
        </View>
      ) : null}
      <Text className={fluidTitle}>{title}</Text>
      {subtitle ? <Text className={fluidSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}
