/**
 * Web-safe usePostHog hook.
 * On native: re-exports from posthog-react-native.
 * On web: returns a no-op capture stub (PostHog RN SDK doesn't bundle for web).
 */
import { Platform } from 'react-native';
import { posthog } from '@/lib/posthog';

// No-op hook for web
function usePostHogWeb(): { capture: Function; identify: Function; screen: Function; reset: () => void; getFeatureFlag: () => undefined; isFeatureEnabled: () => boolean; reloadFeatureFlags: () => Promise<void> } {
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

// Lazy-loaded native hook
let nativeUsePostHog: typeof usePostHogWeb | null = null;

function usePostHogNative() {
  if (!nativeUsePostHog) {
    try {
      const { usePostHog } = require('posthog-react-native');
      nativeUsePostHog = usePostHog;
    } catch {
      nativeUsePostHog = usePostHogWeb;
    }
  }
  return nativeUsePostHog!();
}

// Export the appropriate hook based on platform
export const usePostHog = Platform.OS === 'web' ? usePostHogWeb : usePostHogNative;
