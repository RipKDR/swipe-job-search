import { View, Text, Pressable } from '@/components/tw';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { type EmployerOnboarding } from '@hi-hired/shared';
import { FormBlock } from '@/components/onboarding/FormBlock';
import { Image } from '@/components/tw/image';
import { FormField } from './FormField';
import { SuburbPicker } from './SuburbPicker';

interface EmployerProfileFormProps {
  form: UseFormReturn<EmployerOnboarding>;
  onAvatarPick?: () => void;
  avatarUploading?: boolean;
}

export function EmployerProfileForm({
  form,
  onAvatarPick,
  avatarUploading = false,
}: EmployerProfileFormProps) {
  const { control, formState: { errors }, watch } = form;
  const avatarUrl = watch('avatar_url');

  return (
    <View className="gap-7">
      <FormField
        control={control}
        name="business_name"
        label="Business Name *"
        placeholder="Your business name"
        autoCapitalize="words"
      />

      {onAvatarPick ? (
        <FormBlock label="Logo (optional)" hint="A logo helps candidates recognise your business">
          <View className="flex-row items-center gap-4">
            <View className="h-16 w-16 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-900 items-center justify-center">
              {avatarUrl ? (
                <Image source={avatarUrl} className="h-full w-full" contentFit="cover" />
              ) : (
                <Text className="text-slate-500 text-2xl">+</Text>
              )}
            </View>
            <Pressable
              onPress={onAvatarPick}
              disabled={avatarUploading}
              className={`flex-1 px-4 py-3.5 rounded-xl border ${
                avatarUploading
                  ? 'bg-slate-800 border-slate-700 opacity-70'
                  : 'bg-slate-900/90 border-slate-700 active:bg-slate-800'
              }`}
            >
              <Text className="text-white font-medium text-center">
                {avatarUploading
                  ? 'Uploading…'
                  : avatarUrl
                    ? 'Change logo'
                    : 'Upload logo'}
              </Text>
            </Pressable>
          </View>
          {avatarUrl ? (
            <Text className="text-emerald-400/90 text-xs mt-2">Logo ready</Text>
          ) : null}
        </FormBlock>
      ) : null}

      <Controller
        control={control}
        name="suburb"
        render={({ field: { onChange, value } }) => (
          <SuburbPicker value={value} onChange={onChange} error={errors.suburb?.message} />
        )}
      />

      <FormField control={control} name="contact_name" label="Contact Name *" placeholder="Your name" autoCapitalize="words" />

      <FormField
        control={control}
        name="about_text"
        label="About Business (optional)"
        placeholder="Tell candidates about your business…"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
    </View>
  );
}
