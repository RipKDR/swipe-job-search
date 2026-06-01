/**
 * Web-safe usePostHog hook.
 * posthog-react-native is stubbed on web via metro.config.js.
 */
import { Platform } from 'react-native';
import { usePostHog as useNativePostHog } from 'posthog-react-native';

type PostHogHook = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (distinctId: string, properties?: Record<string, unknown>) => void;
  screen: (screenName: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
  getFeatureFlag: (key: string) => undefined;
  isFeatureEnabled: (key: string) => boolean;
  reloadFeatureFlags: () => Promise<void>;
};

/** No-op hook for web (PostHog provider isn't rendered). */
function usePostHogWeb(): PostHogHook {
  return {
    capture: () => {},
    identify: () => {},
    screen: () => {},
    reset: () => {},
    getFeatureFlag: () => undefined,
    isFeatureEnabled: () => false,
    reloadFeatureFlags: () => Promise.resolve(),
  };
}

/** Native hook via posthog-react-native. */
function usePostHogNative(): PostHogHook {
  return useNativePostHog();
}

export const usePostHog = Platform.OS === 'web' ? usePostHogWeb : usePostHogNative;
