import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';

let initialized = false;
let sdkReady = false;

function getOptionalIntegration(name: 'mobileReplayIntegration' | 'feedbackIntegration') {
  const factory = (Sentry as Record<string, unknown>)[name];
  if (typeof factory !== 'function') {
    return null;
  }

  try {
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
    integrations: integrations as NonNullable<Parameters<typeof Sentry.init>[0]>['integrations'],
  });

  initialized = true;
  sdkReady = true;
}

export function captureException(error: unknown, context?: Record<string, string>): void {
  if (!sdkReady) return;

  if (context) {
    Sentry.withScope((scope) => {
      scope.setContext('extra', context);
      Sentry.captureException(error);
    });
    return;
  }

  Sentry.captureException(error);
}
