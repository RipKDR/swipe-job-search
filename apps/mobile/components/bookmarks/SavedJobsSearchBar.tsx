/**
 * SavedJobsSearchBar — Search input + filter chips for saved jobs.
 *
 * TextInput with search icon and clear button.
 * Filter chips: All, Casual, Part-time, Permanent — client-side filtering.
 *
 * @see bookmarks-maya-handoff.md §4.8
 */

import React from 'react';
import { View, Text, TextInput, Pressable } from '@/components/tw';
import { ScrollView } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

// ─── Types ────────────────────────────────────────────────────────────────

export type FilterKey = 'all' | 'casual' | 'part_time' | 'permanent';

export const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'casual', label: 'Casual' },
  { key: 'part_time', label: 'Part-time' },
  { key: 'permanent', label: 'Permanent' },
];

interface SavedJobsSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: FilterKey;
  onFilterChange: (filter: FilterKey) => void;
}

// ─── Filter Chip ──────────────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Filter by ${label}`}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: active ? colors.accent : colors.surface,
        borderWidth: active ? 0 : 1,
        borderColor: colors.border,
        marginRight: 6,
      }}
    >
      <Text
        style={{
          color: active ? '#ffffff' : colors.muted,
          fontSize: 13,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Component ────────────────────────────────────────────────────────────

export function SavedJobsSearchBar({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
}: SavedJobsSearchBarProps) {
  const { colors } = useTheme();

  return (
    <View className="gap-3">
      {/* Search input */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.elevated,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text className="mr-2" style={{ color: colors.subtle, fontSize: 16 }}>
          🔍
        </Text>
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search saved jobs..."
          placeholderTextColor={colors.subtle}
          accessibilityLabel="Search saved jobs by title, employer, or location"
          style={{
            flex: 1,
            color: colors.text,
            fontSize: 15,
            padding: 0,
          }}
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={() => onSearchChange('')}
            className="ml-2 p-2"
            accessibilityLabel="Clear search"
          >
            <Text className="text-base" style={{ color: colors.subtle }}>
              ✕
            </Text>
          </Pressable>
        )}
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel="Job type filters"
      >
        <View className="flex-row">
          {FILTER_OPTIONS.map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              active={activeFilter === f.key}
              onPress={() => onFilterChange(f.key)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
