/**
 * Job detail (U5)
 * Full description + "I'm Interested" (duplicates swipe right)
 * Per plan: no Super Apply, no map.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { useJobDeck } from '@/hooks/useJobDeck';
import { mockJobs } from '@/lib/mocks/jobs';

export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { swipe } = useJobDeck(); // re-use for consistency (mock)

  const job = mockJobs.find((j) => j.id === id) || mockJobs[0];

  const handleInterested = async () => {
    try {
      await swipe('right'); // optimistic in hook + upsert
      Alert.alert("Interest sent", "The employer will see you in their interested list.", [
        { text: 'Back to deck', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Could not record interest. Try from deck.');
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-950 p-6">
      <Text className="text-[#4ade80] text-xs tracking-[2px] mb-1">TULLAMARINE • CASUAL</Text>
      <Text className="text-white text-3xl font-semibold tracking-tight">{job.title}</Text>
      <Text className="text-[#4ade80] text-4xl font-bold mt-1 tabular-nums">{job.pay_display}</Text>
      <Text className="text-slate-400 mt-1">{job.hours_text} • {job.suburb}</Text>

      <View className="h-px bg-slate-800 my-6" />

      <Text className="text-white text-lg font-medium mb-2">About the role</Text>
      <Text className="text-slate-300 leading-relaxed text-[15px]">
        {job.description || 'Great casual opportunity in the local area. Supportive team, consistent shifts.'}
      </Text>

      <View className="mt-8">
        <Pressable
          onPress={handleInterested}
          accessibilityRole="button"
          accessibilityLabel="I'm interested — swipe right equivalent"
          className="bg-[#166534] py-4 rounded-2xl active:opacity-90"
        >
          <Text className="text-white text-center text-lg font-semibold tracking-wide">I'M INTERESTED</Text>
        </Pressable>
        <Text className="text-center text-[#6b665f] text-xs mt-3">This is the same as swiping right on the deck</Text>
      </View>

      <Pressable onPress={() => router.back()} className="mt-6">
        <Text className="text-[#60a5fa] text-center">← Back to deck</Text>
      </Pressable>
    </ScrollView>
  );
}
