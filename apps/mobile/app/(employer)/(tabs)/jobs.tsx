import React, { useCallback } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { Text } from '@/components/tw';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { JobListItem } from '@/components/employer/JobListItem';
import { useMyJobs, type MyJobItem } from '@/hooks/useMyJobs';
import { useMatchInbox } from '@/hooks/useMatchInbox';
import { useTheme } from '@/hooks/useTheme';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { TabWebShell } from '@/components/ui/TabWebShell';
import { useListColumns } from '@/hooks/useListColumns';

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
  const { data: jobs = [], isLoading, error, refetch, isRefetching } = useMyJobs();
  const { data: matches = [] } = useMatchInbox();
  const numColumns = useListColumns(2);
  const { colors } = useTheme();

  const totalInterested = jobs.reduce((sum, j) => sum + (j.interestedCount || 0), 0);
  const activeMatches = matches.filter((m) => m.status === 'chatting' || m.status === 'hire_pending').length;
  const activeJobs = jobs.filter(
    (j) => j.status === 'active' && (!j.expires_at || new Date(j.expires_at) > new Date())
  ).length;

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
    ({ item }: { item: MyJobItem }) => (
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
          subtitle={`${activeJobs} active · ${activeJobs === 0 && jobs.length > 0 ? `${jobs.length - activeJobs} inactive` : ''}`}
        />

        {/* Stats summary */}
        <View className="flex-row gap-3 mb-5">
          <StatCard label="Active jobs" value={activeJobs} />
          <StatCard label="Interested" value={totalInterested} accent />
          <StatCard label="Matches" value={activeMatches} />
        </View>

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
