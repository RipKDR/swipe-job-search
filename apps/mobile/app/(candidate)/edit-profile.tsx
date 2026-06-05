import { Alert, Platform } from "react-native";
import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CandidateOnboardingSchema, type CandidateOnboarding } from "@hi-hired/shared";
import { useRouter } from "expo-router";
import { usePostHog } from "@/hooks/usePostHog";
import { CandidateProfileForm } from "@/components/forms/CandidateProfileForm";
import { Button } from "@/components/ui/Button";
import { AppScreen } from "@/components/ui/AppScreen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { PROFILE_SELECT } from "@/providers/AuthProvider";
import { buildCandidateProfileUpdate } from "@/lib/onboarding-submit";
import { pickAndUploadAvatar, uploadAvatarFromUri } from "@/lib/avatar-upload";
import { getErrorMessage } from "@/lib/errors";

let ImagePicker: typeof import("expo-image-picker") | null = null;
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ImagePicker = require("expo-image-picker");
  } catch {
    ImagePicker = null;
  }
}

export default function EditProfileScreen() {
  const { user, profile, applyProfile } = useAuth();
  const router = useRouter();
  const posthog = usePostHog();
  const [submitting, setSubmitting] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const webFileInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<CandidateOnboarding>({
    resolver: zodResolver(CandidateOnboardingSchema),
    defaultValues: {
      full_name: profile?.full_name ?? "",
      suburb: (profile?.suburb as CandidateOnboarding["suburb"]) ?? undefined,
      experience_text: profile?.experience_text ?? "",
      skills: profile?.skills ?? [],
      availability_text: profile?.availability_text ?? "",
      work_rights: (profile?.work_rights as CandidateOnboarding["work_rights"]) ?? undefined,
      avatar_url: profile?.avatar_url ?? null,
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
        .update(buildCandidateProfileUpdate(data, nowIso))
        .eq("id", user.id)
        .select(PROFILE_SELECT)
        .single();

      if (profileError) throw profileError;
      if (!updatedProfile) throw new Error("Profile update returned no row");

      posthog.capture("candidate_profile_updated", {
        has_avatar: Boolean(data.avatar_url),
        skills_count: data.skills?.length ?? 0,
        work_rights: data.work_rights,
      });
      applyProfile(updatedProfile);
      Alert.alert("Profile updated", "Your changes have been saved.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("[edit-profile] Error:", error);
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
        console.error("[edit-profile] Avatar upload error:", error);
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

    if (!ImagePicker) {
      Alert.alert("Not available", "Photo upload is not available on this device.");
      return;
    }

    setAvatarUploading(true);
    try {
      const uploadedUrl = await pickAndUploadAvatar({
        userId: user.id,
        imagePicker: ImagePicker as typeof import("expo-image-picker"),
        supabaseStorage: supabase.storage.from("avatars"),
        fetchImpl: fetch,
      });

      if (uploadedUrl) {
        form.setValue("avatar_url", uploadedUrl, { shouldValidate: true });
      }
    } catch (error) {
      console.error("[edit-profile] Avatar upload error:", error);
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
    <AppScreen scroll centered maxWidth="lg">
      <ScreenHeader
        title="Edit Profile"
        subtitle="Update your details"
        onBack={() => router.back()}
      />

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

      <Button
        title="Save changes"
        fullWidth
        loading={submitting}
        disabled={submitting}
        onPress={form.handleSubmit(onSubmit)}
        className="mt-8 mb-12"
      />
    </AppScreen>
  );
}
