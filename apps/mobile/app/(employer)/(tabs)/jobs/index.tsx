import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { Text } from '@/components/tw';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { JobListItem } from '@/components/employer/JobListItem';
import { useMyJobs, type MyJobItem } from '@/hooks/useMyJobs';
import { useMatchInbox } from '@/hooks/useMatchInbox';
import { useTheme } from '@/hooks/useTheme';
import { usePostHog } from '@/hooks/usePostHog';
import { useAuth } from '@/hooks/useAuth';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { TabWebShell } from '@/components/ui/TabWebShell';
import { supabase } from '@/lib/supabase';
import type { Database } from '@hi-hired/shared';

type StatCardProps = {
  label: string;
  value: number;
  accent?: boolean;
};

function StatCard({ label, value, accent }: StatCardProps) {
  const { colors } = useTheme();
  return (
    <View
      className="flex-1 rounded-2xl border p-4 items-center"
      style={{
        backgroundColor: colors.surface,
        borderColor: accent ? colors.accent : colors.border,
      }}
    >
      <Text
        className={`text-2xl font-bold tabular-nums ${accent ? '' : 'text-white'}`}
        style={accent ? { color: colors.accent } : undefined}
      >
        {value}
      </Text>
      <Text className="text-xs mt-1" style={{ color: colors.muted }}>
        {label}
      </Text>
    </View>
  );
}

export default function JobsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const posthog = usePostHog();
  const { data: jobsData, isLoading, error, refetch, isRefetching } = useMyJobs();
  const { data: matchesData = [] } = useMatchInbox();
  const profileId = profile?.id;
  const jobs: MyJobItem[] = jobsData ?? [];
  const matches = matchesData as { status: string }[];

  const [statusUpdatingJobId, setStatusUpdatingJobId] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const activeJobs = jobs.filter((j) => j.status === 'active').length;
  const totalInterested = jobs.reduce((sum, j) => sum + (j.interestedCount || 0), 0);
  const activeMatches = matches.filter((m) => m.status === 'chatting' || m.status === 'hire_pending').length;

  const handleOpenInterested = useCallback((jobId: string) => {
    posthog.capture('job_interested_opened', { job_id: jobId });
    router.push(`./${jobId}/interested` as const);
  }, [router, posthog]);

  const handleEditJob = useCallback((jobId: string) => {
    posthog.capture('job_edit_opened', { job_id: jobId });
    router.push(`./${jobId}/edit` as const);
  }, [router, posthog]);

  const handleToggleStatus = useCallback(
    async (job: MyJobItem) => {
      if (!profileId || statusUpdatingJobId) return;

      const isPastExpiry = job.expires_at ? new Date(job.expires_at) < new Date() : false;
      const shouldPause = job.status === 'active' && !isPastExpiry;
      const nextStatus = shouldPause ? 'paused' : 'active';
      const payload: Database['public']['Tables']['jobs']['Update'] = { status: nextStatus };

      if (!shouldPause) {
        payload.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      setStatusUpdatingJobId(job.id);
      setStatusFeedback(null);
      try {
        const { error: updateError } = await supabase
          .from('jobs')
          .update(payload)
          .eq('id', job.id)
          .eq('employer_id', profileId);

        if (updateError) throw updateError;

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['my-jobs', profileId] }),
          queryClient.invalidateQueries({ queryKey: ['job-deck'] }),
          queryClient.invalidateQueries({ queryKey: ['jobs-pipeline'] }),
        ]);

        posthog.capture('job_status_updated', {
          job_id: job.id,
          previous_status: job.status,
          next_status: nextStatus,
          reopened_with_extended_expiry: Boolean(payload.expires_at),
        });
        setStatusFeedback(nextStatus === 'paused' ? 'Job paused' : 'Job reopened');
      } catch {
        setStatusFeedback('Could not update job status. Please try again.');
      } finally {
        setStatusUpdatingJobId(null);
      }
    },
    [posthog, profileId, queryClient, statusUpdatingJobId],
  );

  const renderItem = useCallback(
    ({ item }: { item: MyJobItem }) => (
      <JobListItem
        job={item}
        onOpenInterested={handleOpenInterested}
        onEdit={handleEditJob}
        onToggleStatus={handleToggleStatus}
        statusUpdating={statusUpdatingJobId === item.id}
      />
    ),
    [handleOpenInterested, handleEditJob, handleToggleStatus, statusUpdatingJobId],
  );

  if (isLoading) {
    return <LoadingScreen message="Loading your jobs…" />;
  }

  if (error) {
    return (
      <AppScreen>
        <ScreenHeader title="My jobs" />
        <EmptyState
          title="Could not load jobs"
          description="Please try again."
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen centered={false} maxWidth="tab">
      <TabWebShell>
        <ScreenHeader
          title="My jobs"
          subtitle={`${activeJobs} active · ${activeJobs === 0 && jobs.length > 0 ? `${jobs.length - activeJobs} inactive` : ''}`}
        />

        <View className="flex-row gap-3 mb-5">
          <StatCard label="Active jobs" value={activeJobs} />
          <StatCard label="Interested" value={totalInterested} accent />
          <StatCard label="Matches" value={activeMatches} />
        </View>

        {statusFeedback ? (
          <Text className="text-slate-300 text-sm mb-4">{statusFeedback}</Text>
        ) : null}

        {jobs.length === 0 ? (
          <EmptyState
            title="No jobs yet"
            description="Post your first job to start receiving applications."
            actionLabel="Post a Job"
            onAction={() => {
              posthog.capture('job_post_from_empty_state', {});
              router.push('/(employer)/(tabs)/post-job' as any);
            }}
          />
        ) : (
          <FlatList
            data={jobs}
            keyExtractor={(item: MyJobItem) => item.id}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </TabWebShell>
    </AppScreen>
  );
}
