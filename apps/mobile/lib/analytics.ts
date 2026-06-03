/**
 * PostHog analytics wrapper — env-gated, no PII in payloads.
 */
import Constants from 'expo-constants';
import { posthog } from './posthog';

type AnalyticsProperties = Record<string, string | number | boolean>;

let initialized = false;

export function initAnalytics(): void {
  if (initialized) return;

  const key = Constants.expoConfig?.extra?.posthogKey;
  if (!key) {
    return;
  }

  initialized = true;
}

function trackEvent(event: string, properties?: AnalyticsProperties): void {
  if (!Constants.expoConfig?.extra?.posthogKey) return;
  posthog.capture(event, properties);
}

function identifyUser(userId: string): void {
  if (!Constants.expoConfig?.extra?.posthogKey) return;
  posthog.identify(userId);
}
