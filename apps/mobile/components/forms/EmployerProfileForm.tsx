import { View } from '@/components/tw';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { type EmployerOnboarding } from '@hi-hired/shared';
import { FormField } from './FormField';
import { SuburbPicker } from './SuburbPicker';

interface EmployerProfileFormProps {
  form: UseFormReturn<EmployerOnboarding>;
}

export function EmployerProfileForm({ form }: EmployerProfileFormProps) {
  const { control, formState: { errors } } = form;

  return (
    <View className="gap-7">
      <FormField control={control} name="business_name" label="Business Name *" placeholder="Your business name" autoCapitalize="words" />

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
