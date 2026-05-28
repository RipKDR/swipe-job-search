import { View, Text, Pressable } from '@/components/tw';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { getOnboardingRouteForRole } from './onboarding-submit';

export default function RoleSelection() {
  const router = useRouter();
  const [selected, setSelected] = useState<'candidate' | 'employer' | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    router.push(getOnboardingRouteForRole(selected) as any);
  };

  return (
    <View className="flex-1 bg-slate-950 px-6 pt-16">
      <View className="mb-12">
        <Text className="text-white text-3xl font-bold mb-2">Welcome to Hi-Hired</Text>
        <Text className="text-slate-400 text-base">Choose how you'd like to use Hi-Hired</Text>
      </View>

      <View className="gap-4 mb-8">
        <Pressable
          onPress={() => setSelected('candidate')}
          className={`p-6 rounded-2xl border-2 ${selected === 'candidate' ? 'bg-indigo-500/10 border-indigo-500' : 'bg-slate-900 border-slate-800'}`}
        >
          <Text className="text-white text-xl font-semibold mb-2">I'm looking for work</Text>
          <Text className="text-slate-400 text-sm leading-relaxed">
            Swipe on jobs, match with employers, and get hired faster
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setSelected('employer')}
          className={`p-6 rounded-2xl border-2 ${selected === 'employer' ? 'bg-indigo-500/10 border-indigo-500' : 'bg-slate-900 border-slate-800'}`}
        >
          <Text className="text-white text-xl font-semibold mb-2">I'm hiring</Text>
          <Text className="text-slate-400 text-sm leading-relaxed">
            Post jobs, see interested candidates, and hire the right person
          </Text>
        </Pressable>
      </View>

      <Button title="Continue" fullWidth disabled={!selected} onPress={handleContinue} />
    </View>
  );
}
