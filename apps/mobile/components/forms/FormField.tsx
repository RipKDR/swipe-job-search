import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { TextField, type TextFieldProps } from '../ui/TextField'

type FormFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label: string
} & Omit<TextFieldProps, 'label' | 'error' | 'value' | 'onChangeText' | 'onChange' | 'onBlur'>

export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  ...inputProps
}: FormFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <TextField
          label={label}
          value={value ?? ''}
          onChangeText={onChange}
          onBlur={onBlur}
          error={error?.message}
          {...inputProps}
        />
      )}
    />
  )
}
