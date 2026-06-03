import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getRoleHomeRoute, ROUTES, getAuthRedirectUrl, shouldRedirectForRoleMismatch } from '../routing'

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      scheme: 'hi-hired',
    },
  },
}))

// Override Platform to non-web so getAuthRedirectUrl falls through to scheme
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (obj: any) => obj.ios || obj.default },
}))

describe('routing helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps candidate role to deck tab', () => {
    expect(getRoleHomeRoute('candidate')).toBe(ROUTES.candidateDeck)
  })

  it('maps employer role to jobs tab', () => {
    expect(getRoleHomeRoute('employer')).toBe(ROUTES.employerJobs)
  })

  it('falls back to onboarding when role is missing', () => {
    expect(getRoleHomeRoute(null)).toBe(ROUTES.onboardingRole)
    expect(getRoleHomeRoute(undefined)).toBe(ROUTES.onboardingRole)
  })

  it('builds OAuth redirect URL from expo scheme', () => {
    expect(getAuthRedirectUrl()).toBe('hi-hired://auth/callback')
  })

  it('detects role mismatch for wrong route group', () => {
    expect(shouldRedirectForRoleMismatch('candidate', '(employer)', true)).toBe(true)
    expect(shouldRedirectForRoleMismatch('employer', '(candidate)', true)).toBe(true)
    expect(shouldRedirectForRoleMismatch('candidate', '(candidate)', true)).toBe(false)
    expect(shouldRedirectForRoleMismatch('employer', '(onboarding)', true)).toBe(false)
    expect(shouldRedirectForRoleMismatch('candidate', '(employer)', false)).toBe(false)
  })
})

describe('getAuthRedirectUrl web origin override', () => {
  it('uses EXPO_PUBLIC_AUTH_REDIRECT_ORIGIN when configured', async () => {
    vi.stubEnv('EXPO_PUBLIC_AUTH_REDIRECT_ORIGIN', 'http://localhost:8081')
    vi.resetModules()
    const { getAuthRedirectUrl: getUrl } = await import('../routing')
    expect(getUrl()).toBe('http://localhost:8081/callback')
    vi.unstubAllEnvs()
  })
})
