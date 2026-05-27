import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function Login() {
  const router = useRouter();
  return (
    <View className="flex-1 items-center justify-center bg-slate-950 p-6">
      <Text className="text-white text-3xl font-bold mb-4">Hi-Hired</Text>
      <Text className="text-slate-400 mb-8 text-center">Phase 1 scaffold — auth in U3</Text>
      <Pressable
        onPress={() => router.replace('/(candidate)/swipe')}
        className="bg-indigo-600 px-6 py-3 rounded-xl active:bg-indigo-500"
      >
        <Text className="text-white font-semibold">Continue (stub)</Text>
      </Pressable>
      <Text className="text-slate-500 text-xs mt-8">Magic link / Google / Apple (U3)</Text>
    </View>
  );
}