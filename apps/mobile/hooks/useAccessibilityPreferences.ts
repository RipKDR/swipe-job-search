import { useState, useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * useAccessibilityPreferences
 * Central hook for all accessibility preferences:
 * - Reduced motion (system + user)
 * - High contrast / increased contrast (system + user)
 * - Dynamic Type / font scale (system)
 *
 * Respects system settings and allows user override via settings.
 * Used by SwipeCard, JobCard, and future components for DDA/WCAG compliance.
 *
 * Source: React Native AccessibilityInfo (https://reactnative.dev/docs/accessibilityinfo)
 * WCAG 2.2 AA: 1.4.3 Contrast, 1.4.4 Resize Text, 2.3.3 Animation from Interactions
 */
export function useAccessibilityPreferences() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadPreferences = async () => {
      try {
        const [storedMotion, storedContrast] = await Promise.all([
          AsyncStorage.getItem('settings_reduce_motion'),
          AsyncStorage.getItem('settings_high_contrast'),
        ]);

        if (storedMotion !== null) {
          if (mounted) setReduceMotion(storedMotion === 'true');
        } else {
          const systemReduce = await AccessibilityInfo.isReduceMotionEnabled();
          if (mounted) setReduceMotion(systemReduce);
        }

        if (storedContrast !== null) {
          if (mounted) setHighContrast(storedContrast === 'true');
        } else {
          const systemContrast = await AccessibilityInfo.isHighContrastEnabled?.();
          if (mounted && systemContrast !== undefined) setHighContrast(systemContrast);
        }
      } catch {
        // Fall back to system settings
        const [sysReduce, sysContrast] = await Promise.all([
          AccessibilityInfo.isReduceMotionEnabled(),
          AccessibilityInfo.isHighContrastEnabled?.() ?? false,
        ]);
        if (mounted) {
          setReduceMotion(sysReduce);
          setHighContrast(sysContrast);
        }
      }
    };

    loadPreferences();
    setIsLoaded(true);

    const motionSub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled: boolean) => {
      if (mounted) setReduceMotion(enabled);
    });

    const contrastSub = AccessibilityInfo.addEventListener?.('highContrastChanged', (enabled: boolean) => {
      if (mounted) setHighContrast(enabled);
    });

    // Font scale from useWindowDimensions (web-compatible)
    const dimensionsSub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', () => {
      // Re-check font scale on any accessibility change (approximation)
      // For precise font scale, use useWindowDimensions in components
    });

    return () => {
      mounted = false;
      motionSub?.remove();
      contrastSub?.remove();
    };
  }, []);

  // Update font scale from system (best effort)
  useEffect(() => {
    const updateFontScale = async () => {
      try {
        const { Dimensions } = require('react-native');
        const { fontScale } = Dimensions.get('window');
        setFontScale(fontScale);
      } catch {
        // ignore
      }
    };
    updateFontScale();
    const interval = setInterval(updateFontScale, 30000); // Check periodically
    return () => clearInterval(interval);
  }, []);

  const setReduceMotionPreference = async (enabled: boolean): Promise<void> => {
    try {
      await AsyncStorage.setItem('settings_reduce_motion', enabled ? 'true' : 'false');
      setReduceMotion(enabled);
    } catch {
      // ignore
    }
  };

  const setHighContrastPreference = async (enabled: boolean): Promise<void> => {
    try {
      await AsyncStorage.setItem('settings_high_contrast', enabled ? 'true' : 'false');
      setHighContrast(enabled);
    } catch {
      // ignore
    }
  };

  return {
    reduceMotion,
    highContrast,
    fontScale,
    isLoaded,
    setReduceMotionPreference,
    setHighContrastPreference,
  };
}

// Back-compat export for existing useReducedMotion usage
export function useReducedMotion() {
  const { reduceMotion, isLoaded, setReduceMotionPreference } = useAccessibilityPreferences();
  return { reduceMotion, isLoaded, setUserPreference: setReduceMotionPreference };
}
