import { View, Text, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EmployerOnboardingSchema, type EmployerOnboarding } from '@hi-hired/shared';
import { EmployerProfileForm } from '@/components/forms/EmployerProfileForm';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { PROFILE_SELECT } from '@/providers/AuthProvider';

export default function EmployerProfile() {
  const { user, applyProfile } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<EmployerOnboarding>({
    resolver: zodResolver(EmployerOnboardingSchema),
    defaultValues: {
      business_name: '',
      contact_name: '',
    },
  });

  const onSubmit = async (data: EmployerOnboarding) => {
    if (!user) {
      Alert.alert('Error', 'No authenticated user');
      return;
    }

    setSubmitting(true);
    try {
      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .update({
          role: 'employer',
          suburb: data.suburb,
          avatar_url: data.avatar_url ?? null,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select(PROFILE_SELECT)
        .single();

      if (profileError) throw profileError;
      if (!updatedProfile) throw new Error('Profile update returned no row');

      const { error: employerError } = await supabase.from('employer_profiles').insert({
        profile_id: user.id,
        business_name: data.business_name,
        contact_name: data.contact_name,
        about_text: data.about_text ?? null,
      });

      if (employerError) throw employerError;

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
          <Text className="text-slate-400 text-sm">
            Tell candidates about your business (under 60 seconds)
          </Text>
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
