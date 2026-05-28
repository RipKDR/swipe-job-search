import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}))

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'test-anon-key',
      },
      scheme: 'hi-hired',
    },
  },
}))

vi.mock('react-native-url-polyfill/auto', () => ({}))

afterEach(() => {
  cleanup()
})
