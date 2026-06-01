/**
 * Sentry error tracking — web-safe version.
 * On native: uses @sentry/react-native.
 * On web: no-op stub (telemtry disabled).
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

let initialized = false;
let sdkReady = false;

// Web stub — Sentry React Native doesn't bundle for web
const sentryStub = {
  init: () => {},
  wrap: <T>(component: T) => component,
  captureException: () => '',
  withScope: (_callback: (scope: { setContext: () => void }) => void) =>
    _callback({ setContext: () => {} }),
} as const;

function isWeb() {
  return Platform.OS === 'web';
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

export function wrapApp(AppComponent: React.ComponentType<unknown>): React.ComponentType<unknown> {
  if (Platform.OS === 'web') return AppComponent;
  try {
    const Sentry = getSentryModule();
    return Sentry.wrap(AppComponent);
  } catch {
    return AppComponent;
  }
}

export function captureException(error: unknown, context?: Record<string, string>): void {
  if (!sdkReady) return;

  if (Platform.OS === 'web') return;

  try {
    const Sentry = getSentryModule();
    if (context) {
      Sentry.withScope((scope) => {
        scope.setContext('context', context as Record<string, unknown>);
        Sentry.captureException(error);
      });
      return;
    }
    Sentry.captureException(error);
  } catch {
    return;
  }
}
