import { useState, useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * useReducedMotion
 * Central hook for reduced motion preference (AccessibilityInfo + user setting).
 * Respects system setting and allows user override via settings.
 *
 * Source: https://reactnative.dev/docs/accessibilityinfo#isreducemotionenabled
 * Used by SwipeCard, future animated components for DDA/WCAG compliance.
 */
export function useReducedMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadPreference = async () => {
      try {
        const stored = await AsyncStorage.getItem('settings_reduce_motion');
        if (stored !== null) {
          if (mounted) setReduceMotion(stored === 'true');
          return;
        }
      } catch {
        // ignore storage errors
      }

      // Fall back to system setting (official React Native API)
      const systemReduce = await AccessibilityInfo.isReduceMotionEnabled();
      if (mounted) setReduceMotion(systemReduce);
    };

    loadPreference();
    setIsLoaded(true);

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled: boolean) => {
        if (mounted) setReduceMotion(enabled);
      }
    );

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  const setUserPreference = async (enabled: boolean): Promise<void> => {
    try {
      await AsyncStorage.setItem('settings_reduce_motion', enabled ? 'true' : 'false');
      setReduceMotion(enabled);
    } catch {
      // ignore
    }
  };

  return {
    reduceMotion,
    isLoaded,
    setUserPreference,
  };
}
