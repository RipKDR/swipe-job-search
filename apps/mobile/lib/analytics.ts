/**
 * PostHog analytics wrapper — env-gated, no PII in payloads.
 */
import Constants from 'expo-constants';

let initialized = false;

export function initAnalytics(): void {
  if (initialized) return;

  const key = Constants.expoConfig?.extra?.posthogKey;
  if (!key) {
    return;
  }

  initialized = true;
}
