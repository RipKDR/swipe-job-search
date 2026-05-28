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

export type AppRole = 'candidate' | 'employer';

/** Route group that requires a specific role once onboarding is complete. */
export function getRequiredRoleForGroup(group: string | undefined): AppRole | null {
  if (group === '(candidate)') return 'candidate';
  if (group === '(employer)') return 'employer';
  return null;
}

/** True when an onboarded user is in the wrong role's route group. */
export function shouldRedirectForRoleMismatch(
  profileRole: AppRole | null | undefined,
  segmentGroup: string | undefined,
  onboardingComplete: boolean
): boolean {
  if (!onboardingComplete || !profileRole) return false;
  const requiredRole = getRequiredRoleForGroup(segmentGroup);
  if (!requiredRole) return false;
  return profileRole !== requiredRole;
}
