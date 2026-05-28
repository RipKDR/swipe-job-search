import Constants from 'expo-constants';
import type { Href } from 'expo-router';

export const ROUTES = {
  root: '/',
  login: '/(auth)/login',
  onboardingRole: '/(onboarding)/role',
  candidateDeck: '/(candidate)/(tabs)/deck',
  employerJobs: '/(employer)/(tabs)/jobs',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

export function asRoute(path: string): AppRoute {
  return path as AppRoute;
}

export function routerHref(route: AppRoute): Href {
  return route as Href;
}

export function getRoleHomeRoute(role: 'candidate' | 'employer' | null | undefined): AppRoute {
  if (role === 'candidate') return ROUTES.candidateDeck;
  if (role === 'employer') return ROUTES.employerJobs;
  return ROUTES.onboardingRole;
}

export function getAuthRedirectUrl(): string {
  const scheme = Constants.expoConfig?.scheme;
  return scheme ? `${scheme}://auth/callback` : 'hi-hired://auth/callback';
}
