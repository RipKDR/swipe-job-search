import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { Href } from 'expo-router';

export const ROUTES = {
  root: '/',
  login: '/(auth)/login',
  onboardingRole: '/(onboarding)/role',
  candidateDeck: '/(candidate)/(tabs)/deck',
  employerJobs: '/(employer)/(tabs)/jobs',
  providerCompliance: '/(provider)/compliance',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

export function getRoleHomeRoute(role: 'candidate' | 'employer' | 'provider' | null | undefined): AppRoute {
  if (role === 'candidate') return ROUTES.candidateDeck;
  if (role === 'employer') return ROUTES.employerJobs;
  if (role === 'provider') return ROUTES.providerCompliance;
  return ROUTES.onboardingRole;
}

/**
 * OAuth / magic-link callback URL sent to Supabase as redirect_to / emailRedirectTo.
 * Must match an entry in Dashboard → Authentication → URL Configuration → Redirect URLs.
 *
 * Prefer EXPO_PUBLIC_AUTH_REDIRECT_ORIGIN when set (stable across localhost vs 127.0.0.1).
 * Otherwise use the live browser origin on web, or the native deep link scheme.
 */
export function getAuthRedirectUrl(): string {
  const envOrigin =
    Constants.expoConfig?.extra?.authRedirectOrigin?.trim() ||
    process.env.EXPO_PUBLIC_AUTH_REDIRECT_ORIGIN?.trim();

  if (Platform.OS === 'web') {
    const origin =
      envOrigin ||
      (typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : undefined);
    if (origin) {
      return `${origin.replace(/\/$/, '')}/callback`;
    }
  }

  if (envOrigin) {
    return `${envOrigin.replace(/\/$/, '')}/callback`;
  }

  const scheme = Constants.expoConfig?.scheme;
  return scheme ? `${scheme}://auth/callback` : 'hi-hired://auth/callback';
}

type AppRole = 'candidate' | 'employer' | 'provider';

/** Route group that requires a specific role once onboarding is complete. */
export function getRequiredRoleForGroup(group: string | undefined): AppRole | null {
  if (group === '(candidate)') return 'candidate';
  if (group === '(employer)') return 'employer';
  if (group === '(provider)') return 'provider';
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

/** Feature deep links per streak/matches handoffs (hi-hired:// scheme). */
export const FEATURE_DEEP_LINKS = {
  deck: 'hi-hired://deck',
  matches: 'hi-hired://matches',
  chat: (matchId: string) => `hi-hired://chat/${matchId}`,
  saved: 'hi-hired://saved',
} as const;

export type FeatureDeepLink = typeof FEATURE_DEEP_LINKS[keyof typeof FEATURE_DEEP_LINKS] | ReturnType<typeof FEATURE_DEEP_LINKS.chat>;

/**
 * Parse a deep link URL into a router Href or null.
 * Supports auth callbacks + feature links from streak at-risk / match notifs.
 * Source: existing getAuthRedirectUrl + Expo Router patterns in auth flows.
 */
export function parseDeepLink(url: string | null): Href | null {
  if (!url) return null;
  if (url.includes('auth/callback') || url.startsWith('hi-hired://auth/callback')) {
    return '/(auth)/callback' as Href;
  }
  if (url === FEATURE_DEEP_LINKS.deck || url.endsWith('/deck')) {
    return ROUTES.candidateDeck as Href;
  }
  if (url === FEATURE_DEEP_LINKS.matches || url.endsWith('/matches')) {
    return '/(candidate)/(tabs)/matches' as Href;
  }
  if (url === FEATURE_DEEP_LINKS.saved || url.endsWith('/saved')) {
    return '/(candidate)/(tabs)/saved' as Href;
  }
  const chatMatch = url.match(/hi-hired:\/\/chat\/([0-9a-f-]+)/i);
  if (chatMatch) {
    return `/chat/${chatMatch[1]}` as Href;
  }
  return null;
}
