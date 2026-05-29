import { View, Text } from '@/components/tw';
import type { ReactNode } from 'react';

type FormBlockProps = {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function FormBlock({ label, hint, error, children }: FormBlockProps) {
  return (
    <View>
      <Text className="text-white text-sm font-semibold mb-1">{label}</Text>
      {hint ? <Text className="text-slate-500 text-xs mb-3 leading-relaxed">{hint}</Text> : null}
      {!hint ? <View className="mb-2" /> : null}
      {children}
      {error ? <Text className="text-red-400 text-xs mt-2">{error}</Text> : null}
    </View>
  );
}
