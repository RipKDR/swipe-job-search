/**
 * Button component for Hi-Hired
 */

import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native'
import type { TouchableOpacityProps } from 'react-native'

interface ButtonProps extends TouchableOpacityProps {
  title: string
  variant?: 'primary' | 'secondary' | 'ghost'
  loading?: boolean
  fullWidth?: boolean
}

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  fullWidth = false,
  ...props
}: ButtonProps) {
  const variantStyles = {
    primary: 'bg-blue-600 active:bg-blue-700',
    secondary: 'bg-slate-700 active:bg-slate-800',
    ghost: 'bg-transparent active:bg-slate-800/50',
  }

  const textStyles = {
    primary: 'text-white',
    secondary: 'text-white',
    ghost: 'text-blue-400',
  }

  const isDisabled = disabled || loading

  return (
    <TouchableOpacity
      disabled={isDisabled}
      className={`
        px-6 py-4 rounded-lg flex-row items-center justify-center
        ${variantStyles[variant]}
        ${isDisabled ? 'opacity-50' : ''}
        ${fullWidth ? 'w-full' : ''}
      `}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? '#60a5fa' : '#ffffff'} />
      ) : (
        <Text className={`font-semibold text-base ${textStyles[variant]}`}>{title}</Text>
      )}
    </TouchableOpacity>
  )
}
