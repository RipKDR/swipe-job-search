import { View, Text, ScrollView } from '@/components/tw';
import { Alert } from 'react-native';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EmployerOnboardingSchema, type EmployerOnboarding } from '@hi-hired/shared';
import { usePostHog } from 'posthog-react-native';
import { EmployerProfileForm } from '@/components/forms/EmployerProfileForm';
import { Button } from '@/components/ui/Button';
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
    <View className="flex-1 bg-slate-950">
      <ScrollView className="flex-1" contentContainerClassName="px-6 pt-12 pb-8">
        <View className="mb-8">
          <Text className="text-white text-2xl font-bold mb-2">Business details</Text>
          <Text className="text-slate-400 text-sm">Tell candidates about your business (under 60 seconds)</Text>
        </View>
        <EmployerProfileForm form={form} />
        <Button
          title="Complete Profile"
          fullWidth
          loading={submitting}
          disabled={submitting}
          onPress={form.handleSubmit(onSubmit)}
          className="mt-8"
        />
      </ScrollView>
    </View>
  );
}
