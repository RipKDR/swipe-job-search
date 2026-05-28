import { View, Text, TextInput, type TextInputProps } from 'react-native'

const PLACEHOLDER_COLOR = '#64748b'

export interface TextFieldProps extends TextInputProps {
  label?: string
  error?: string
}

export function TextField({ label, error, className, ...props }: TextFieldProps) {
  return (
    <View>
      {label ? (
        <Text className="text-white text-sm font-medium mb-2">{label}</Text>
      ) : null}
      <TextInput
        className={`bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-800 ${className ?? ''}`}
        placeholderTextColor={PLACEHOLDER_COLOR}
        {...props}
      />
      {error ? <Text className="text-red-400 text-xs mt-1">{error}</Text> : null}
    </View>
  )
}
