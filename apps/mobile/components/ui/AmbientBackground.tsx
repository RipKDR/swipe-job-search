import { View } from '@/components/tw';

export function AmbientBackground() {
  return (
    <>
      <View className="absolute inset-x-0 top-0 h-56 bg-indigo-600/10" pointerEvents="none" />
      <View
        className="absolute left-1/2 top-0 h-40 w-72 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl"
        pointerEvents="none"
      />
    </>
  );
}
