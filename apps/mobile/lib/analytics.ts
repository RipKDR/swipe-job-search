/**
 * PostHog analytics wrapper — env-gated, no PII in payloads.
 */
import Constants from 'expo-constants';

type AnalyticsProperties = Record<string, string | number | boolean>;

let initialized = false;

export function initAnalytics(): void {
  if (initialized) return;

  const key = Constants.expoConfig?.extra?.posthogKey;
  if (!key) {
    return;
  }

  // Stub: wire posthog-react-native when key is configured.
  console.info('[analytics] PostHog key configured — SDK integration deferred to post-beta');
  initialized = true;
}

export function trackEvent(event: string, properties?: AnalyticsProperties): void {
  if (!Constants.expoConfig?.extra?.posthogKey) return;

  const safeProps = properties ?? {};
  console.debug('[analytics]', event, safeProps);
}

export function identifyUser(userId: string): void {
  if (!Constants.expoConfig?.extra?.posthogKey) return;
  console.debug('[analytics] identify', userId);
}
