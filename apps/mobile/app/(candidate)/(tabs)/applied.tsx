import React, { useCallback } from 'react';
import { FlatList, Pressable, View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TabWebShell } from '@/components/ui/TabWebShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTheme } from '@/providers/ThemeProvider';

interface AppliedJob {
  job_id: string;
  swiped_at: string;
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

type AppliedJobsColors = ReturnType<typeof useTheme>['colors'];

const AppliedJobCard = React.memo(function AppliedJobCard({
  job,
  onPress,
  colors,
}: {
  job: NonNullable<AppliedJob['jobs']>;
  onPress: (jobId: string) => void;
  colors: AppliedJobsColors;
}) {
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
});

async function fetchAppliedJobs(): Promise<AppliedJob[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await (supabase as any)
    .from('swipes')
    .select(`
      job_id,
      swiped_at:created_at,
      jobs!inner (
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
    .in('direction', ['right', 'applied'])
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []) as AppliedJob[];
}

export default function AppliedJobsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const { data: jobs = [], isLoading, error, refetch } = useQuery<AppliedJob[]>({
    queryKey: ['applied-jobs'],
    queryFn: fetchAppliedJobs,
    staleTime: 30_000,
  });

  const hasJobs = jobs.length > 0;

  const handleJobPress = useCallback(
    (jobId: string) => {
      router.push(`/job/${jobId}` as any);
    },
    [router],
  );

  const keyExtractor = useCallback((item: AppliedJob) => item.job_id, []);

  const renderItem = useCallback(
    ({ item }: { item: AppliedJob }) => {
      const job = item.jobs;
      if (!job) return null;
      return (
        <AppliedJobCard
          job={job}
          onPress={handleJobPress}
          colors={colors}
        />
      );
    },
    [handleJobPress, colors],
  );

  if (isLoading) {
    return (
      <AppScreen centered={false} maxWidth="tab">
        <TabWebShell>
          <ScreenHeader title="Applied" subtitle="Jobs you're interested in" />
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </TabWebShell>
      </AppScreen>
    );
  }

  return (
    <AppScreen centered={false} maxWidth="tab">
      <TabWebShell>
        <ScreenHeader
          title="Applied"
          subtitle={`${hasJobs ? `${jobs.length} job${jobs.length === 1 ? '' : 's'}` : 'Jobs you\'re interested in'}`}
        />

        {!hasJobs ? (
          <EmptyState
            emoji="👆"
            title="No applications yet"
            description="Swipe right on jobs you're interested in — they'll show up here."
            actionLabel="Browse jobs"
            onAction={() => router.push('/(candidate)/(tabs)/deck' as any)}
          />
        ) : (
          <FlatList
            data={jobs}
            keyExtractor={keyExtractor}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 8 }}
            renderItem={renderItem}
            onRefresh={refetch}
            refreshing={isLoading}
          />
        )}
      </TabWebShell>
    </AppScreen>
  );
}
