import React, { useCallback, useMemo } from 'react';
import { FlashList, Pressable, View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TabWebShell } from '@/components/ui/TabWebShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTheme } from '@/providers/ThemeProvider';

interface SwipedJob {
  job_id: string;
  swiped_at: string;
  direction: 'right' | 'left' | 'applied' | 'super';
  jobs: {
    id: string;
    title: string;
    suburb: string | null;
    pay_display: string | null;
    employer_name: string | null;
    status: string;
    created_at: string;
  } | null;
}

const SwipedJobCard = React.memo(function SwipedJobCard({
  job,
  onPress,
}: {
  job: NonNullable<SwipedJob['jobs']>;
  onPress: (jobId: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => onPress(job.id)}
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text
          style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}
          numberOfLines={1}
        >
          {job.title}
        </Text>
        {job.employer_name ? (
          <Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={1}>
            {job.employer_name}
          </Text>
        ) : null}
        {job.suburb ? (
          <Text style={{ color: colors.subtle, fontSize: 13 }} numberOfLines={1}>
            {job.suburb}
          </Text>
        ) : null}
        {job.pay_display ? (
          <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '600', marginTop: 6 }}>
            {job.pay_display}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}, (prev, next) => prev.job.id === next.job.id);

async function fetchSwipedJobs(direction: SwipedJob['direction'][]): Promise<SwipedJob[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('swipes')
    .select(`
      job_id,
      swiped_at:created_at,
      direction,
      jobs!left (
        id,
        title,
        suburb,
        pay_display,
        employer_name,
        status,
        created_at
      )
    `)
    .eq('candidate_id', user.id)
    .in('direction', direction)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []) as unknown as SwipedJob[];
}

async function fetchInterestedJobs(): Promise<SwipedJob[]> {
  return fetchSwipedJobs(['right']);
}

async function fetchAppliedJobs(): Promise<SwipedJob[]> {
  return fetchSwipedJobs(['applied', 'super']);
}

export default function AppliedJobsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const {
    data: interestedJobs = [],
    isLoading: interestedLoading,
    isFetching: interestedFetching,
    error: interestedError,
    refetch: refetchInterested,
  } = useQuery<SwipedJob[]>({
    queryKey: ['interested-jobs'],
    queryFn: fetchInterestedJobs,
    staleTime: 30_000,
  });

  const {
    data: appliedJobs = [],
    isLoading: appliedLoading,
    isFetching: appliedFetching,
    error: appliedError,
    refetch: refetchApplied,
  } = useQuery<SwipedJob[]>({
    queryKey: ['applied-jobs'],
    queryFn: fetchAppliedJobs,
    staleTime: 30_000,
  });

  const isLoading = interestedLoading || appliedLoading;
  const isFetching = interestedFetching || appliedFetching;
  const error = interestedError || appliedError;

  const hasInterestedJobs = interestedJobs.length > 0;
  const hasAppliedJobs = appliedJobs.length > 0;
  const hasJobs = hasInterestedJobs || hasAppliedJobs;

  const handleJobPress = useCallback(
    (jobId: string) => {
      router.push(`/job/${jobId}` as any);
    },
    [router],
  );

  const keyExtractor = useCallback((item: SwipedJob) => item.job_id, []);

  const renderItem = useCallback(
    ({ item }: { item: SwipedJob }) => {
      const job = item.jobs;
      if (!job) return null;
      return (
        <SwipedJobCard
          job={job}
          onPress={handleJobPress}
        />
      );
    },
    [handleJobPress],
  );

  const refetch = useCallback(() => {
    void refetchInterested();
    void refetchApplied();
  }, [refetchInterested, refetchApplied]);

  if (isLoading) {
    return (
      <AppScreen centered={false} maxWidth="tab">
        <TabWebShell>
          <ScreenHeader title="Applied" subtitle="Jobs you've applied to" />
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </TabWebShell>
      </AppScreen>
    );
  }

  if (error) {
    return (
      <AppScreen centered={false} maxWidth="tab">
        <TabWebShell>
          <ScreenHeader title="Applied" subtitle="Something went wrong" />
          <EmptyState
            emoji="⚠️"
            title="Couldn't load applications"
            description="There was a problem fetching your jobs. Pull down to try again."
            actionLabel="Retry"
            onAction={refetch}
          />
        </TabWebShell>
      </AppScreen>
    );
  }

  return (
    <AppScreen centered={false} maxWidth="tab">
      <TabWebShell>
        <ScreenHeader
          title="Applied"
          subtitle={`Interested: ${interestedJobs.length} ${interestedJobs.length === 1 ? 'job' : 'jobs'} · Applied: ${appliedJobs.length} ${appliedJobs.length === 1 ? 'job' : 'jobs'}`}
        />

        {hasJobs ? (
          <>
            {hasInterestedJobs && (
              <View style={{ paddingHorizontal: 16, marginTop: 8, marginBottom: 4 }}>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                  Interested ({interestedJobs.length})
                </Text>
              </View>
            )}
            {hasInterestedJobs && (
              <FlashList
                data={interestedJobs}
                keyExtractor={keyExtractor}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: hasAppliedJobs ? 16 : 32, gap: 8 }}
                renderItem={renderItem}
                onRefresh={refetch}
                refreshing={interestedFetching}
                estimatedItemSize={120}
              />
            )}

            {hasAppliedJobs && (
              <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 4 }}>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                  Applied ({appliedJobs.length})
                </Text>
              </View>
            )}
            {hasAppliedJobs && (
              <FlashList
                data={appliedJobs}
                keyExtractor={keyExtractor}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 8 }}
                renderItem={renderItem}
                onRefresh={refetch}
                refreshing={appliedFetching}
                estimatedItemSize={120}
              />
            )}
          </>
        ) : (
          <EmptyState
            emoji="👆"
            title="No applications yet"
            description="Swipe right to show interest. Tap 'Apply' on a job to submit an application. Both will appear here."
            actionLabel="Browse jobs"
            onAction={() => router.push('/(candidate)/(tabs)/deck' as any)}
          />
        )}
      </TabWebShell>
    </AppScreen>
  );
}
