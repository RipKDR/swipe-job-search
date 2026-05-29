import React, { useState } from 'react';
import { Text } from '@/components/tw';
import { useRouter } from 'expo-router';
import { usePostHog } from '@/hooks/usePostHog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { JobForm, type JobFormValues } from '@/components/employer/JobForm';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

function buildPayDisplay(amount: number, period: 'hour' | 'week' | 'year') {
  const suffix = period === 'hour' ? '/hr' : period === 'week' ? '/wk' : '/yr';
  return `$${amount.toFixed(2)}${suffix}`;
}

async function uploadJobPhoto(photoUri: string, employerId: string) {
  const response = await fetch(photoUri);
  const blob = await response.blob();
  const fileExt = photoUri.split('.').pop()?.split('?')[0] ?? 'jpg';
  const path = `${employerId}/${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage.from('job-photos').upload(path, blob, {
    upsert: false,
    contentType: blob.type || 'image/jpeg',
  });

  if (error) throw error;
  const { data } = supabase.storage.from('job-photos').getPublicUrl(path);
  return data.publicUrl;
}

export default function PostJobScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const posthog = usePostHog();
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (values: JobFormValues) => {
    if (!profile?.id) throw new Error('You must be signed in as an employer');

    setSubmitting(true);
    setFeedback(null);
    try {
      const { data: membership, error: circleError } = await (supabase as any)
        .from('circle_members')
        .select('circle_id')
        .eq('profile_id', profile.id)
        .limit(1)
        .maybeSingle();

      if (circleError) throw circleError;
      if (!membership?.circle_id) throw new Error('No circle assigned to your employer profile');

      let photoUrl: string | null = null;
      if (values.photoUri.trim()) {
        photoUrl = await uploadJobPhoto(values.photoUri.trim(), profile.id);
      }

      const payAmount = Number(values.payAmount);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from('jobs').insert({
        employer_id: profile.id,
        circle_id: membership.circle_id,
        title: values.title.trim(),
        job_type: values.jobType,
        pay_amount: payAmount,
        pay_period: values.payPeriod,
        pay_display: buildPayDisplay(payAmount, values.payPeriod),
        hours_text: values.hoursText.trim(),
        suburb: values.suburb.trim(),
        description: values.description.trim() ? values.description.trim() : null,
        photo_url: photoUrl,
        expires_at: expiresAt,
      });

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
