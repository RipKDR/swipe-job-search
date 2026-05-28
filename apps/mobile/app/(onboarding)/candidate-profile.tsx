import { View, Text, ScrollView } from '@/components/tw';
import { Alert } from 'react-native';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CandidateOnboardingSchema, type CandidateOnboarding } from '@hi-hired/shared';
import { CandidateProfileForm } from '@/components/forms/CandidateProfileForm';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { PROFILE_SELECT } from '@/providers/AuthProvider';

export default function CandidateProfile() {
  const { user, applyProfile } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CandidateOnboarding>({
    resolver: zodResolver(CandidateOnboardingSchema),
    defaultValues: {
      full_name: '',
      experience_text: '',
      skills: [],
      availability_text: '',
    },
  });

  const onSubmit = async (data: CandidateOnboarding) => {
    if (!user) {
      Alert.alert('Error', 'No authenticated user');
      return;
    }

    setSubmitting(true);
    try {
      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .update({
          role: 'candidate',
          full_name: data.full_name,
          suburb: data.suburb,
          experience_text: data.experience_text,
          skills: data.skills,
          availability_text: data.availability_text,
          work_rights: data.work_rights,
          avatar_url: data.avatar_url ?? null,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select(PROFILE_SELECT)
        .single();

      if (profileError) throw profileError;
      if (!updatedProfile) throw new Error('Profile update returned no row');

      applyProfile(updatedProfile);
    } catch (error) {
      console.error('[onboarding] Candidate profile error:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView className="flex-1" contentContainerClassName="px-6 pt-12 pb-8">
        <View className="mb-8">
          <Text className="text-white text-2xl font-bold mb-2">Create your profile</Text>
          <Text className="text-slate-400 text-sm">Tell employers about yourself (under 60 seconds)</Text>
        </View>
        <CandidateProfileForm form={form} />
        <Button title="Complete Profile" fullWidth loading={submitting} disabled={submitting} onPress={form.handleSubmit(onSubmit)} className="mt-8" />
      </ScrollView>
    </View>
  );
}
