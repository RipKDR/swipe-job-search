/**
 * Candidate profile form component
 * Used in onboarding/candidate-profile.tsx
 */

import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { type CandidateOnboarding, BEACHHEAD_SUBURBS, WORK_RIGHTS_LABELS, type WorkRights } from '@hi-hired/shared'
import { Button } from '../ui/Button'
import { useState } from 'react'

interface CandidateProfileFormProps {
  form: UseFormReturn<CandidateOnboarding>
  onAvatarPick?: () => void
  avatarUploading?: boolean
}

const WORK_RIGHTS_OPTIONS: { value: WorkRights; label: string }[] = [
  { value: 'citizen', label: WORK_RIGHTS_LABELS.citizen },
  { value: 'pr', label: WORK_RIGHTS_LABELS.pr },
  { value: 'visa_student_20hr', label: WORK_RIGHTS_LABELS.visa_student_20hr },
  { value: 'visa_working_holiday', label: WORK_RIGHTS_LABELS.visa_working_holiday },
  { value: 'visa_skilled', label: WORK_RIGHTS_LABELS.visa_skilled },
]

export function CandidateProfileForm({
  form,
  onAvatarPick,
  avatarUploading = false,
}: CandidateProfileFormProps) {
  const [skillInput, setSkillInput] = useState('')

  const {
    control,
    formState: { errors },
    watch,
    setValue,
  } = form

  const skills = watch('skills')
  const avatarUrl = watch('avatar_url')

  const addSkill = () => {
    if (skillInput.trim() && skills.length < 5) {
      setValue('skills', [...skills, skillInput.trim()])
      setSkillInput('')
    }
  }

  const removeSkill = (index: number) => {
    setValue(
      'skills',
      skills.filter((_, i) => i !== index)
    )
  }

  return (
    <View className="flex-1">
      <View className="space-y-6">
        {/* Full Name */}
        <View>
          <Text className="text-white text-sm font-medium mb-2">Full Name *</Text>
          <Controller
            control={control}
            name="full_name"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-800"
                placeholder="Your full name"
                placeholderTextColor="#64748b"
                value={value}
                onChangeText={onChange}
                autoCapitalize="words"
              />
            )}
          />
          {errors.full_name && (
            <Text className="text-red-400 text-xs mt-1">{errors.full_name.message}</Text>
          )}
        </View>

        {/* Avatar */}
        <View>
          <Text className="text-white text-sm font-medium mb-2">Avatar (optional)</Text>
          <TouchableOpacity
            onPress={onAvatarPick}
            disabled={!onAvatarPick || avatarUploading}
            className={`px-4 py-3 rounded-lg border ${
              avatarUploading ? 'bg-slate-800 border-slate-700' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <Text className="text-white">
              {avatarUploading ? 'Uploading avatar...' : avatarUrl ? 'Change avatar' : 'Upload avatar'}
            </Text>
          </TouchableOpacity>
          {avatarUrl && (
            <Text className="text-emerald-400 text-xs mt-1">Avatar uploaded and ready</Text>
          )}
        </View>

        {/* Suburb */}
        <View>
          <Text className="text-white text-sm font-medium mb-2">Suburb *</Text>
          <Controller
            control={control}
            name="suburb"
            render={({ field: { onChange, value } }) => (
              <View className="bg-slate-900 rounded-lg border border-slate-800 max-h-40">
                <ScrollView>
                  {BEACHHEAD_SUBURBS.map((suburb) => (
                    <TouchableOpacity
                      key={suburb}
                      onPress={() => onChange(suburb)}
                      className={`px-4 py-3 border-b border-slate-800 ${
                        value === suburb ? 'bg-blue-600/20' : ''
                      }`}
                    >
                      <Text className={value === suburb ? 'text-blue-400' : 'text-white'}>
                        {suburb}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          />
          {errors.suburb && (
            <Text className="text-red-400 text-xs mt-1">{errors.suburb.message}</Text>
          )}
        </View>

        {/* Experience */}
        <View>
          <Text className="text-white text-sm font-medium mb-2">Experience *</Text>
          <Controller
            control={control}
            name="experience_text"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-800"
                placeholder="Tell employers about your work experience..."
                placeholderTextColor="#64748b"
                value={value}
                onChangeText={onChange}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            )}
          />
          {errors.experience_text && (
            <Text className="text-red-400 text-xs mt-1">{errors.experience_text.message}</Text>
          )}
        </View>

        {/* Skills */}
        <View>
          <Text className="text-white text-sm font-medium mb-2">Skills * (max 5)</Text>
          <View className="flex-row mb-2">
            <TextInput
              className="flex-1 bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-800 mr-2"
              placeholder="Add a skill..."
              placeholderTextColor="#64748b"
              value={skillInput}
              onChangeText={setSkillInput}
              onSubmitEditing={addSkill}
            />
            <Button
              title="Add"
              onPress={addSkill}
              disabled={!skillInput.trim() || skills.length >= 5}
            />
          </View>
          <View className="flex-row flex-wrap">
            {skills.map((skill, index) => (
              <View
                key={index}
                className="bg-blue-600 px-3 py-2 rounded-full mr-2 mb-2 flex-row items-center"
              >
                <Text className="text-white text-sm mr-2">{skill}</Text>
                <TouchableOpacity onPress={() => removeSkill(index)}>
                  <Text className="text-white font-bold">×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          {errors.skills && (
            <Text className="text-red-400 text-xs mt-1">{errors.skills.message}</Text>
          )}
        </View>

        {/* Availability */}
        <View>
          <Text className="text-white text-sm font-medium mb-2">Availability *</Text>
          <Controller
            control={control}
            name="availability_text"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-800"
                placeholder="E.g., Weekdays after 5pm, weekends anytime..."
                placeholderTextColor="#64748b"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          {errors.availability_text && (
            <Text className="text-red-400 text-xs mt-1">{errors.availability_text.message}</Text>
          )}
        </View>

        {/* Work Rights */}
        <View>
          <Text className="text-white text-sm font-medium mb-2">Work Rights *</Text>
          <Controller
            control={control}
            name="work_rights"
            render={({ field: { onChange, value } }) => (
              <View>
                {WORK_RIGHTS_OPTIONS.map((right) => (
                  <TouchableOpacity
                    key={right.value}
                    onPress={() => onChange(right.value)}
                    className={`px-4 py-3 mb-2 rounded-lg border ${
                      value === right.value
                        ? 'bg-blue-600/20 border-blue-600'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <Text className={value === right.value ? 'text-blue-400' : 'text-white'}>
                      {right.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
          {errors.work_rights && (
            <Text className="text-red-400 text-xs mt-1">{errors.work_rights.message}</Text>
          )}
        </View>

      </View>
    </View>
  )
}
