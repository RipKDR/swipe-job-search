import { Alert, Platform } from 'react-native';
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EmployerOnboardingSchema, type EmployerOnboarding } from '@hi-hired/shared';
import { useRouter } from 'expo-router';
import { Text } from '@/components/tw';
import { EmployerProfileForm } from '@/components/forms/EmployerProfileForm';
import { Button } from '@/components/ui/Button';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useAuth } from '@/hooks/useAuth';
import { useEmployerProfile } from '@/hooks/useEmployerProfile';
import { usePostHog } from '@/hooks/usePostHog';
import { PROFILE_SELECT } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import {
  buildEmployerProfileDetailsUpdate,
  buildEmployerProfileUpdate,
} from '@/lib/onboarding-submit';
import { pickAndUploadAvatar, uploadAvatarFromUri } from '@/lib/avatar-upload';
import { getErrorMessage } from '@/lib/errors';
import { queryClient } from '@/lib/queryClient';

let ImagePicker: typeof import('expo-image-picker') | null = null;
if (Platform.OS !== 'web') {
  try {
    ImagePicker = require('expo-image-picker');
  } catch {
    ImagePicker = null;
  }
}

export default function EmployerEditProfileScreen() {
  const { user, profile, applyProfile } = useAuth();
  const router = useRouter();
  const posthog = usePostHog();
  const { data: employerProfile } = useEmployerProfile(profile?.id);
  const [submitting, setSubmitting] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const webFileInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<EmployerOnboarding>({
    resolver: zodResolver(EmployerOnboardingSchema),
    defaultValues: {
      business_name: '',
      suburb: (profile?.suburb as EmployerOnboarding['suburb']) ?? undefined,
      contact_name: '',
      about_text: '',
      avatar_url: profile?.avatar_url ?? null,
    },
  });

  const { reset } = form;
  useEffect(() => {
    if (!profile) return;

    reset({
      business_name: employerProfile?.business_name ?? '',
      suburb: (profile.suburb as EmployerOnboarding['suburb']) ?? undefined,
      contact_name: employerProfile?.contact_name ?? '',
      about_text: employerProfile?.about_text ?? '',
      avatar_url: profile.avatar_url ?? null,
    });
  }, [
    reset,
    profile?.id,
    profile?.suburb,
    profile?.avatar_url,
    employerProfile?.business_name,
    employerProfile?.contact_name,
    employerProfile?.about_text,
  ]);

  const onSubmit = async (data: EmployerOnboarding) => {
    if (!user || !profile) {
      Alert.alert('Error', 'No authenticated profile. Please sign in again.');
      return;
    }

    setSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const profileUpdate = buildEmployerProfileUpdate(data, nowIso);
      const { data: updatedProfile, error: profileError } = await (supabase as any)
        .from('profiles')
        .update({
          suburb: profileUpdate.suburb,
          avatar_url: profileUpdate.avatar_url,
          updated_at: nowIso,
        })
        .eq('id', profile.id)
        .select(PROFILE_SELECT)
        .single();

      if (profileError) throw profileError;
      if (!updatedProfile) throw new Error('Profile update returned no row');

      const employerDetailsPayload = {
        profile_id: profile.id,
        ...buildEmployerProfileDetailsUpdate(data, nowIso),
      };
      const { error: employerProfileError } = await (supabase as any)
        .from('employer_profiles')
        .upsert(employerDetailsPayload, { onConflict: 'profile_id' })
        .select('profile_id')
        .single();

      if (employerProfileError) throw employerProfileError;

      applyProfile(updatedProfile);
      await queryClient.invalidateQueries({ queryKey: ['employer-profile', profile.id] });
      posthog.capture('employer_profile_updated', {
        has_avatar: Boolean(data.avatar_url),
        has_about_text: Boolean(data.about_text),
      });
      Alert.alert('Profile updated', 'Your business profile changes have been saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('[employer-edit-profile] Error:', error);
      Alert.alert('Error', getErrorMessage(error, 'Failed to save profile. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const uploadFromUri = useCallback(
    async (uri: string) => {
      if (!user) return;
      setAvatarUploading(true);
      try {
        const uploadedUrl = await uploadAvatarFromUri({
          userId: user.id,
          uri,
          supabaseStorage: (supabase as any).storage.from('avatars'),
          fetchImpl: fetch,
        });
        if (uploadedUrl) {
          form.setValue('avatar_url', uploadedUrl, { shouldValidate: true, shouldDirty: true });
        }
      } catch (error) {
        console.error('[employer-edit-profile] Avatar upload error:', error);
        Alert.alert('Upload failed', getErrorMessage(error, 'Could not upload logo. Please try again.'));
      } finally {
        setAvatarUploading(false);
      }
    },
    [form, user],
  );

  const handleAvatarPick = async () => {
    if (!user) return;

    if (Platform.OS === 'web') {
      webFileInputRef.current?.click();
      return;
    }

    if (!ImagePicker) {
      Alert.alert('Not available', 'Logo upload is not available on this device.');
      return;
    }

    setAvatarUploading(true);
    try {
      const uploadedUrl = await pickAndUploadAvatar({
        userId: user.id,
        imagePicker: ImagePicker as typeof import('expo-image-picker'),
        supabaseStorage: (supabase as any).storage.from('avatars'),
        fetchImpl: fetch,
      });

      if (uploadedUrl) {
        form.setValue('avatar_url', uploadedUrl, { shouldValidate: true, shouldDirty: true });
      }
    } catch (error) {
      console.error('[employer-edit-profile] Avatar upload error:', error);
      Alert.alert('Upload failed', getErrorMessage(error, 'Could not upload logo. Please try again.'));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleWebAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const uri = URL.createObjectURL(file);
    try {
      await uploadFromUri(uri);
    } finally {
      URL.revokeObjectURL(uri);
      event.target.value = '';
    }
  };

  if (!user || !profile) {
    return (
      <AppScreen scroll centered maxWidth="lg">
        <ScreenHeader
          title="Edit Business Profile"
          subtitle="Update your business details"
          onBack={() => router.back()}
        />
        <Text className="text-slate-300 text-base text-center mb-6">
          We couldn't load your authenticated profile. Please sign in again and retry.
        </Text>
        <Button title="Go back" fullWidth onPress={() => router.back()} />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll centered maxWidth="lg">
      <ScreenHeader
        title="Edit Business Profile"
        subtitle="Update your business details"
        onBack={() => router.back()}
      />

      {Platform.OS === 'web' ? (
        <input
          ref={webFileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleWebAvatarChange}
        />
      ) : null}

      <EmployerProfileForm
        form={form}
        avatarUploading={avatarUploading}
        onAvatarPick={handleAvatarPick}
      />

      <Button
        title="Save changes"
        fullWidth
        loading={submitting}
        disabled={submitting || avatarUploading}
        onPress={form.handleSubmit(onSubmit)}
        className="mt-8 mb-12"
      />
    </AppScreen>
  );
}
