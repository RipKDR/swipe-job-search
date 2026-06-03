import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Text } from 'react-native'
import { AuthContext, type AuthContextType } from '@/providers/AuthProvider'
import { useAuth } from '@/hooks/useAuth'

function AuthProbe() {
  const { loading, profile } = useAuth()
  return (
    <Text testID="auth-state">
      {loading ? 'loading' : profile?.role ?? 'anonymous'}
    </Text>
  )
}

const baseAuth: AuthContextType = {
  session: null,
  user: null,
  profile: null,
  loading: false,
  profileLoadFailed: false,
  signOut: async () => {},
  applyProfile: () => {},
  retryProfileFetch: async () => {},
}

describe('useAuth', () => {
  it('reads values from AuthContext provider', () => {
    render(
      <AuthContext.Provider
        value={{
          ...baseAuth,
          profile: {
            id: 'user-1',
            role: 'candidate',
            full_name: 'Ada',
            email: 'ada@example.com',
            phone: null,
            suburb: 'Tullamarine',
            avatar_url: null,
            experience_text: null,
            skills: [],
            availability_text: null,
            work_rights: null,
            onboarding_completed_at: null,
            bulk_swipe_consent: false,
            consent_granted_at: null,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        }}
      >
        <AuthProbe />
      </AuthContext.Provider>
    )

    expect(screen.getByTestId('auth-state').textContent).toBe('candidate')
  })
})
