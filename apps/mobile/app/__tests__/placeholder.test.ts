import { describe, expect, it } from 'vitest';
import { resolveAuthRedirect } from '../auth-gate';

describe('resolveAuthRedirect', () => {
  it('redirects unauthenticated users to login', () => {
    const nextRoute = resolveAuthRedirect({
      loading: false,
      session: null,
      profile: null,
      segments: ['(candidate)', '(tabs)', 'deck'],
    });

    expect(nextRoute).toBe('/(auth)/login');
  });

  it('keeps unauthenticated users on auth routes', () => {
    const nextRoute = resolveAuthRedirect({
      loading: false,
      session: null,
      profile: null,
      segments: ['(auth)', 'login'],
    });

    expect(nextRoute).toBeNull();
  });

  it('redirects not-onboarded users to role selection', () => {
    const nextRoute = resolveAuthRedirect({
      loading: false,
      session: { user: { id: 'u1' } },
      profile: {
        role: 'candidate',
        onboarding_completed_at: null,
      },
      segments: ['(candidate)', '(tabs)', 'deck'],
    });

    expect(nextRoute).toBe('/(onboarding)/role');
  });

  it('routes onboarded candidates from auth to deck', () => {
    const nextRoute = resolveAuthRedirect({
      loading: false,
      session: { user: { id: 'u1' } },
      profile: {
        role: 'candidate',
        onboarding_completed_at: '2026-01-01T00:00:00.000Z',
      },
      segments: ['(auth)', 'login'],
    });

    expect(nextRoute).toBe('/(candidate)/(tabs)/deck');
  });

  it('routes onboarded employers from onboarding to jobs', () => {
    const nextRoute = resolveAuthRedirect({
      loading: false,
      session: { user: { id: 'u1' } },
      profile: {
        role: 'employer',
        onboarding_completed_at: '2026-01-01T00:00:00.000Z',
      },
      segments: ['(onboarding)', 'role'],
    });

    expect(nextRoute).toBe('/(employer)/(tabs)/jobs');
  });
});