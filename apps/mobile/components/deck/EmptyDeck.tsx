import React from 'react';
import { Pressable, Text, View } from '@/components/tw';
import { useRouter, type Href } from 'expo-router';
import { usePostHog } from '@/hooks/usePostHog';

interface EmptyDeckProps {
  onRefresh?: () => void;
  /** Current radius filter in km (0 = anywhere). Used to give better guidance. */
  currentRadiusKm?: number;
  /** Whether we have a usable user location for distance filtering. */
  hasLocation?: boolean;
}

export const EmptyDeck = React.memo(function EmptyDeck({
  onRefresh,
  currentRadiusKm = 0,
  hasLocation = false,
}: EmptyDeckProps) {
  const router = useRouter();
  const posthog = usePostHog();
  const isFiltered = currentRadiusKm > 0;

  const title = isFiltered
    ? 'No jobs within your radius'
    : 'No more jobs right now';

  const body = isFiltered
    ? hasLocation
      ? `No casual roles found within ${currentRadiusKm} km of your location. New jobs are posted daily — try expanding the radius or check back soon.`
      : 'No jobs found in the selected radius. Enable location for better results or choose "Anywhere".'
    : 'New casual roles are posted daily in your circle. Check back soon or ask about expanding your area.';

  const trackEmptyDeckAction = (action: string) => {
    posthog.capture('empty_deck_action', {
      action,
      current_radius_km: currentRadiusKm,
      has_location: hasLocation,
    });
  };

  const handleExpandRadius = () => {
    trackEmptyDeckAction('adjust_radius_settings');
    router.push('/(candidate)/(tabs)/settings' as Href);
  };

  const handleBrowseAll = () => {
    trackEmptyDeckAction('browse_all_melbourne');
    if (onRefresh) onRefresh();
  };

  const handleUpdatePrefs = () => {
    trackEmptyDeckAction('update_preferences');
    router.push('/(candidate)/edit-profile' as Href);
  };

  const handleRefresh = () => {
    trackEmptyDeckAction('refresh_now');
    if (onRefresh) onRefresh();
  };

  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <Text className="text-5xl mb-5">📭</Text>
      <Text className="text-white text-2xl font-bold text-center tracking-tight">{title}</Text>
      <Text className="text-slate-400 text-center mt-3 text-base leading-relaxed max-w-sm">
        {body}
      </Text>

      <View className="mt-8 gap-3 w-full max-w-sm">
        {isFiltered && (
          <>
            <Pressable
              onPress={handleBrowseAll}
              className="w-full px-6 py-3 rounded-full border border-indigo-500/60 active:opacity-80"
            >
              <Text className="text-indigo-300 font-semibold text-center">Browse all Melbourne</Text>
            </Pressable>
            <Pressable
              onPress={handleExpandRadius}
              className="w-full px-6 py-3 rounded-full border border-slate-600 active:bg-slate-900/50"
            >
              <Text className="text-slate-300 font-semibold text-center">Adjust radius in Settings</Text>
            </Pressable>
          </>
        )}
        <Pressable
          onPress={handleUpdatePrefs}
          className="w-full px-6 py-3 rounded-full border border-slate-600 active:bg-slate-900/50"
        >
          <Text className="text-slate-300 font-semibold text-center">Update job preferences</Text>
        </Pressable>
        {onRefresh && (
          <Pressable
            onPress={handleRefresh}
            className="w-full mt-4 px-6 py-3 rounded-full bg-slate-800/50 border border-slate-700 active:bg-slate-700"
          >
            <Text className="text-white font-semibold text-center">Refresh now</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
});

export default EmptyDeck;
