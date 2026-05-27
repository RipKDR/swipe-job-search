import { View, Text, TextInput } from 'react-native'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { type EmployerOnboarding } from '@hi-hired/shared'
import { SuburbPicker } from './SuburbPicker'

interface EmployerProfileFormProps {
  form: UseFormReturn<EmployerOnboarding>
}

export function EmployerProfileForm({ form }: EmployerProfileFormProps) {
  const {
    control,
    formState: { errors },
  } = form

  return (
    <View className="flex-1">
      <View className="space-y-6">
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
                value={value}
                onChangeText={onChange}
                autoCapitalize="words"
              />
            )}
          />
          {errors.contact_name && (
            <Text className="text-red-400 text-xs mt-1">{errors.contact_name.message}</Text>
          )}
        </View>

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
      </View>
    </View>
  )
}
