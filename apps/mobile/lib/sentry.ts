/**
 * Sentry error tracking — web-safe version.
 * On native: uses @sentry/react-native.
 * On web: no-op stub (@sentry/react can be added later).
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

let initialized = false;
let sdkReady = false;

// Web stub — Sentry React Native doesn't bundle for web
const sentryStub = {
  init: () => {},
  wrap: (component: unknown) => component,
  captureException: () => '',
  withScope: (fn: (scope: unknown) => void) => fn({ setContext: () => {} }),
};

function getSentryModule() {
  if (Platform.OS === 'web') {
    return sentryStub;
  }
  try {
    return require('@sentry/react-native');
  } catch {
    return sentryStub;
  }
}

function getOptionalIntegration(name: string) {
  if (Platform.OS === 'web') return null;
  try {
    const Sentry = require('@sentry/react-native');
    const factory = (Sentry as Record<string, unknown>)[name];
    if (typeof factory !== 'function') return null;
    return (factory as () => unknown)();
  } catch {
    return null;
  }
}

export function initSentry(): void {
  if (initialized) return;

  const dsn = Constants.expoConfig?.extra?.sentryDsn;
  if (!dsn) {
    return;
  }

  const Sentry = getSentryModule();

  const integrations = [
    getOptionalIntegration('mobileReplayIntegration'),
    getOptionalIntegration('feedbackIntegration'),
  ].filter(Boolean);

  Sentry.init({
    dsn,
    sendDefaultPii: true,
    enableLogs: true,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations,
  });

  initialized = true;
  sdkReady = true;
}

export function wrapApp(AppComponent: React.ComponentType): React.ComponentType {
  if (Platform.OS === 'web') return AppComponent;
  try {
    const Sentry = require('@sentry/react-native');
    return Sentry.wrap(AppComponent);
  } catch {
    return AppComponent;
  }
}

export function captureException(error: unknown, context?: Record<string, string>): void {
  if (!sdkReady) return;

  if (Platform.OS === 'web') return;

  try {
    const Sentry = require('@sentry/react-native');
    if (context) {
      Sentry.withScope((scope: { setContext: (key: string, value: unknown) => void }) => {
        scope.setContext('extra', context);
        Sentry.captureException(error);
      });
      return;
    }
    Sentry.captureException(error);
  } catch {
    // Silently fail on web
  }
}
