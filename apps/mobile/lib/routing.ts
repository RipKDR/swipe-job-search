import Constants from 'expo-constants';
import type { Href } from 'expo-router';

export const ROUTES = {
  root: '/',
  login: '/(auth)/login',
  onboardingRole: '/(onboarding)/role',
  candidateDeck: '/(candidate)/(tabs)/deck',
  employerJobs: '/(employer)/(tabs)/jobs',
} as const;

export function asRoute(path: Href | string): Href {
  return path as Href;
}

export function getAuthRedirectUrl(): string {
  const scheme = Constants.expoConfig?.scheme;
  return scheme ? `${scheme}://auth/callback` : 'hi-hired://auth/callback';
}
