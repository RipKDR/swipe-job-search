import React, { useState } from 'react';
import { Text } from '@/components/tw';
import { useRouter } from 'expo-router';
import { usePostHog } from '@/hooks/usePostHog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { JobForm, type JobFormValues } from '@/components/employer/JobForm';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { buildJobInsertPayload, uploadJobPhoto } from '@/lib/job-submit';
import { EmptyState } from '@/components/ui/EmptyState';

export default function PostJobScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const posthog = usePostHog();
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [noCircle, setNoCircle] = useState(false);

  const ensureCircle = async (employerId: string): Promise<string | null> => {
    // First, check for existing circle membership
    const { data: membership, error: circleError } = await supabase
      .from('circle_members')
      .select('circle_id')
      .eq('profile_id', employerId)
      .limit(1)
      .maybeSingle();

    if (circleError) throw circleError;
    if (membership?.circle_id) return membership.circle_id;

    // No circle found - try to get/assign default circle
    const { data: defaultCircle, error: defaultError } = await (supabase as any)
      .from('circles')
      .select('id')
      .eq('is_default', true)
      .limit(1)
      .maybeSingle();

    if (defaultError) throw defaultError;
    if (!defaultCircle) {
      setNoCircle(true);
      return null;
    }

    // Assign to default circle
    const { error: insertError } = await (supabase as any)
      .from('circle_members')
      .insert({ profile_id: employerId, circle_id: defaultCircle.id })
      .select('circle_id')
      .maybeSingle();

    if (insertError) throw insertError;
    return defaultCircle.id;
  };

  const handleSubmit = async (values: JobFormValues) => {
    if (!profile?.id) throw new Error('You must be signed in as an employer');

    setSubmitting(true);
    setFeedback(null);
    setNoCircle(false);
    try {
      const circleId = await ensureCircle(profile.id);
      if (!circleId) return; // noCircle will be true

      let photoUrl: string | null = null;
      if (values.photoUri.trim()) {
        photoUrl = await uploadJobPhoto(values.photoUri.trim(), profile.id);
      }

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const jobPayload = buildJobInsertPayload({
        values,
        employerId: profile.id,
        circleId,
        photoUrl,
        expiresAt,
      });

      const { error } = await supabase.from('jobs').insert(jobPayload);

      if (error) throw error;

      posthog.capture('job_posted', {
        job_type: values.jobType,
        pay_period: values.payPeriod,
        has_photo: Boolean(values.photoUri.trim()),
        has_description: Boolean(values.description.trim()),
      });
      setFeedback('Job posted successfully');
      router.replace('/(employer)/(tabs)/jobs');
    } finally {
      setSubmitting(false);
    }
  };

  if (noCircle) {
    return (
      <AppScreen centered={false} maxWidth="lg">
        <ScreenHeader title="Post a job" onBack={() => router.back()} />
        <EmptyState
          emoji="📍"
          title="No service area assigned"
          description="Your business needs to be assigned to a service area before posting jobs. This usually happens automatically after onboarding. Please try again in a moment, or contact support if the issue persists."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll centered maxWidth="lg">
      <ScreenHeader
        title="Post a job"
        subtitle="Roles expire after 30 days. Pay must meet Fair Work minimums where applicable."
      />
      {feedback ? <Text className="text-emerald-400 mb-4">{feedback}</Text> : null}
      <JobForm submitting={submitting} onSubmit={handleSubmit} />
    </AppScreen>
  );
}
