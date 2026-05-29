import { View, Text, Pressable } from '@/components/tw';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { type CandidateOnboarding, WORK_RIGHTS_OPTIONS } from '@hi-hired/shared';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { FormField } from './FormField';
import { SuburbPicker } from './SuburbPicker';
import { FormBlock } from '@/components/onboarding/FormBlock';
import { SelectionTile } from '@/components/onboarding/SelectionTile';
import { Image } from '@/components/tw/image';
import { useState } from 'react';

interface CandidateProfileFormProps {
  form: UseFormReturn<CandidateOnboarding>;
  onAvatarPick?: () => void;
  avatarUploading?: boolean;
}

export function CandidateProfileForm({
  form,
  onAvatarPick,
  avatarUploading = false,
}: CandidateProfileFormProps) {
  const [skillInput, setSkillInput] = useState('');
  const { control, formState: { errors }, watch, setValue } = form;
  const skills = watch('skills');
  const avatarUrl = watch('avatar_url');

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && skills.length < 5) {
      setValue('skills', [...skills, trimmed]);
      setSkillInput('');
    }
  };

  const removeSkill = (index: number) => {
    setValue('skills', skills.filter((_, i) => i !== index));
  };

  return (
    <View className="gap-7">
      <FormField
        control={control}
        name="full_name"
        label="Full Name *"
        placeholder="Your full name"
        autoCapitalize="words"
      />

      <FormBlock label="Photo (optional)" hint="A friendly face helps employers remember you">
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
            disabled={!onAvatarPick || avatarUploading}
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
                  ? 'Change photo'
                  : 'Upload photo'}
            </Text>
          </Pressable>
        </View>
        {avatarUrl ? (
          <Text className="text-emerald-400/90 text-xs mt-2">Photo ready</Text>
        ) : null}
      </FormBlock>

      <Controller
        control={control}
        name="suburb"
        render={({ field: { onChange, value } }) => (
          <SuburbPicker value={value} onChange={onChange} error={errors.suburb?.message} />
        )}
      />

      <FormField
        control={control}
        name="experience_text"
        label="Experience *"
        placeholder="Roles, industries, and what you're great at…"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <FormBlock
        label="Skills *"
        hint="Add up to 5 — tap a chip to remove"
        error={errors.skills?.message}
      >
        <View className="flex-row items-stretch gap-2 mb-3">
          <TextField
            className="flex-1 mb-0"
            placeholder="e.g. barista, forklift, React"
            value={skillInput}
            onChangeText={setSkillInput}
            onSubmitEditing={addSkill}
            returnKeyType="done"
          />
          <Button
            title="Add"
            onPress={addSkill}
            disabled={!skillInput.trim() || skills.length >= 5}
            className="px-5 py-3.5 min-w-[72px]"
          />
        </View>
        {skills.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            {skills.map((skill, index) => (
              <Pressable
                key={`${skill}-${index}`}
                onPress={() => removeSkill(index)}
                accessibilityLabel={`Remove skill ${skill}`}
                className="flex-row items-center bg-indigo-600/90 px-3 py-2 rounded-full border border-indigo-500/50 active:bg-indigo-700"
              >
                <Text className="text-white text-sm font-medium mr-1.5">{skill}</Text>
                <Text className="text-indigo-200 text-sm font-bold">×</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text className="text-slate-500 text-xs">No skills added yet</Text>
        )}
      </FormBlock>

      <FormField
        control={control}
        name="availability_text"
        label="Availability *"
        placeholder="Weekdays after 5pm, weekends anytime…"
      />

      <FormBlock label="Work rights *" hint="Required for Australian employment compliance">
        <Controller
          control={control}
          name="work_rights"
          render={({ field: { onChange, value } }) => (
            <View className="gap-2">
              {WORK_RIGHTS_OPTIONS.map((right) => (
                <SelectionTile
                  key={right.value}
                  title={right.label}
                  selected={value === right.value}
                  onPress={() => onChange(right.value)}
                  compact
                />
              ))}
            </View>
          )}
        />
        {errors.work_rights ? (
          <Text className="text-red-400 text-xs mt-2">{errors.work_rights.message}</Text>
        ) : null}
      </FormBlock>
    </View>
  );
}
