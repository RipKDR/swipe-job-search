/**
 * useUserLocation — read the user's GPS location or fall back to
 * suburb-based coordinates from their profile.
 *
 * Priority order:
 *   1. Native GPS via expo-location (with permission request)
 *   2. Suburb centroid lookup from shared constants (fallback)
 *   3. null if neither is available
 */
import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { SUBURB_COORDS } from '@hi-hired/shared';

export interface UserLocation {
  latitude: number;
  longitude: number;
  /** Human-readable source description, e.g. 'GPS' or 'Brunswick' */
  source: 'gps' | 'suburb' | 'none';
}

interface UseUserLocationResult {
  location: UserLocation | null;
  isLoading: boolean;
  error: string | null;
  /** Trigger a fresh location fetch */
  refresh: () => void;
}

/**
 * Attempt to read the user's suburb from the profiles table.
 * Returns the suburb name or null.
 */
async function fetchProfileSuburb(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('suburb')
      .eq('id', user.id)
      .maybeSingle();

    const profile = data as { suburb?: string | null } | null;
    if (error || !profile?.suburb) return null;
    return profile.suburb;
  } catch {
    return null;
  }
}

/**
 * Resolve a suburb name to coordinates from the shared suburb map.
 */
function suburbToCoords(suburb: string): { lat: number; lng: number } | null {
  const coords = SUBURB_COORDS[suburb];
  if (coords) return coords;

  // Fuzzy fallback: case-insensitive lookup
  const entry = Object.entries(SUBURB_COORDS).find(
    ([key]) => key.toLowerCase() === suburb.toLowerCase(),
  );
  return entry ? entry[1] : null;
}

export function useUserLocation(): UseUserLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Increment to trigger a re-fetch
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function resolveLocation() {
      setIsLoading(true);
      setError(null);

      // 1. Try native GPS (only on device, not web)
      if (Platform.OS !== 'web') {
        try {
          const { granted } = await Location.requestForegroundPermissionsAsync();
          if (granted) {
            const pos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            if (!cancelled) {
              setLocation({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                source: 'gps',
              });
              setIsLoading(false);
              return;
            }
          }
        } catch (e: any) {
          console.warn('[useUserLocation] GPS failed:', e?.message);
          // Fall through to suburb fallback
        }
      }

      // 2. Fallback: look up suburb from profile
      try {
        const suburb = await fetchProfileSuburb();
        if (suburb) {
          const coords = suburbToCoords(suburb);
          if (coords && !cancelled) {
            setLocation({
              latitude: coords.lat,
              longitude: coords.lng,
              source: 'suburb',
            });
            setIsLoading(false);
            return;
          }
        }
      } catch (e: any) {
        console.warn('[useUserLocation] suburb fallback failed:', e?.message);
      }

      // 3. No location available
      if (!cancelled) {
        setLocation(null);
        setError('Could not determine your location. Enable GPS or set a suburb in your profile.');
        setIsLoading(false);
      }
    }

    resolveLocation();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return {
    location,
    isLoading,
    error,
    refresh: () => setRefreshKey((k) => k + 1),
  };
}
