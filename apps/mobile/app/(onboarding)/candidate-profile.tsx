import { View, Text, ScrollView } from '@/components/tw';
import { Alert, Platform } from 'react-native';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CandidateOnboardingSchema, type CandidateOnboarding } from '@hi-hired/shared';
import { usePostHog } from '@/hooks/usePostHog';
import { CandidateProfileForm } from '@/components/forms/CandidateProfileForm';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { PROFILE_SELECT } from '@/providers/AuthProvider';
import { buildCandidateProfileUpdate } from '@/lib/onboarding-submit';
import { pickAndUploadAvatar } from '@/lib/avatar-upload';

// Lazy import expo-image-picker on native only (no web impl)
let ImagePicker: typeof import('expo-image-picker') | null = null;
if (Platform.OS !== 'web') {
  try { ImagePicker = require('expo-image-picker'); } catch {}
}

export default function CandidateProfile() {
  const { user, applyProfile } = useAuth();
  const posthog = usePostHog();
  const [submitting, setSubmitting] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

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
      const nowIso = new Date().toISOString();
      const { data: updatedProfile, error: profileError } = await (supabase.from('profiles') as any)
        .update(buildCandidateProfileUpdate(data, nowIso))
        .eq('id', user.id)
        .select(PROFILE_SELECT)
        .single();

      if (profileError) throw profileError;
      if (!updatedProfile) throw new Error('Profile update returned no row');

      posthog.capture('candidate_onboarding_completed', {
        has_avatar: Boolean(data.avatar_url),
        skills_count: data.skills?.length ?? 0,
        work_rights: data.work_rights,
      });
      applyProfile(updatedProfile);
    } catch (error) {
      console.error('[onboarding] Candidate profile error:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAvatarPick = async () => {
    if (!user) return;
    if (!ImagePicker) {
      Alert.alert('Not available', 'Avatar upload is not available on web yet.');
      return;
    }

    setAvatarUploading(true);
    try {
      const uploadedUrl = await pickAndUploadAvatar({
        userId: user.id,
        imagePicker: ImagePicker as typeof import('expo-image-picker'),
        supabaseStorage: supabase.storage.from('avatars'),
        fetchImpl: fetch,
      });

      if (uploadedUrl) {
        form.setValue('avatar_url', uploadedUrl, { shouldValidate: true });
      }
    } catch (error) {
      console.error('[onboarding] Avatar upload error:', error);
      Alert.alert('Upload failed', 'Could not upload avatar. Please try again.');
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView className="flex-1" contentContainerClassName="px-6 pt-12 pb-8">
        <View className="mb-8">
          <Text className="text-white text-2xl font-bold mb-2">Create your profile</Text>
          <Text className="text-slate-400 text-sm">Tell employers about yourself (under 60 seconds)</Text>
        </View>
        <CandidateProfileForm
          form={form}
          avatarUploading={avatarUploading}
          onAvatarPick={handleAvatarPick}
        />
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
