// Candidate profile onboarding form
// Per 02-mvp-definition.md §4: name, suburb, experience, skills (max 5), availability, work rights
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CandidateOnboardingSchema, type CandidateOnboardingInput } from '@hi-hired/shared';
import { CandidateProfileForm } from '@/components/forms/CandidateProfileForm';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function CandidateProfile() {
  const { user, refreshProfile } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CandidateOnboardingInput>({
    resolver: zodResolver(CandidateOnboardingSchema),
    defaultValues: {
      full_name: '',
      suburb: undefined,
      experience_text: '',
      skills: [],
      availability_text: '',
      work_rights: undefined,
      // @ts-ignore - optional field can be null
      avatar_url: null,
    },
  });

  const onSubmit = async (data: CandidateOnboardingInput) => {
    if (!user) {
      Alert.alert('Error', 'No authenticated user');
      return;
    }

    setSubmitting(true);
    try {
      // Update profile with candidate data and mark onboarding complete
      // @ts-ignore - Database types incomplete for Update
      const { error: profileError } = await supabase.from('profiles').update({
        role: 'candidate',
        full_name: data.full_name,
        suburb: data.suburb,
        experience_text: data.experience_text,
        skills: data.skills,
        availability_text: data.availability_text,
        work_rights: data.work_rights,
        avatar_url: data.avatar_url,
        onboarding_completed_at: new Date().toISOString(),
      } as any).eq('id', user.id);

      if (profileError) throw profileError;

      // Refresh profile to trigger routing
      await refreshProfile();

      // Root layout will redirect to candidate home
    } catch (error) {
      console.error('[onboarding] Candidate profile error:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView className="flex-1" contentContainerClassName="px-6 pt-12 pb-8">
        {/* Header */}
        <View className="mb-8">
          <Text className="text-white text-2xl font-bold mb-2">Create your profile</Text>
          <Text className="text-slate-400 text-sm">
            Tell employers about yourself (under 60 seconds)
          </Text>
        </View>

        {/* Form */}
        <CandidateProfileForm form={form} />

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
