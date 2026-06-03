import { Alert } from 'react-native';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EmployerOnboardingSchema, type EmployerOnboarding } from '@hi-hired/shared';
import { usePostHog } from '@/hooks/usePostHog';
import { EmployerProfileForm } from '@/components/forms/EmployerProfileForm';
import { Button } from '@/components/ui/Button';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function EmployerProfile() {
  const { applyProfile } = useAuth();
  const posthog = usePostHog();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<EmployerOnboarding>({
    resolver: zodResolver(EmployerOnboardingSchema),
    defaultValues: {
      business_name: '',
      contact_name: '',
    },
  });

  const onSubmit = async (data: EmployerOnboarding) => {
    setSubmitting(true);
    try {
      const { data: updatedProfile, error } = await (supabase as any).rpc('complete_employer_onboarding', {
        p_suburb: data.suburb,
        p_avatar_url: data.avatar_url ?? null,
        p_business_name: data.business_name,
        p_contact_name: data.contact_name,
        p_about_text: data.about_text ?? null,
      });

      if (error) throw error;
      if (!updatedProfile) throw new Error('Employer onboarding returned no profile');

      posthog.capture('employer_onboarding_completed', {
        has_avatar: Boolean(data.avatar_url),
        has_contact_name: Boolean(data.contact_name),
      });
      applyProfile(updatedProfile);
    } catch (error) {
      console.error('[onboarding] Employer profile error:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OnboardingShell
      title="Business details"
      subtitle="Help candidates understand your business — quick setup, no lengthy forms."
      step={2}
      totalSteps={2}
      footer={
        <Button
          title="Complete profile"
          fullWidth
          loading={submitting}
          disabled={submitting}
          onPress={form.handleSubmit(onSubmit)}
        />
      }
    >
      <EmployerProfileForm form={form} />
    </OnboardingShell>
  );
}
