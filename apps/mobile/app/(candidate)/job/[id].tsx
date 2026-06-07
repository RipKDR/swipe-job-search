import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, Pressable } from '@/components/tw';
import { Alert, Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { usePostHog } from '@/hooks/usePostHog';
import { useTheme } from '@/hooks/useTheme';
import { BookmarkButton } from '@/components/bookmarks/BookmarkButton';
import { ShareJobButton } from '@/components/share/ShareJobButton';
import * as Haptics from 'expo-haptics';
import type { Job } from '@hi-hired/shared';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

/* ── Queries ──────────────────────────────────────────── */

async function fetchJobById(id: string): Promise<Job | null> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data as Job;
}

async function fetchEmployerName(employerId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', employerId)
    .maybeSingle();
  return (data?.full_name as string | null) ?? null;
}

async function fetchUserSwipeState(jobId: string, userId: string): Promise<'applied' | 'interested' | null> {
  const { data } = await supabase
    .from('swipes')
    .select('direction')
    .eq('candidate_id', userId)
    .eq('job_id', jobId)
    .maybeSingle();
  return (data?.direction as 'applied' | 'interested' | undefined) ?? null;
}

async function fetchSimilarJobs(id: string, suburb: string, jobType: string): Promise<Partial<Job>[]> {
  const { data: similar } = await supabase
    .from('jobs')
    .select('id,title,suburb,pay_display,job_type,source')
    .eq('status', 'active')
    .eq('suburb', suburb)
    .neq('id', id)
    .limit(3);
  if (similar && (similar as any[]).length === 3) return similar as Partial<Job>[];

  // Fallback: same job_type
  const { data: sameType } = await supabase
    .from('jobs')
    .select('id,title,suburb,pay_display,job_type,source')
    .eq('status', 'active')
    .eq('job_type', jobType as 'casual' | 'part_time' | 'permanent')
    .neq('id', id)
    .limit(3);
  return (sameType ?? []) as Partial<Job>[];
}

/* ── Trackers ─────────────────────────────────────────── */

async function trackApplication(jobId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('swipes')
      .upsert(
        [{ candidate_id: user.id, job_id: jobId, direction: 'applied' }],
        { onConflict: 'candidate_id,job_id' }
      );
  } catch {
    // Non-critical
  }
}

/* ── Component ────────────────────────────────────────── */

