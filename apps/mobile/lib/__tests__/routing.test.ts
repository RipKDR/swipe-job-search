import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getRoleHomeRoute, ROUTES, getAuthRedirectUrl } from '../routing'

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      scheme: 'hi-hired',
    },
  },
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
})
