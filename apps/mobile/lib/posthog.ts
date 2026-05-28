/**
 * PostHog client — web-safe version.
 * On native: uses posthog-react-native SDK.
 * On web: uses posthog-js (real analytics).
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const apiKey = Constants.expoConfig?.extra?.posthogKey as string | undefined;
const host = Constants.expoConfig?.extra?.posthogHost as string | undefined;
const isConfigured = Boolean(apiKey) && Boolean(host);

if (!isConfigured && __DEV__) {
  console.warn('[posthog] EXPO_PUBLIC_POSTHOG_KEY / EXPO_PUBLIC_POSTHOG_HOST not set — analytics disabled');
}

// No-op stub for when PostHog is not configured
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
  // Web: use posthog-js for real analytics
  try {
    const PostHogJS = require('posthog-js').default;
    PostHogJS.init(apiKey || 'placeholder', {
      api_host: host,
      loaded: (ph: any) => {
        if (!isConfigured) ph.opt_out_capturing();
      },
      capture_pageview: false, // handled by usePostHog
      capture_pageleave: true,
      autocapture: false, // don't capture clicks/forms by default
      persistence: 'localStorage',
    });
    posthogInstance = {
      capture: (event: string, props?: Record<string, unknown>) => PostHogJS.capture(event, props),
      identify: (id: string, props?: Record<string, unknown>) => PostHogJS.identify(id, props),
      screen: (name: string, props?: Record<string, unknown>) => PostHogJS.capture('$pageview', { $current_url: name, ...props }),
      shutdown: () => PostHogJS.stop(),
      opt_out_capturing: () => PostHogJS.opt_out_capturing(),
      opt_in_capturing: () => PostHogJS.opt_in_capturing(),
      has_opted_out_capturing: () => PostHogJS.has_opted_out_capturing(),
      reloadFeatureFlags: () => PostHogJS.reloadFeatureFlags(),
      isFeatureEnabled: (key: string) => PostHogJS.isFeatureEnabled(key),
      getFeatureFlag: (key: string) => PostHogJS.getFeatureFlag(key),
      on: (event: string, cb: (...args: any[]) => void) => {
        PostHogJS.on(event, cb);
        return () => PostHogJS.off(event, cb);
      },
      debug: () => PostHogJS.debug(true),
      reset: () => PostHogJS.reset(),
      flush: () => PostHogJS.flush(),
      disabled: false,
    };
  } catch {
    posthogInstance = posthogStub;
  }
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
