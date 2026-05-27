// Employer profile onboarding form
// Per 02-mvp-definition.md §4: business_name, suburb, contact_name
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EmployerOnboardingSchema, type EmployerOnboardingInput } from '@hi-hired/shared';
import { EmployerProfileForm } from '@/components/forms/EmployerProfileForm';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function EmployerProfile() {
  const { user, refreshProfile } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<EmployerOnboardingInput>({
    resolver: zodResolver(EmployerOnboardingSchema),
    defaultValues: {
      suburb: undefined,
      business_name: '',
      // @ts-ignore - optional field can be null
      contact_name: null,
      // @ts-ignore - optional field can be null
      avatar_url: null,
    },
  });

  const onSubmit = async (data: EmployerOnboardingInput) => {
    if (!user) {
      Alert.alert('Error', 'No authenticated user');
      return;
    }

    setSubmitting(true);
    try {
      // Update profile with employer data and mark onboarding complete
      // @ts-ignore - Database types incomplete for Update
      const { error: profileError } = await supabase.from('profiles').update({
        role: 'employer',
        suburb: data.suburb,
        avatar_url: data.avatar_url,
        onboarding_completed_at: new Date().toISOString(),
      } as any).eq('id', user.id);

      if (profileError) throw profileError;

      // Create employer_profiles row
      // @ts-ignore - Database types incomplete for Insert
      const { error: employerError } = await supabase.from('employer_profiles').insert({
        profile_id: user.id,
        business_name: data.business_name,
        contact_name: data.contact_name || null,
      } as any);

      if (employerError) throw employerError;

      // Refresh profile to trigger routing
      await refreshProfile();

      // Root layout will redirect to employer home
    } catch (error) {
      console.error('[onboarding] Employer profile error:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView className="flex-1" contentContainerClassName="px-6 pt-12 pb-8">
        {/* Header */}
        <View className="mb-8">
          <Text className="text-white text-2xl font-bold mb-2">Business details</Text>
          <Text className="text-slate-400 text-sm">
            Tell candidates about your business (under 60 seconds)
          </Text>
        </View>

        {/* Form */}
        <EmployerProfileForm form={form} />

        {/* Submit Button */}
        <Pressable
          onPress={form.handleSubmit(onSubmit)}
          disabled={submitting}
          className={`mt-8 py-4 rounded-xl ${
            submitting ? 'bg-slate-800' : 'bg-indigo-600'
          }`}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-center font-semibold text-base">
              Complete Profile
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}
