/**
 * SavedJobCard — Individual saved job card for the saved jobs list.
 *
 * Layout: title, employer name, suburb, pay rate, job type badge, hours text.
 * Swipeable via react-native-gesture-handler Swipeable with red "Remove" action.
 * On remove: shows toast "Removed from saved" with "Undo" button for 4s.
 *
 * @see bookmarks-maya-handoff.md §4.3
 */

import React, { useCallback } from 'react';
import { View, Text, Pressable } from '@/components/tw';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '@/providers/ThemeProvider';
import { JobTypeBadge } from './JobTypeBadge';
import type { SavedJob } from '@/hooks/useSavedJobs';

// ─── Types ────────────────────────────────────────────────────────────────

interface SavedJobCardProps {
  job: SavedJob;
  onPress: (jobId: string) => void;
  onRemove: (jobId: string) => void;
}

// ─── Remove Action Component ──────────────────────────────────────────────

function RemoveAction({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Remove from saved"
      style={{
        backgroundColor: '#dc2626',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        borderRadius: 16,
        marginLeft: -8,
      }}
    >
      <Text className="text-white text-xs font-semibold">Remove</Text>
    </Pressable>
  );
}

// ─── Component ────────────────────────────────────────────────────────────

export function SavedJobCard({ job, onPress, onRemove }: SavedJobCardProps) {
  const { colors } = useTheme();

  const handlePress = useCallback(() => {
    onPress(job.job_id);
  }, [job.job_id, onPress]);

  const handleRemove = useCallback(() => {
    onRemove(job.job_id);
  }, [job.job_id, onRemove]);

  return (
    <Swipeable
      renderRightActions={() => <RemoveAction onPress={handleRemove} />}
      onSwipeableWillOpen={handleRemove}
      overshootRight={false}
    >
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`View ${job.title} at ${job.employer_name ?? 'employer'}`}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
        }}
      >
        <View className="flex-row gap-4">
          {/* Photo placeholder */}
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 12,
              backgroundColor: colors.photoBase,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 24, color: colors.subtle }}>💼</Text>
          </View>

          {/* Text content */}
          <View className="flex-1 gap-1">
            <Text
              className="text-white text-[17px] font-semibold"
              numberOfLines={1}
              style={{ color: colors.text }}
            >
              {job.title}
            </Text>
            {job.employer_name && (
              <Text
                className="text-[13px]"
                numberOfLines={1}
                style={{ color: colors.muted }}
              >
                {job.employer_name}
              </Text>
            )}
            <Text
              className="text-[13px]"
              numberOfLines={1}
              style={{ color: colors.subtle }}
            >
              {job.suburb}
            </Text>
            <View className="flex-row items-center gap-2 mt-1">
              <Text
                className="text-[15px] font-semibold"
                style={{ color: colors.accent }}
              >
                {job.pay_display}
              </Text>
              <JobTypeBadge type={job.job_type} />
            </View>
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
}
