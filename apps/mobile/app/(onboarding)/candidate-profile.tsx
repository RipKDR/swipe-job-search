import { Alert, Platform } from "react-native";
import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CandidateOnboardingSchema, type CandidateOnboarding } from "@hi-hired/shared";
import { usePostHog } from "@/hooks/usePostHog";
import { CandidateProfileForm } from "@/components/forms/CandidateProfileForm";
import { Button } from "@/components/ui/Button";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { PROFILE_SELECT } from "@/providers/AuthProvider";
import { buildCandidateProfileUpdate } from "@/lib/onboarding-submit";
import { pickAndUploadAvatar, uploadAvatarFromUri } from "@/lib/avatar-upload";
import { getErrorMessage } from "@/lib/errors";

export default function CandidateProfile() {
  const { user, applyProfile } = useAuth();
  const posthog = usePostHog();
  const [submitting, setSubmitting] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const webFileInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<CandidateOnboarding>({
    resolver: zodResolver(CandidateOnboardingSchema),
    defaultValues: {
      full_name: "",
      experience_text: "",
      skills: [],
      availability_text: "",
    },
  });

  const onSubmit = async (data: CandidateOnboarding) => {
    if (!user) {
      Alert.alert("Error", "No authenticated user");
      return;
    }

    setSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const { data: updatedProfile, error: profileError } = await supabase.from("profiles")
        .update(buildCandidateProfileUpdate(data, nowIso) as Parameters<ReturnType<typeof supabase.from>["update"]>[0])
        .eq("id", user.id)
        .select(`${PROFILE_SELECT},bulk_swipe_consent,consent_granted_at`)
        .single();

      if (profileError) throw profileError;
      if (!updatedProfile) throw new Error("Profile update returned no row");

      posthog.capture("candidate_onboarding_completed", {
        has_avatar: Boolean(data.avatar_url),
        skills_count: data.skills?.length ?? 0,
        work_rights: data.work_rights,
      });
      applyProfile(updatedProfile);
    } catch (error) {
      console.error("[onboarding] Candidate profile error:", error);
      Alert.alert("Error", getErrorMessage(error, "Failed to save profile. Please try again."));
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
          supabaseStorage: supabase.storage.from("avatars"),
          fetchImpl: fetch,
        });
        if (uploadedUrl) {
          form.setValue("avatar_url", uploadedUrl, { shouldValidate: true });
        }
      } catch (error) {
        console.error("[onboarding] Avatar upload error:", error);
        Alert.alert("Upload failed", getErrorMessage(error, "Could not upload photo. Please try again."));
      } finally {
        setAvatarUploading(false);
      }
    },
    [form, user],
  );

  const handleAvatarPick = async () => {
    if (!user) return;

    if (Platform.OS === "web") {
      webFileInputRef.current?.click();
      return;
    }

    let ImagePicker: typeof import("expo-image-picker") | null = null;
    try {
      ImagePicker = await import("expo-image-picker");
    } catch {
      ImagePicker = null;
    }

    if (!ImagePicker) {
      Alert.alert("Not available", "Photo upload is not available on this device.");
      return;
    }

    setAvatarUploading(true);
    try {
      const uploadedUrl = await pickAndUploadAvatar({
        userId: user.id,
        imagePicker: ImagePicker,
        supabaseStorage: supabase.storage.from("avatars"),
        fetchImpl: fetch,
      });

      if (uploadedUrl) {
        form.setValue("avatar_url", uploadedUrl, { shouldValidate: true });
      }
    } catch (error) {
      console.error("[onboarding] Avatar upload error:", error);
      Alert.alert("Upload failed", getErrorMessage(error, "Could not upload photo. Please try again."));
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
      event.target.value = "";
    }
  };

  return (
    <OnboardingShell
      title="Create your profile"
      subtitle="Tell employers about yourself — most people finish in under a minute."
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
      {Platform.OS === "web" ? (
        <input
          ref={webFileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleWebAvatarChange}
        />
      ) : null}
      <CandidateProfileForm
        form={form}
        avatarUploading={avatarUploading}
        onAvatarPick={handleAvatarPick}
      />
    </OnboardingShell>
  );
}
