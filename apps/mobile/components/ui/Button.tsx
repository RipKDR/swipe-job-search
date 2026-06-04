import { Pressable, Text } from '@/components/tw';
import { ActivityIndicator } from 'react-native';
import type { ComponentProps } from 'react';
import { useTheme } from '@/providers/ThemeProvider';

interface ButtonProps extends Omit<ComponentProps<typeof Pressable>, 'children'> {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'inverse';
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  fullWidth = false,
  className,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();

  const variantStyles: Record<NonNullable<ButtonProps['variant']>, object> = {
    primary: { backgroundColor: colors.accent },
    secondary: { backgroundColor: colors.elevated },
    ghost: { backgroundColor: 'transparent' },
    outline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    inverse: { backgroundColor: colors.text },
  };

  const textStyles: Record<NonNullable<ButtonProps['variant']>, object> = {
    primary: { color: '#ffffff' },
    secondary: { color: colors.text },
    ghost: { color: colors.accentText },
    outline: { color: colors.text },
    inverse: { color: colors.background },
  };

  const spinnerColor = variant === 'inverse' ? colors.background : '#ffffff';
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      style={[
        {
          paddingHorizontal: 24,
          paddingVertical: 16,
          borderRadius: 12,
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          opacity: isDisabled ? 0.5 : 1,
          ...(fullWidth ? { width: '100%' as const } : {}),
        },
        variantStyles[variant],
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <Text style={[{ fontWeight: '600', fontSize: 16, textAlign: 'center' as const }, textStyles[variant]]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
