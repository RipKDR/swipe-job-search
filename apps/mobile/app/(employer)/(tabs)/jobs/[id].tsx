import React from 'react';
import { View, Text, Pressable } from '@/components/tw';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMyJobDetail } from '@/hooks/useMyJobs';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Button } from '@/components/ui/Button';
import { usePostHog } from '@/hooks/usePostHog';
import { contentMaxWidthChat, screenPadding } from '@/lib/responsive-layout';

export default function EmployerJobDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const jobId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const posthog = usePostHog();
  const { data: job, isLoading, error } = useMyJobDetail(jobId ?? '');

  if (isLoading) {
    return <LoadingScreen message="Loading job…" />;
  }

  if (!job || error) {
    return (
      <AppScreen>
        <ScreenHeader title="Job not found" />
        <Text className="p-6 text-slate-400">This job could not be loaded.</Text>
      </AppScreen>
    );
  }

  const goToInterested = () => {
    router.push(`/employer/jobs/${jobId}/interested` as any);
    posthog.capture('employer_job_tab_changed', { job_id: jobId, tab: 'interested' });
  };

  const goToMatches = () => {
    router.push('/employer/matches' as any);
    posthog.capture('employer_job_tab_changed', { job_id: jobId, tab: 'matches' });
  };

  const goToEdit = () => {
    router.push(`/employer/jobs/${jobId}/edit` as any);
  };

  return (
    <AppScreen>
      <ScreenHeader
        title={job.title}
        actions={
          <Pressable onPress={goToEdit}>
            <Text className="text-indigo-400">Edit</Text>
          </Pressable>
        }
      />

      <View className={`w-full ${contentMaxWidthChat} ${screenPadding} gap-4`}>
        <View className="flex-row gap-3">
          <Pressable onPress={goToInterested} className="flex-1 rounded-2xl bg-slate-900 p-4 active:opacity-80">
            <Text className="text-2xl font-bold text-white">{job.interestedCount ?? 0}</Text>
            <Text className="text-slate-400 text-sm">Interested →</Text>
          </Pressable>
          <Pressable onPress={goToMatches} className="flex-1 rounded-2xl bg-slate-900 p-4 active:opacity-80">
            <Text className="text-2xl font-bold text-white">{job.matchCount ?? 0}</Text>
            <Text className="text-slate-400 text-sm">Matches →</Text>
          </Pressable>
        </View>

        <View className="gap-4 pt-2">
          <View>
            <Text className="text-slate-400 text-sm mb-1">Location</Text>
            <Text className="text-white">{job.location || 'Remote / Not specified'}</Text>
          </View>
          <View>
            <Text className="text-slate-400 text-sm mb-1">Posted</Text>
            <Text className="text-white">{new Date(job.created_at).toLocaleDateString()}</Text>
          </View>
          <Button title="View Interested Candidates" onPress={goToInterested} />
        </View>
      </View>
    </AppScreen>
  );
}
