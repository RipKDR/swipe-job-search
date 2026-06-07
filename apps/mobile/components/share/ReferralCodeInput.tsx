/**
 * ReferralCodeInput — Collapsible referral code input for onboarding.
 *
 * Optional field shown during signup/onboarding.
 * Toggle visibility with "Have an invite code?" link.
 * Validates: 6-12 alphanumeric characters.
 *
 * @see share-jordan-handoff.md §3.14
 */

import React, { useState, useCallback } from 'react';
import { Pressable, Text, View, TextInput } from '@/components/tw';
import { useTheme } from '@/providers/ThemeProvider';
import { supabase } from '@/lib/supabase';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

// ─── Types ───────────────────────────────────────────────

export interface ReferralCodeInputProps {
  /** Current referral code value from parent form */
  value?: string;
  /** Callback when the code changes */
  onChangeText?: (text: string) => void;
  /** Whether to show the field expanded by default */
  initiallyExpanded?: boolean;
}

// ─── Component ───────────────────────────────────────────

export function ReferralCodeInput({
  value = '',
  onChangeText,
  initiallyExpanded = false,
}: ReferralCodeInputProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setExpanded((prev) => !prev);
    setValidationError(null);
  }, []);

  const handleChangeText = useCallback(
    (text: string) => {
      // Auto-uppercase letters for consistency
      const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
      setValidationError(null);
      onChangeText?.(cleaned);
    },
    [onChangeText],
  );

  // Validate the code format (6-12 alphanumeric)
  const isValidFormat = (code: string): boolean => {
    return /^[A-Z0-9]{6,12}$/.test(code);
  };

  return (
    <View className="mt-4">
      <Pressable
        onPress={handleToggle}
        className="flex-row items-center gap-2 active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel={
          expanded ? 'Hide invite code field' : 'Have an invite code?'
        }
      >
        <Text className="text-sm" style={{ color: colors.accent }}>
          {expanded ? '▼' : '▶'}
        </Text>
        <Text className="text-sm" style={{ color: colors.accent }}>
          {expanded
            ? 'Hide invite code'
            : 'Have an invite code?'}
        </Text>
      </Pressable>

      {expanded && (
        <View className="mt-2">
          <View
            className="rounded-xl border px-4 py-3"
            style={{
              backgroundColor: colors.surface,
              borderColor: validationError ? '#ef4444' : colors.border,
            }}
          >
            <TextInput
              placeholder="e.g. HIRED-A1B2C3D4"
              placeholderTextColor={colors.muted}
              value={value}
              onChangeText={handleChangeText}
              autoCapitalize="characters"
              maxLength={13}
              className="text-base"
              style={{ color: colors.text }}
              accessibilityLabel="Referral code"
            />
          </View>
          {validationError && (
            <Text className="text-red-400 text-xs mt-1">
              {validationError}
            </Text>
          )}
          <Text className="text-xs mt-1" style={{ color: colors.muted }}>
            Enter the code your friend shared with you.
          </Text>
        </View>
      )}
    </View>
  );
}

export default ReferralCodeInput;
