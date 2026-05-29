import React, { useCallback } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { JobListItem } from '@/components/employer/JobListItem';
import { useMyJobs } from '@/hooks/useMyJobs';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { TabWebShell } from '@/components/ui/TabWebShell';
import { useListColumns } from '@/hooks/useListColumns';

export default function JobsScreen() {
  const router = useRouter();
  const { data: jobs = [], isLoading, error, refetch, isRefetching } = useMyJobs();
  const numColumns = useListColumns(2);
  const totalInterested = jobs.reduce((sum, j) => sum + (j.interestedCount || 0), 0);

  const handlePostJob = useCallback(() => {
    router.push('/(employer)/(tabs)/post-job');
  }, [router]);

  const handleOpenInterested = useCallback(
    (jobId: string) => {
      router.push(`/(employer)/(tabs)/jobs/${jobId}/interested` as any);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <JobListItem job={item} onOpenInterested={handleOpenInterested} />
    ),
    [handleOpenInterested],
  );

  if (isLoading) {
    return <LoadingScreen message="Loading your jobs…" />;
  }

  return (
    <AppScreen centered={false} maxWidth="tab">
      <TabWebShell>
        <ScreenHeader
          title="My jobs"
          subtitle={`${jobs.length} active role${jobs.length === 1 ? '' : 's'} · ${totalInterested} interested`}
        />
        <Button
          title="Post new job"
          onPress={handlePostJob}
          className="mb-4"
          fullWidth
        />

        {error ? (
          <EmptyState
            emoji="⚠️"
            title="Could not load jobs"
            description="Check your connection and try again."
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        ) : jobs.length === 0 ? (
          <EmptyState
            emoji="📋"
            title="No jobs yet"
            description="Post your first casual role and start receiving interest from local candidates."
            actionLabel="Post your first job"
            onAction={() => router.push('/(employer)/(tabs)/post-job')}
          />
        ) : (
          <FlatList
            key={`jobs-cols-${numColumns}`}
            data={jobs}
            numColumns={numColumns}
            keyExtractor={(job) => job.id}
            columnWrapperStyle={numColumns > 1 ? { gap: 12 } : undefined}
            contentContainerStyle={{ gap: 12, paddingBottom: 40 }}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#818cf8" />
            }
            renderItem={renderItem}
          />
        )}
      </TabWebShell>
    </AppScreen>
  );
}
