import { View, Text, TextInput } from '@/components/tw'
import type { TextInputProps } from 'react-native'

const PLACEHOLDER_COLOR = '#64748b'

export interface TextFieldProps extends TextInputProps {
  label?: string
  error?: string
}

const inputBase =
  'bg-slate-900/90 text-white px-4 py-3.5 rounded-xl border border-slate-700/90 text-base';

export function TextField({ label, error, className, multiline, ...props }: TextFieldProps) {
  return (
    <View>
      {label ? (
        <Text className="text-white text-sm font-semibold mb-2">{label}</Text>
      ) : null}
      <TextInput
        className={`${inputBase} ${multiline ? 'min-h-[120px]' : 'min-h-[48px]'} ${className ?? ''}`}
        placeholderTextColor={PLACEHOLDER_COLOR}
        multiline={multiline}
        {...props}
      />
      {error ? <Text className="text-red-400 text-xs mt-2">{error}</Text> : null}
    </View>
  )
}
