/**
 * SalaryDisplay — Shows the primary pay amount and an optional salary aggregate label.
 *
 * - Primary pay (e.g. "$40–60/hr") in large accent text
 * - Aggregate label (e.g. "Avg $52/hr • Above market") in small subtle text
 */
import React from 'react';
import { View, Text } from '@/components/tw';
import { useTheme } from '@/providers/ThemeProvider';

interface SalaryDisplayProps {
  /** Primary pay display string (e.g. "$40–60/hr") */
  payDisplay: string;
  /** Optional aggregate label from formatSalaryAggregate */
  salaryLabel: string | null;
}

export function SalaryDisplay({ payDisplay, salaryLabel }: SalaryDisplayProps) {
  const { theme } = useTheme();

  return (
    <View className="flex-row items-end justify-between gap-3">
      <Text
        className="text-[34px] font-bold tabular-nums leading-none"
        style={{ color: theme.colors.accentText }}
      >
        {payDisplay}
      </Text>
      {salaryLabel && (
        <Text className="text-[11px] tabular-nums pb-1 text-right" style={{ color: theme.colors.subtle }}>
          {salaryLabel}
        </Text>
      )}
    </View>
  );
}

export default SalaryDisplay;