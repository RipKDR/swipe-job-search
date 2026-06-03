import { View, ScrollView } from '@/components/tw';
import { AmbientBackground } from './AmbientBackground';
import {
  contentMaxWidthByPreset,
  screenPadding,
  type ContentWidthPreset,
} from '@/lib/responsive-layout';
import type { ReactNode } from 'react';

type AppScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  centered?: boolean;
  /** @default lg */
  maxWidth?: ContentWidthPreset;
  footer?: ReactNode;
  contentClassName?: string;
  keyboardShouldPersistTaps?: 'handled' | 'always' | 'never';
};

export function AppScreen({
  children,
  scroll = false,
  centered = true,
  maxWidth = 'lg',
  footer,
  contentClassName,
  keyboardShouldPersistTaps = 'handled',
}: AppScreenProps) {
  const widthClass = contentMaxWidthByPreset[maxWidth];
  const innerClass = centered
    ? `${widthClass} ${screenPadding} ${contentClassName ?? ''}`
    : `flex-1 ${contentClassName ?? ''}`;

  const footerClass = centered
    ? `${widthClass} w-full ${screenPadding} mt-8`
    : `${screenPadding} pb-8`;

  const body = scroll ? (
    <ScrollView
      className="flex-1 min-h-0"
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      contentContainerClassName={
        centered ? 'flex-grow items-center pt-2 pb-12 sm:pb-16' : 'flex-grow pb-12'
      }
    >
      <View className={innerClass}>{children}</View>
      {footer && centered ? <View className={footerClass}>{footer}</View> : null}
    </ScrollView>
  ) : (
    <View className={`flex-1 min-h-0 ${centered ? 'items-center' : ''}`}>
      <View className={innerClass}>{children}</View>
      {footer ? <View className={footerClass}>{footer}</View> : null}
    </View>
  );

  return (
    <View className="flex-1 bg-slate-950 min-h-screen-safe">
      <AmbientBackground />
      {body}
    </View>
  );
}
