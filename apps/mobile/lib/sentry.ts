/**
 * Sentry error tracking — web-safe version.
 * On native: uses @sentry/react-native (stubbed on web via metro.config.js).
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

let initialized = false;
let sdkReady = false;

/**
 * Web-safe init — no-op when Sentry DSN is unset or on web.
 */
export function initSentry(): void {
  if (initialized || Platform.OS === 'web') return;

  const dsn =
    process.env.EXPO_PUBLIC_SENTRY_DSN ?? Constants.expoConfig?.extra?.sentryDsn;
  if (!dsn) return;

  try {
    // Native-only SDK: guard is Platform.OS !== 'web' above; require() is
    // synchronous and intentional — dynamic import() is async and incompatible
    // with this synchronous init pattern.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/react-native');
    const integrations = ['mobileReplayIntegration', 'feedbackIntegration']
      .map((name: string) => {
        const factory = Sentry[name];
        return typeof factory === 'function' ? factory() : null;
      })
      .filter(Boolean);

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
  } catch {
    // Sentry module not available
  }
}

/**
 * Wrap the root app component with Sentry. No-op on web or when Sentry isn't loaded.
 */
export function wrapApp(AppComponent: React.ComponentType<unknown>): React.ComponentType<unknown> {
  if (Platform.OS === 'web') return AppComponent;
  try {
    // Native-only SDK: guard is Platform.OS !== 'web' above; require() is
    // synchronous and intentional — dynamic import() is async and incompatible
    // with this synchronous wrap pattern.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/react-native');
    return Sentry.wrap(AppComponent);
  } catch {
    return AppComponent;
  }
}

/**
 * Capture an exception with optional context. No-op when Sentry isn't initialized.
 */
export function captureException(error: unknown, context?: Record<string, string>): void {
  if (!sdkReady || Platform.OS === 'web') return;

  try {
    // Native-only SDK: guard is sdkReady && Platform.OS !== 'web' above; require() is
    // synchronous and intentional — dynamic import() is async and incompatible
    // with this synchronous capture pattern.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/react-native');
    if (context) {
      Sentry.withScope((scope: { setContext: (k: string, v: unknown) => void }) => {
        scope.setContext('context', context);
        Sentry.captureException(error);
      });
      return;
    }
    Sentry.captureException(error);
  } catch {
    // ignore
  }
}