export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const posthog = usePostHog();

  /* Data */
  const { data: job, isLoading, error } = useQuery<Job | null>({
    queryKey: ['job', id],
    queryFn: () => fetchJobById(id!),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });

  const employerId = job?.employer_id;
  const { data: employerName } = useQuery<string | null>({
    queryKey: ['employer-name', employerId],
    queryFn: () => fetchEmployerName(employerId!),
    enabled: Boolean(employerId),
    staleTime: 10 * 60 * 1000,
  });

  const { data: swipeState } = useQuery<'applied' | 'interested' | null>({
    queryKey: ['swipe-state', id, user?.id],
    queryFn: () => fetchUserSwipeState(id!, user!.id),
    enabled: Boolean(id && user?.id),
    staleTime: 60 * 1000,
  });

  const { data: similarJobs = [] } = useQuery<Partial<Job>[]>({
    queryKey: ['similar-jobs', id, job?.suburb, job?.job_type],
    queryFn: () => fetchSimilarJobs(id!, job!.suburb, job!.job_type),
    enabled: Boolean(id && job?.suburb && job?.job_type),
    staleTime: 5 * 60 * 1000,
  });

  /* Handlers */
  const handleInterested = async () => {
    if (!job) return;
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) throw new Error('Not authenticated');
      await supabase
        .from('swipes')
        .upsert([{ candidate_id: u.id, job_id: job.id, direction: 'right' }], {
          onConflict: 'candidate_id,job_id',
        });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      posthog.capture('job_swiped', { direction: 'right', job_id: job.id });
      Alert.alert('Interest sent', 'The employer will see you in their interested list.', [
        { text: 'Back to deck', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Could not record interest. Try from deck.');
    }
  };

  const handleApply = async () => {
    if (!job) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    posthog.capture('job_apply_clicked', { job_id: job.id, source: job.source });
    await trackApplication(job.id);
    if (job.url) {
      const canOpen = await Linking.canOpenURL(job.url);
      if (canOpen) {
        await Linking.openURL(job.url);
      } else {
        Alert.alert('Could not open link', 'The job listing URL may be invalid.');
      }
    } else {
      Alert.alert(
        'No direct link',
        "This job doesn't have an external listing. Show your interest instead.",
        [
          { text: 'Show interest', onPress: handleInterested },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  /* States */
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

  /* Derived */
  const sourceLabel = job.source ? `via ${job.source}` : '';
  const hasUrl = Boolean(job.url);
  const isExpired = job.status === 'expired' || (job.expires_at && new Date(job.expires_at) < new Date());
  const jobTypeLabel = job.job_type?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <AppScreen
      scroll
      centered
      maxWidth="lg"
      footer={
        <View className="gap-3">
          {swipeState === 'applied' && (
            <Text className="text-emerald-400 text-xs text-center">✓ You applied to this job</Text>
          )}
          {swipeState === 'interested' && (
            <Text className="text-indigo-300 text-xs text-center">✓ You showed interest in this job</Text>
          )}
          {hasUrl && (
            <Button
              title={swipeState === 'applied' ? 'Apply again' : 'Apply Now'}
              fullWidth
              onPress={handleApply}
            />
          )}
          <Button
            title={swipeState === 'interested' ? 'Interest sent ✓' : "I'm interested"}
            variant={hasUrl ? 'outline' : 'primary'}
            fullWidth
            onPress={handleInterested}
            disabled={swipeState === 'interested'}
          />
          <Text className="text-slate-500 text-xs text-center">
            {hasUrl
              ? 'Apply opens the original listing · Interest lets the employer see you'
              : 'Same as swiping right on the deck'}
          </Text>
        </View>
      }
    >
      <ScreenHeader
        onBack={() => router.back()}
        title={job.title}
        subtitle={[job.suburb, jobTypeLabel].filter(Boolean).join(' · ')}
        actions={
          <View className="flex-row items-center gap-3">
            <ShareJobButton job={job} sharerName={profile?.full_name} variant="header" />
            <BookmarkButton jobId={job.id} variant="header" size={24} />
            {isExpired && (
              <Text className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: '#7f1d1d', color: '#fca5a5' }}>
                Expired
              </Text>
            )}
          </View>
        }
      />

      {/* Pay Card */}
      <View
        className="rounded-2xl border p-5 mb-6"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }}
      >
        <Text className="text-emerald-400 text-4xl font-bold tabular-nums">
          {job.pay_display || 'Rate not specified'}
        </Text>
        <Text className="mt-2" style={{ color: colors.muted }}>
          {job.hours_text || 'Hours not specified'}
        </Text>
        {sourceLabel ? (
          <Text className="mt-1 text-xs" style={{ color: colors.subtle }}>
            Listed {sourceLabel}
          </Text>
        ) : null}
      </View>

      {/* Role Details Grid */}
      <Text className="text-white text-lg font-semibold mb-3">Role details</Text>
      <View
        className="rounded-2xl border p-4 mb-6 gap-4"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }}
      >
        <DetailRow label="Job type" value={jobTypeLabel ?? 'Not specified'} />
        <DetailRow
          label="Location"
          value={job.suburb}
          style={{ borderBottomWidth: 0 }}
        />
        {employerName && (
          <DetailRow
            label="Employer"
            value={employerName}
            style={{ borderBottomWidth: 0 }}
          />
        )}
      </View>

      {/* About the role */}
      <Text className="text-white text-lg font-semibold mb-2">About the role</Text>
      <Text className="leading-relaxed text-base" style={{ color: colors.text }}>
        {job.description ||
          'Great casual opportunity in the local area. Supportive team, consistent shifts.'}
      </Text>

      {/* Similar Jobs */}
      {similarJobs.length > 0 && (
        <View className="mt-8 mb-8">
          <Text className="text-white text-lg font-semibold mb-3">Similar jobs</Text>
          <View className="gap-3">
            {similarJobs.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => {
                  router.replace(`/(candidate)/job/${s.id}`);
                }}
                className="rounded-2xl border p-4 flex-row justify-between items-center active:opacity-80"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                }}
              >
                <View className="flex-1 gap-1">
                  <Text className="text-white font-medium">{s.title}</Text>
                  <Text className="text-xs" style={{ color: colors.muted }}>
                    {s.suburb}{s.source ? ` · ${s.source}` : ''}
                  </Text>
                </View>
                <Text
                  className="font-semibold"
                  style={{ color: colors.accent }}
                >{s.pay_display}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </AppScreen>
  );
}

/* ── DetailRow subcomponent ───────────────────────────── */

function DetailRow({
  label,
  value,
  style,
}: {
  label: string;
  value: string;
  style?: Record<string, any>;
}) {
  const { colors } = useTheme();
  return (
    <View
      className="flex-row justify-between items-center pb-3"
      style={[{ borderBottomWidth: 1, borderBottomColor: colors.border }, style]}
    >
      <Text style={{ color: colors.muted }}>{label}</Text>
      <Text className="text-white font-medium">{value}</Text>
    </View>
  );
}
