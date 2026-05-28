/**
 * Sentry init stub — env-gated, no PII.
 * Full production wiring deferred post-MVP per U8 plan.
 */
import Constants from 'expo-constants';

let initialized = false;

export function initSentry(): void {
  if (initialized) return;

  const dsn = Constants.expoConfig?.extra?.sentryDsn;
  if (!dsn) {
    return;
  }

  // Stub: wire @sentry/react-native when production DSN is configured.
  console.info('[sentry] DSN configured — SDK integration deferred to post-beta');
  initialized = true;
}

export function captureException(error: unknown, context?: Record<string, string>): void {
  if (!Constants.expoConfig?.extra?.sentryDsn) return;
  console.error('[sentry stub]', error, context);
}
