/**
 * PostHog client — web-safe version.
 * On native: uses posthog-react-native SDK.
 * On web: uses posthog-js (real analytics).
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const apiKey =
  (Constants.expoConfig?.extra?.posthogKey as string | undefined) ??
  process.env.EXPO_PUBLIC_POSTHOG_KEY;
const host =
  (Constants.expoConfig?.extra?.posthogHost as string | undefined) ??
  process.env.EXPO_PUBLIC_POSTHOG_HOST;
const isConfigured = Boolean(apiKey) && Boolean(host);

type PostHogProperties = Record<string, unknown>;
type PostHogOnHandler = (...args: unknown[]) => void;
type PostHogOnUnsubscribe = () => void;

type PostHogClient = {
  capture: (event: string, properties?: PostHogProperties) => void | Promise<void>;
  identify: (distinctId: string, properties?: PostHogProperties) => void | Promise<void>;
  screen: (screenName: string, properties?: PostHogProperties) => void | Promise<void>;
  shutdown: () => void | Promise<void>;
  opt_out_capturing: () => void;
  opt_in_capturing: () => void;
  has_opted_out_capturing: () => boolean;
  reloadFeatureFlags: () => Promise<void>;
  isFeatureEnabled: (key: string, options?: PostHogProperties) => boolean | undefined;
  getFeatureFlag: (key: string, options?: PostHogProperties) => unknown;
  on: (event: string, handler?: PostHogOnHandler) => PostHogOnUnsubscribe;
  debug: (enabled?: boolean) => void;
  reset: (resetDeviceId?: boolean) => void | Promise<void>;
  flush: () => Promise<void>;
  disabled: boolean;
};

if (!isConfigured && __DEV__) {
  console.warn('[posthog] EXPO_PUBLIC_POSTHOG_KEY / EXPO_PUBLIC_POSTHOG_HOST not set — analytics disabled');
}

// No-op stub for when PostHog is not configured
const noopCapture: PostHogClient['capture'] = () => { };
const noopIdentify: PostHogClient['identify'] = () => { };
const noopScreen: PostHogClient['screen'] = () => { };
const noopShutdown = () => { };

const posthogStub: PostHogClient = {
  capture: noopCapture,
  identify: noopIdentify,
  screen: noopScreen,
  shutdown: noopShutdown,
  opt_out_capturing: () => { },
  opt_in_capturing: () => { },
  has_opted_out_capturing: () => false,
  reloadFeatureFlags: () => Promise.resolve(),
  isFeatureEnabled: () => undefined,
  getFeatureFlag: () => undefined,
  on: () => () => { },
  debug: () => { },
  reset: () => { },
  flush: () => Promise.resolve(),
  disabled: true,
};

let posthogInstance: PostHogClient;

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
      autocapture: undefined, // don't capture clicks/forms by default
      persistence: 'localStorage',
    });
    // posthog-js doesn't have .screen() — add it as a wrapper
    posthogInstance = PostHogJS;
    (posthogInstance as any).screen = (screenName: string, properties?: PostHogProperties) => {
      PostHogJS.capture('$screenview', { $screen_name: screenName, ...properties });
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
    });
  } catch {
    posthogInstance = posthogStub;
  }
}

export const posthog = posthogInstance;
