import { Alert, Platform } from 'react-native';
import { useCallback, useRef, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EmployerOnboardingSchema, type EmployerOnboarding } from '@hi-hired/shared';
import { usePostHog } from '@/hooks/usePostHog';
import { EmployerProfileForm } from '@/components/forms/EmployerProfileForm';
import { Button } from '@/components/ui/Button';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { pickAndUploadAvatar, uploadAvatarFromUri } from '@/lib/avatar-upload';
import { getErrorMessage } from '@/lib/errors';

export default function EmployerProfile() {
  const { user, applyProfile } = useAuth();
  const posthog = usePostHog();
  const [submitting, setSubmitting] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const webFileInputRef = useRef<HTMLInputElement | null>(null);

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
      const { data: updatedProfile, error } = await supabase.rpc('complete_employer_onboarding', {
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
          supabaseStorage: supabase.storage.from('avatars'),
          fetchImpl: fetch,
        });
        if (uploadedUrl) {
          form.setValue('avatar_url', uploadedUrl, { shouldValidate: true });
        }
      } catch (error) {
        console.error('[onboarding] Avatar upload error:', error);
        Alert.alert('Upload failed', getErrorMessage(error, 'Could not upload photo. Please try again.'));
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

    let ImagePicker: typeof import('expo-image-picker') | null = null;
    try {
      ImagePicker = await import('expo-image-picker');
    } catch {
      ImagePicker = null;
    }

    if (!ImagePicker) {
      Alert.alert('Not available', 'Photo upload is not available on this device.');
      return;
    }

    setAvatarUploading(true);
    try {
      const uploadedUrl = await pickAndUploadAvatar({
        userId: user.id,
        imagePicker: ImagePicker,
        supabaseStorage: supabase.storage.from('avatars'),
        fetchImpl: fetch,
      });

      if (uploadedUrl) {
        form.setValue('avatar_url', uploadedUrl, { shouldValidate: true });
      }
    } catch (error) {
      console.error('[onboarding] Avatar upload error:', error);
      Alert.alert('Upload failed', getErrorMessage(error, 'Could not upload photo. Please try again.'));
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
    </OnboardingShell>
  );
}
