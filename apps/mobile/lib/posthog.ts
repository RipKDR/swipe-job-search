/**
 * PostHog client — web-safe version.
 * On native: uses posthog-react-native SDK.
 * On web: no-op stub (PostHog web SDK can be added later if needed).
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const apiKey = Constants.expoConfig?.extra?.posthogKey as string | undefined;
const host = Constants.expoConfig?.extra?.posthogHost as string | undefined;
const isConfigured = Boolean(apiKey) && Boolean(host);

if (!isConfigured && __DEV__) {
  console.warn('[posthog] EXPO_PUBLIC_POSTHOG_KEY / EXPO_PUBLIC_POSTHOG_HOST not set — analytics disabled');
}

// No-op stub for web (PostHog React Native SDK does not bundle for web)
const noopCapture = () => {};
const noopIdentify = () => {};
const noopScreen = () => {};
const noopShutdown = () => {};

const posthogStub = {
  capture: noopCapture,
  identify: noopIdentify,
  screen: noopScreen,
  shutdown: noopShutdown,
  opt_out_capturing: () => {},
  opt_in_capturing: () => {},
  has_opted_out_capturing: () => false,
  reloadFeatureFlags: () => Promise.resolve(),
  isFeatureEnabled: () => undefined,
  getFeatureFlag: () => undefined,
  on: () => () => {},
  debug: () => {},
  reset: () => {},
  flush: () => Promise.resolve(),
  disabled: true,
};

let posthogInstance: typeof posthogStub;

if (Platform.OS === 'web') {
  // Web: use no-op stub
  posthogInstance = posthogStub;
} else {
  // Native: use posthog-react-native
  try {
    const PostHog = require('posthog-react-native').default;
    posthogInstance = new PostHog(apiKey || 'placeholder', {
      host,
      disabled: !isConfigured,
      captureAppLifecycleEvents: true,
      flushAt: 20,
      flushInterval: 10000,
      maxBatchSize: 100,
      maxQueueSize: 1000,
      preloadFeatureFlags: true,
      sendFeatureFlagEvent: true,
      featureFlagsRequestTimeoutMs: 10000,
      requestTimeout: 10000,
      fetchRetryCount: 3,
      fetchRetryDelay: 3000,
    });
  } catch {
    posthogInstance = posthogStub;
  }
}

export const posthog = posthogInstance;
