import React, { useMemo, useState } from 'react';
import { Text } from '@/components/tw';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { JobForm, type JobFormValues } from '@/components/employer/JobForm';
import { useAuth } from '@/hooks/useAuth';
import { usePostHog } from '@/hooks/usePostHog';
import { supabase } from '@/lib/supabase';
import {
  buildJobEditablePayload,
  shouldUploadJobPhoto,
  uploadJobPhoto,
} from '@/lib/job-submit';
import type { Database } from '@hi-hired/shared';
import { BEACHHEAD_SUBURBS, type BeachheadSuburb } from '@hi-hired/shared';

type JobRow = Pick<
  Database['public']['Tables']['jobs']['Row'],
  | 'id'
  | 'employer_id'
  | 'title'
  | 'job_type'
  | 'pay_amount'
  | 'pay_period'
  | 'hours_text'
  | 'suburb'
  | 'description'
  | 'photo_url'
  | 'status'
  | 'expires_at'
>;

function getJobId(id: string | string[] | undefined) {
  return Array.isArray(id) ? id[0] : id;
}

function mapJobToFormValues(job: JobRow): JobFormValues {
  const suburb = BEACHHEAD_SUBURBS.includes(job.suburb as BeachheadSuburb)
    ? (job.suburb as BeachheadSuburb)
    : BEACHHEAD_SUBURBS[0];

  return {
    title: job.title,
    jobType: job.job_type,
    payAmount: String(Number(job.pay_amount)),
    payPeriod: job.pay_period,
    hoursText: job.hours_text,
    suburb: suburb as BeachheadSuburb,
    description: job.description ?? '',
    photoUri: job.photo_url ?? '',
  };
}

export default function EditJobScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const jobId = getJobId(id);
  const { profile } = useAuth();
  const posthog = usePostHog();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const {
    data: job,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['employer-job', jobId, profile?.id],
    enabled: Boolean(jobId && profile?.id),
    queryFn: async (): Promise<JobRow> => {
      if (!jobId || !profile?.id) throw new Error('Missing job or employer profile');

      const { data, error: jobError } = await supabase
        .from('jobs')
        .select(
          'id,employer_id,title,job_type,pay_amount,pay_period,hours_text,suburb,description,photo_url,status,expires_at',
        )
        .eq('id', jobId)
        .eq('employer_id', profile.id)
        .maybeSingle();

      if (jobError) throw jobError;
      if (!data) throw new Error('Job not found');
      return data as JobRow;
    },
  });

  const initialValues = useMemo(() => (job ? mapJobToFormValues(job) : undefined), [job]);

  const handleSubmit = async (values: JobFormValues) => {
    if (!job || !profile?.id) throw new Error('Missing job or employer profile');

    setSubmitting(true);
    setFeedback(null);
    try {
      const trimmedPhotoUri = values.photoUri.trim();
      let photoUrl: string | null = job.photo_url;

      if (!trimmedPhotoUri) {
        photoUrl = null;
      } else if (shouldUploadJobPhoto(trimmedPhotoUri, job.photo_url)) {
        photoUrl = await uploadJobPhoto(trimmedPhotoUri, profile.id);
      }

      const payload = buildJobEditablePayload(values, photoUrl);
      const { error: updateError } = await supabase
        .from('jobs')
        .update(payload)
        .eq('id', job.id)
        .eq('employer_id', profile.id);

      if (updateError) throw updateError;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-jobs', profile.id] }),
        queryClient.invalidateQueries({ queryKey: ['employer-job', job.id, profile.id] }),
      ]);

      posthog.capture('job_updated', {
        job_id: job.id,
        job_type: values.jobType,
        pay_period: values.payPeriod,
        had_existing_photo: Boolean(job.photo_url),
        has_photo: Boolean(photoUrl),
      });
      setFeedback('Job updated successfully');
      router.replace('/(employer)/(tabs)/jobs');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading job…" />;
  }

  if (error || !job || !initialValues) {
    return (
      <AppScreen centered={false} maxWidth="lg">
        <ScreenHeader title="Edit job" onBack={() => router.back()} />
        <EmptyState
          emoji="⚠️"
          title="Could not load job"
          description="This job may have been removed or you may not have access to it."
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll centered maxWidth="lg">
      <ScreenHeader
        title="Edit job"
        subtitle="Update the public job card. Status is managed from My Jobs."
        onBack={() => router.back()}
      />
      {feedback ? <Text className="text-emerald-400 mb-4">{feedback}</Text> : null}
      <JobForm
        initialValues={initialValues}
        submitLabel="Update job"
        errorFallback="Unable to update job"
        resetOnSubmit={false}
        submitting={submitting}
        onSubmit={handleSubmit}
      />
    </AppScreen>
  );
}
