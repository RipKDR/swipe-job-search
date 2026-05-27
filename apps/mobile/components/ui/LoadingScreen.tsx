import { View, Text, ActivityIndicator } from "react-native";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps = {}) {
  return (
    <View className="flex-1 items-center justify-center bg-slate-950">
      <ActivityIndicator size="large" color="#6366f1" />
      {message ? (
        <Text className="text-slate-400 mt-4">{message}</Text>
      ) : null}
    </View>
  );
}
