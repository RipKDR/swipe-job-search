/**
 * RadiusFilter — horizontal scrollable chip selector for GPS proximity filtering.
 *
 * Presents preset radius options as pill/chip buttons. Selecting a radius
 * triggers a callback that the parent uses to re-fetch the job deck with
 * the chosen distance filter.
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from '@/components/tw';
import { Platform } from 'react-native';

// ── Constants ──

type RadiusPreset = { value: number; label: string };

const RADIUS_PRESETS: RadiusPreset[] = [
  { value: 0, label: 'Anywhere' },
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
];

// ── Props ──

interface RadiusFilterProps {
  /** Currently selected radius in km (0 = no filter). */
  value: number;
  /** Called when the user selects a new radius. */
  onChange: (radiusKm: number) => void;
  /** True while GPS / location is being resolved. */
  locationLoading?: boolean;
  /** True when location permission was denied. */
  locationDenied?: boolean;
}

// ── Component ──

export function RadiusFilter({
  value,
  onChange,
  locationLoading = false,
  locationDenied = false,
}: RadiusFilterProps) {
  const currentLabel = useMemo(
    () => RADIUS_PRESETS.find((p) => p.value === value)?.label ?? 'Anywhere',
    [value],
  );

  if (locationLoading) {
    return (
      <View className="flex-row items-center gap-2 px-4 sm:px-6 lg:px-8 py-2">
        <View className="h-5 w-16 rounded-full bg-slate-800/70 animate-pulse" />
        <View className="h-5 w-12 rounded-full bg-slate-800/70 animate-pulse" />
        <View className="h-5 w-14 rounded-full bg-slate-800/70 animate-pulse" />
        <Text className="text-slate-500 text-xs ml-2">Loading location…</Text>
      </View>
    );
  }

  if (locationDenied) {
    return (
      <View className="mx-4 sm:mx-6 lg:mx-8 mb-2 px-4 py-2 rounded-xl bg-amber-950/70 border border-amber-800/40">
        <Text className="text-amber-200 text-xs text-center">
          Enable location access in settings to use proximity filtering.
        </Text>
      </View>
    );
  }

  return (
    <View className="pb-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Platform.OS === 'web' ? 24 : 16,
          gap: 8,
        }}
        className="py-1"
      >
        {RADIUS_PRESETS.map((preset) => {
          const active = preset.value === value;
          return (
            <Pressable
              key={preset.value}
              onPress={() => onChange(preset.value)}
              accessibilityLabel={
                preset.value === 0
                  ? 'Show jobs anywhere'
                  : `Show jobs within ${preset.label}`
              }
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`
                px-4 py-2 rounded-full border
                ${active
                  ? 'bg-emerald-600/20 border-emerald-500'
                  : 'bg-slate-800/70 border-slate-700/60 active:bg-slate-700/80'
                }
              `}
            >
              <Text
                className={`
                  text-sm font-medium
                  ${active ? 'text-emerald-300' : 'text-slate-300'}
                `}
              >
                {preset.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Current filter label */}
      {value > 0 && (
        <Text className="text-slate-400 text-xs px-4 sm:px-6 lg:px-8 pt-1">
          Within {currentLabel} of your location
        </Text>
      )}
    </View>
  );
}

export default RadiusFilter;
