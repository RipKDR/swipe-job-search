/**
 * Candidate profile form component
 * Used in onboarding/candidate-profile.tsx
 */

import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CandidateOnboardingSchema, type CandidateOnboarding } from '@hi-hired/shared'
import { Button } from '../ui/Button'
import { useState } from 'react'

interface CandidateProfileFormProps {
  onSubmit: (data: CandidateOnboarding) => Promise<void>
  initialData?: Partial<CandidateOnboarding>
}

const MELBOURNE_SUBURBS = [
  'Melbourne CBD',
  'Carlton',
  'Fitzroy',
  'Collingwood',
  'Richmond',
  'South Yarra',
  'Prahran',
  'St Kilda',
  'Port Melbourne',
  'Brunswick',
  'Coburg',
  'Preston',
  'Footscray',
  'Yarraville',
  'Hawthorn',
  'Camberwell',
]

const WORK_RIGHTS = [
  { value: 'australian_citizen', label: 'Australian Citizen' },
  { value: 'permanent_resident', label: 'Permanent Resident' },
  { value: 'student_visa', label: 'Student Visa (20h/week limit)' },
  { value: 'working_holiday', label: 'Working Holiday Visa' },
  { value: 'other', label: 'Other' },
]

export function CandidateProfileForm({ onSubmit, initialData }: CandidateProfileFormProps) {
  const [skillInput, setSkillInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CandidateOnboarding>({
    resolver: zodResolver(CandidateOnboardingSchema),
    defaultValues: {
      full_name: initialData?.full_name || '',
      suburb: initialData?.suburb || undefined,
      experience_text: initialData?.experience_text || '',
      skills: initialData?.skills || [],
      availability_text: initialData?.availability_text || '',
      work_rights: initialData?.work_rights || undefined,
    },
  })

  const skills = watch('skills')

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

  const handleFormSubmit = async (data: CandidateOnboarding) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ScrollView className="flex-1 bg-slate-950 px-6">
      <View className="py-8 space-y-6">
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

        {/* Suburb */}
        <View>
          <Text className="text-white text-sm font-medium mb-2">Suburb *</Text>
          <Controller
            control={control}
            name="suburb"
            render={({ field: { onChange, value } }) => (
              <View className="bg-slate-900 rounded-lg border border-slate-800 max-h-40">
                <ScrollView>
                  {MELBOURNE_SUBURBS.map((suburb) => (
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
                {WORK_RIGHTS.map((right) => (
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

        {/* Submit */}
        <Button
          title="Complete Profile"
          onPress={handleSubmit(handleFormSubmit)}
          loading={isSubmitting}
          fullWidth
        />
      </View>
    </ScrollView>
  )
}
