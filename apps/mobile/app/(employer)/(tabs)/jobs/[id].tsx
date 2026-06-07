import React, { useState } from 'react';
import { View, Text, Pressable } from '@/components/tw';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMyJobDetail } from '@/hooks/useMyJobs';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Button } from '@/components/ui/Button';
import { usePostHog } from '@/hooks/usePostHog';
import { contentMaxWidthChat, screenPadding } from '@/lib/responsive-layout';

type Tab = 'overview' | 'interested' | 'matches';

export default function EmployerJobDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const jobId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const posthog = usePostHog();
  const { data: job, isLoading, error } = useMyJobDetail(jobId ?? '');

  const [activeTab, setActiveTab] = useState<Tab>('overview');

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

  const handleTabPress = (tab: Tab) => {
    setActiveTab(tab);
    posthog.capture('employer_job_tab_changed', { job_id: jobId, tab });
  };

  return (
    <AppScreen>
      <ScreenHeader
        title={job.title}
        actions={
          <Pressable onPress={() => {
            posthog.capture('employer_job_edit_opened', { job_id: jobId });
            router.push('/(employer)/(tabs)/post-job');
          }}>
            <Text className="text-indigo-400">Edit</Text>
          </Pressable>
        }
      />

      <View className={`w-full ${contentMaxWidthChat} ${screenPadding} gap-4`}>
        {/* Stats row */}
        <View className="flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-slate-900 p-4">
            <Text className="text-2xl font-bold text-white">{job.interestedCount ?? 0}</Text>
            <Text className="text-slate-400 text-sm">Interested</Text>
          </View>
          <View className="flex-1 rounded-2xl bg-slate-900 p-4">
            <Text className="text-2xl font-bold text-white">{job.matchCount ?? 0}</Text>
            <Text className="text-slate-400 text-sm">Matches</Text>
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row border-b border-slate-800">
          {(['overview', 'interested', 'matches'] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => handleTabPress(tab)}
              className={`flex-1 pb-3 ${activeTab === tab ? 'border-b-2 border-indigo-500' : ''}`}
            >
              <Text
                className={`text-center text-sm font-medium ${
                  activeTab === tab ? 'text-white' : 'text-slate-400'
                }`}
              >
                {tab === 'overview' ? 'Overview' : tab === 'interested' ? 'Interested' : 'Matches'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <View className="gap-4 pt-2">
            <View>
              <Text className="text-slate-400 text-sm mb-1">Location</Text>
              <Text className="text-white">{job.location || 'Remote / Not specified'}</Text>
            </View>
            <View>
              <Text className="text-slate-400 text-sm mb-1">Posted</Text>
              <Text className="text-white">{new Date(job.created_at).toLocaleDateString()}</Text>
            </View>
            <Button
              title="View Interested Candidates"
              onPress={() => handleTabPress('interested')}
            />
          </View>
        )}

        {activeTab === 'interested' && (
          <View className="pt-4">
            <Text className="text-slate-400">
              {job.interestedCount
                ? `${job.interestedCount} candidate${job.interestedCount === 1 ? '' : 's'} interested`
                : 'No candidates yet.'}
            </Text>
          </View>
        )}

        {activeTab === 'matches' && (
          <View className="pt-4">
            <Text className="text-slate-400">
              {job.matchCount
                ? `${job.matchCount} match${job.matchCount === 1 ? '' : 'es'}`
                : 'No matches yet.'}
            </Text>
          </View>
        )}
      </View>
    </AppScreen>
  );
}
