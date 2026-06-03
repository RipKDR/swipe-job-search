import { View, Text } from '@/components/tw';
import { ActivityIndicator } from 'react-native';
import { AmbientBackground } from './AmbientBackground';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps = {}) {
  return (
    <View className="flex-1 items-center justify-center bg-slate-950">
      <AmbientBackground />
      <ActivityIndicator size="large" color="#818cf8" />
      {message ? <Text className="text-slate-400 mt-4 text-base">{message}</Text> : null}
    </View>
  );
}
