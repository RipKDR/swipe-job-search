import { supabase } from '@/lib/supabase';
import type { Database } from '@hi-hired/shared';
import type { JobFormValues } from '@/components/employer/JobForm';

export function buildPayDisplay(amount: number, period: 'hour' | 'week' | 'year') {
  const suffix = period === 'hour' ? '/hr' : period === 'week' ? '/wk' : '/yr';
  return `$${amount.toFixed(2)}${suffix}`;
}

export async function uploadJobPhoto(photoUri: string, employerId: string) {
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

export function buildJobEditablePayload(
  values: JobFormValues,
  photoUrl: string | null,
): Database['public']['Tables']['jobs']['Update'] {
  const payAmount = Number(values.payAmount);

  return {
    title: values.title.trim(),
    job_type: values.jobType,
    pay_amount: payAmount,
    pay_period: values.payPeriod,
    pay_display: buildPayDisplay(payAmount, values.payPeriod),
    hours_text: values.hoursText.trim(),
    suburb: values.suburb.trim(),
    description: values.description.trim() ? values.description.trim() : null,
    photo_url: photoUrl,
  };
}

export function buildJobInsertPayload({
  values,
  employerId,
  circleId,
  photoUrl,
  expiresAt,
}: {
  values: JobFormValues;
  employerId: string;
  circleId: string;
  photoUrl: string | null;
  expiresAt: string;
}): Database['public']['Tables']['jobs']['Insert'] {
  return {
    employer_id: employerId,
    circle_id: circleId,
    ...buildJobEditablePayload(values, photoUrl),
    expires_at: expiresAt,
  };
}

export function shouldUploadJobPhoto(nextPhotoUri: string, currentPhotoUrl?: string | null) {
  const trimmed = nextPhotoUri.trim();
  return Boolean(trimmed && trimmed !== currentPhotoUrl);
}
