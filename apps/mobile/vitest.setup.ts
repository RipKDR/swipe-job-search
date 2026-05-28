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

vi.mock('react-native-css', () => {
  const React = require('react')
  return {
    useCssElement: (Component: React.ComponentType<any>, props: Record<string, unknown>) =>
      React.createElement(Component, props),
    useNativeVariable: () => undefined,
  }
})

vi.mock('@/components/tw', () => require('react-native'))

afterEach(() => {
  cleanup()
})
