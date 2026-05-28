import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { AuthProvider, type Profile } from '@/providers/AuthProvider'
import { useAuth } from '@/hooks/useAuth'

const mockUser = { id: 'user-1' } as User
const mockSession = { user: mockUser } as Session

const mockProfile = {
  id: 'user-1',
  role: 'candidate' as const,
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
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const completedProfile: Profile = {
  ...mockProfile,
  onboarding_completed_at: '2026-01-02T00:00:00Z',
}

let authChangeHandler: ((event: AuthChangeEvent, session: Session | null) => void) | null = null
let profileFetchResolver: ((value: Profile | null) => void) | null = null
let profileFetchPromise: Promise<Profile | null> | null = null
const fromMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((callback) => {
        authChangeHandler = callback
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: (...args: unknown[]) => fromMock(...args),
  },
}))

function AuthProbe() {
  const { profile, loading } = useAuth()
  return (
    <span data-testid="profile-state">
      {loading ? 'loading' : profile?.onboarding_completed_at ?? 'incomplete'}
    </span>
  )
}

function emitAuth(event: AuthChangeEvent, session: Session | null = mockSession) {
  act(() => {
    authChangeHandler?.(event, session)
  })
}

describe('AuthProvider', () => {
  beforeEach(() => {
    authChangeHandler = null
    profileFetchResolver = null
    profileFetchPromise = new Promise<Profile | null>((resolve) => {
      profileFetchResolver = resolve
    })

    fromMock.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() => profileFetchPromise),
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('skips profile fetch on TOKEN_REFRESHED', async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    )

    emitAuth('SIGNED_IN')
    await waitFor(() => expect(fromMock).toHaveBeenCalledWith('profiles'))

    fromMock.mockClear()
    emitAuth('TOKEN_REFRESHED')

    expect(fromMock).not.toHaveBeenCalled()
  })

  it('fetches profile on SIGNED_IN', async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    )

    emitAuth('SIGNED_IN')
    expect(fromMock).toHaveBeenCalledWith('profiles')

    await act(async () => {
      profileFetchResolver?.(mockProfile)
    })

    await waitFor(() => {
      expect(screen.getByTestId('profile-state').textContent).toBe('incomplete')
    })
  })

  it('does not let stale fetch overwrite applyProfile', async () => {
    function ApplyButton() {
      const { applyProfile } = useAuth()
      return (
        <button type="button" onClick={() => applyProfile(completedProfile)}>
          apply
        </button>
      )
    }

    render(
      <AuthProvider>
        <ApplyButton />
        <AuthProbe />
      </AuthProvider>
    )

    emitAuth('SIGNED_IN')

    await act(async () => {
      screen.getByText('apply').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('profile-state').textContent).toBe('2026-01-02T00:00:00Z')
    })

    await act(async () => {
      profileFetchResolver?.(mockProfile)
    })

    expect(screen.getByTestId('profile-state').textContent).toBe('2026-01-02T00:00:00Z')
  })

  it('marks profile load as failed when fetch returns null', async () => {
    function FailureProbe() {
      const { profileLoadFailed } = useAuth()
      return <span data-testid="load-failed">{profileLoadFailed ? 'failed' : 'ok'}</span>
    }

    render(
      <AuthProvider>
        <FailureProbe />
      </AuthProvider>
    )

    emitAuth('SIGNED_IN')

    await act(async () => {
      profileFetchResolver?.(null)
    })

    await waitFor(() => {
      expect(screen.getByTestId('load-failed').textContent).toBe('failed')
    })
  })
})
