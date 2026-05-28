import { View, Text, TouchableOpacity } from 'react-native'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { type CandidateOnboarding, WORK_RIGHTS_OPTIONS } from '@hi-hired/shared'
import { Button } from '../ui/Button'
import { TextField } from '../ui/TextField'
import { FormField } from './FormField'
import { SuburbPicker } from './SuburbPicker'
import { useState } from 'react'

interface CandidateProfileFormProps {
  form: UseFormReturn<CandidateOnboarding>
}

export function CandidateProfileForm({ form }: CandidateProfileFormProps) {
  const [skillInput, setSkillInput] = useState('')

  const {
    control,
    formState: { errors },
    watch,
    setValue,
  } = form

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

  return (
    <View className="flex-1">
      <View className="space-y-6">
        <FormField
          control={control}
          name="full_name"
          label="Full Name *"
          placeholder="Your full name"
          autoCapitalize="words"
        />

        <Controller
          control={control}
          name="suburb"
          render={({ field: { onChange, value } }) => (
            <SuburbPicker
              value={value}
              onChange={onChange}
              error={errors.suburb?.message}
            />
          )}
        />

        <FormField
          control={control}
          name="experience_text"
          label="Experience *"
          placeholder="Tell employers about your work experience..."
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <View>
          <Text className="text-white text-sm font-medium mb-2">Skills * (max 5)</Text>
          <View className="flex-row mb-2">
            <TextField
              className="flex-1 mr-2"
              placeholder="Add a skill..."
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
                className="bg-indigo-600 px-3 py-2 rounded-full mr-2 mb-2 flex-row items-center"
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

        <FormField
          control={control}
          name="availability_text"
          label="Availability *"
          placeholder="E.g., Weekdays after 5pm, weekends anytime..."
        />

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
                        ? 'bg-indigo-600/20 border-indigo-600'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <Text className={value === right.value ? 'text-indigo-400' : 'text-white'}>
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
