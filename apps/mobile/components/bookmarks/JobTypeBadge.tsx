/**
 * JobTypeBadge — Small pill/chip showing the job type.
 * Matches the pattern from JobCard.tsx.
 *
 * @see bookmarks-maya-handoff.md §4.4
 */

import { View, Text } from '@/components/tw';
import { useTheme } from '@/providers/ThemeProvider';

interface JobTypeBadgeProps {
  type: string;
}

export function JobTypeBadge({ type }: JobTypeBadgeProps) {
  const { colors } = useTheme();
  const label = type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        backgroundColor: colors.elevated,
      }}
    >
      <Text
        style={{
          color: colors.muted,
          fontSize: 9,
          fontWeight: 'bold',
          letterSpacing: 1,
        }}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}
