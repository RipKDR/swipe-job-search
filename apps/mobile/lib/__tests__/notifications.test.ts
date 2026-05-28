import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpsert = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      upsert: mockUpsert,
    })),
  },
}))

const mockGetPermissionsAsync = vi.fn()
const mockRequestPermissionsAsync = vi.fn()
const mockGetExpoPushTokenAsync = vi.fn()
const mockSetNotificationChannelAsync = vi.fn()

vi.mock('expo-notifications', () => ({
  default: {
    getPermissionsAsync: mockGetPermissionsAsync,
    requestPermissionsAsync: mockRequestPermissionsAsync,
    getExpoPushTokenAsync: mockGetExpoPushTokenAsync,
    setNotificationChannelAsync: mockSetNotificationChannelAsync,
    setNotificationHandler: vi.fn(),
    AndroidImportance: { MAX: 5 },
  },
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  getExpoPushTokenAsync: mockGetExpoPushTokenAsync,
  setNotificationChannelAsync: mockSetNotificationChannelAsync,
  setNotificationHandler: vi.fn(),
  AndroidImportance: { MAX: 5 },
}))

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        eas: { projectId: 'test-project-id' },
      },
    },
  },
}))

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  AppState: {
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
    currentState: 'active',
  },
}))

describe('registerDeviceToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpsert.mockResolvedValue({ error: null })
  })

  it('upserts device token with onConflict expo_push_token', async () => {
    const { registerDeviceToken } = await import('../notifications')

    await registerDeviceToken('profile-1', 'ExponentPushToken[abc]', 'ios')

    expect(mockUpsert).toHaveBeenCalledWith(
      {
        profile_id: 'profile-1',
        expo_push_token: 'ExponentPushToken[abc]',
        platform: 'ios',
        last_used_at: expect.any(String),
      },
      { onConflict: 'expo_push_token' }
    )
  })
})

describe('resolveNotificationRoute', () => {
  it('returns chat route for match notifications', async () => {
    const { resolveNotificationRoute } = await import('../notifications')

    expect(resolveNotificationRoute({ type: 'match', match_id: 'm-1' })).toBe('/chat/m-1')
  })

  it('returns chat route for message notifications', async () => {
    const { resolveNotificationRoute } = await import('../notifications')

    expect(resolveNotificationRoute({ type: 'message', match_id: 'm-2' })).toBe('/chat/m-2')
  })

  it('returns null when match_id missing', async () => {
    const { resolveNotificationRoute } = await import('../notifications')

    expect(resolveNotificationRoute({ type: 'message' })).toBeNull()
  })

  it('returns null for unknown notification types', async () => {
    const { resolveNotificationRoute } = await import('../notifications')

    expect(resolveNotificationRoute({ type: 'interest', job_id: 'j-1' })).toBeNull()
  })
})

describe('registerForPushNotificationsAsync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mockGetExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[xyz]' })
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockUpsert.mockResolvedValue({ error: null })
  })

  it('returns null when permission denied', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' })
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied' })

    const { registerForPushNotificationsAsync } = await import('../notifications')
    const token = await registerForPushNotificationsAsync()

    expect(token).toBeNull()
    expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled()
  })

  it('registers token and upserts when permission granted', async () => {
    const { registerForPushNotificationsAsync } = await import('../notifications')
    const token = await registerForPushNotificationsAsync()

    expect(token).toBe('ExponentPushToken[xyz]')
    expect(mockGetExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'test-project-id' })
    expect(mockUpsert).toHaveBeenCalled()
  })
})
