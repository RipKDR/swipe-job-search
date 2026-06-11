/**
 * SavedJobsEmpty — Empty state for the saved jobs screen.
 *
 * Shows "No saved jobs yet" with helpful message and CTA to browse jobs.
 *
 * @see bookmarks-maya-handoff.md §5
 */

import { View, Text } from '@/components/tw';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/providers/ThemeProvider';

interface SavedJobsEmptyProps {
  onBrowse?: () => void;
}

export function SavedJobsEmpty({ onBrowse }: SavedJobsEmptyProps) {
  const { colors } = useTheme();

  return (
    <View
      className="flex-1 items-center justify-center px-8 py-12"
      style={{ backgroundColor: colors.background }}
    >
      <Text className="text-5xl mb-5">📑</Text>

      <Text
        style={{
          color: colors.text,
          fontSize: 22,
          fontWeight: 'bold',
          textAlign: 'center',
          letterSpacing: -0.5,
        }}
      >
        No saved jobs yet
      </Text>

      <Text
        style={{
          color: colors.muted,
          textAlign: 'center',
          marginTop: 12,
          fontSize: 14,
          lineHeight: 22,
          maxWidth: 280,
        }}
      >
        Jobs you bookmark will appear here. Start browsing to save roles
        you&rsquo;re interested in.
      </Text>

      {onBrowse && (
        <Button
          title="Browse jobs"
          onPress={onBrowse}
          className="mt-8 w-full max-w-xs"
          fullWidth
        />
      )}
    </View>
  );
}
