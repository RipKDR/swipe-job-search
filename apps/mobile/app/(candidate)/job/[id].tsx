import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, Pressable } from '@/components/tw';
import { Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { usePostHog } from '@/hooks/usePostHog';
import type { Job } from '@hi-hired/shared';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

async function fetchJobById(id: string): Promise<Job | null> {
  const { data, error } = await (supabase as any)
    .from('jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as Job;
}

export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const posthog = usePostHog();

  const { data: job, isLoading, error } = useQuery<Job | null>({
    queryKey: ['job', id],
    queryFn: () => fetchJobById(id!),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });

  const handleInterested = async () => {
    if (!job) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: swipeError } = await (supabase as any)
        .from('swipes')
        .upsert([{ candidate_id: user.id, job_id: job.id, direction: 'right' }], {
          onConflict: 'candidate_id,job_id',
        });

      if (swipeError) throw swipeError;

      posthog.capture('job_swiped', { direction: 'right', job_id: job.id });

      Alert.alert('Interest sent', 'The employer will see you in their interested list.', [
        { text: 'Back to deck', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Could not record interest. Try from deck.');
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading job…" />;
  }

  if (error || !job) {
    return (
      <AppScreen scroll centered maxWidth="lg">
        <ScreenHeader title="Job not found" subtitle="This role may have expired or been removed." onBack={() => router.back()} />
        <Button title="Back to deck" variant="outline" fullWidth onPress={() => router.back()} className="mt-6" />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll centered maxWidth="lg" footer={
      <View className="gap-3">
        <Button title="I'm interested" fullWidth onPress={handleInterested}  />
        <Text className="text-slate-500 text-xs text-center">Same as swiping right on the deck</Text>
      </View>
    }>
      <ScreenHeader onBack={() => router.back()} title={job.title} subtitle={`${job.suburb} · ${job.job_type.replace('_', ' ')}`} />

      <View className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 mb-6">
        <Text className="text-emerald-400 text-4xl font-bold tabular-nums">{job.pay_display}</Text>
        <Text className="text-slate-400 mt-2">{job.hours_text}</Text>
      </View>

      <Text className="text-white text-lg font-semibold mb-2">About the role</Text>
      <Text className="text-slate-300 leading-relaxed text-base">
        {job.description ||
          'Great casual opportunity in the local area. Supportive team, consistent shifts.'}
      </Text>
    </AppScreen>
  );
}
