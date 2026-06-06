/**
 * useRadiusPreference — persist and restore the user's preferred job search radius.
 *
 * Stores the radius (km) in AsyncStorage so the proximity filter survives
 * app restarts. Defaults to 0 (anywhere / no filter).
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'preferred_radius_km';
const DEFAULT_RADIUS = 0;

export function useRadiusPreference(): {
  radiusKm: number;
  setRadiusKm: (km: number) => Promise<void>;
  isLoaded: boolean;
} {
  const [radiusKm, setRadiusKmState] = useState(DEFAULT_RADIUS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Restore on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored !== null) {
          setRadiusKmState(Number(stored));
        }
        setIsLoaded(true);
      })
      .catch(() => {
        setIsLoaded(true);
      });
  }, []);

  const setRadiusKm = useCallback(async (km: number) => {
    setRadiusKmState(km);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, String(km));
    } catch {
      // Best-effort — filter still works for this session
    }
  }, []);

  return { radiusKm, setRadiusKm, isLoaded };
}
