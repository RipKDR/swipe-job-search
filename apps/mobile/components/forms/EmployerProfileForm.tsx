/**
 * Employer profile form component
 * Used in onboarding/employer-profile.tsx
 */

import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { EmployerOnboardingSchema, type EmployerOnboarding } from '@hi-hired/shared'
import { Button } from '../ui/Button'
import { useState } from 'react'

interface EmployerProfileFormProps {
  onSubmit: (data: EmployerOnboarding) => Promise<void>
  initialData?: Partial<EmployerOnboarding>
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

export function EmployerProfileForm({ onSubmit, initialData }: EmployerProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployerOnboarding>({
    resolver: zodResolver(EmployerOnboardingSchema),
    defaultValues: {
      business_name: initialData?.business_name || '',
      suburb: initialData?.suburb || undefined,
      contact_name: initialData?.contact_name || '',
      about_text: initialData?.about_text || '',
    },
  })

  const handleFormSubmit = async (data: EmployerOnboarding) => {
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
        {/* Business Name */}
        <View>
          <Text className="text-white text-sm font-medium mb-2">Business Name *</Text>
          <Controller
            control={control}
            name="business_name"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-800"
                placeholder="Your business name"
                placeholderTextColor="#64748b"
                value={value}
                onChangeText={onChange}
                autoCapitalize="words"
              />
            )}
          />
          {errors.business_name && (
            <Text className="text-red-400 text-xs mt-1">{errors.business_name.message}</Text>
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

        {/* Contact Name */}
        <View>
          <Text className="text-white text-sm font-medium mb-2">Contact Name *</Text>
          <Controller
            control={control}
            name="contact_name"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-800"
                placeholder="Your name"
                placeholderTextColor="#64748b"
                value={value ?? ''}
                onChangeText={onChange}
                autoCapitalize="words"
              />
            )}
          />
          {errors.contact_name && (
            <Text className="text-red-400 text-xs mt-1">{errors.contact_name.message}</Text>
          )}
        </View>

        {/* About (optional) */}
        <View>
          <Text className="text-white text-sm font-medium mb-2">About Business (optional)</Text>
          <Controller
            control={control}
            name="about_text"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-800"
                placeholder="Tell candidates about your business..."
                placeholderTextColor="#64748b"
                value={value ?? ''}
                onChangeText={onChange}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            )}
          />
          {errors.about_text && (
            <Text className="text-red-400 text-xs mt-1">{errors.about_text.message}</Text>
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
