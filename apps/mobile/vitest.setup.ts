import { createElement, type ComponentType } from 'react'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Mock react-native — provides React Native APIs for the Node/vitest environment
vi.mock('react-native', () => {
  const View = (props: any) => createElement('div', props)
  const Text = (props: any) => createElement('span', props)
  const Pressable = (props: any) => createElement('button', props)
  const ScrollView = (props: any) => createElement('div', props)
  const TextInput = (props: any) => createElement('input', props)
  const Image = (props: any) => createElement('img', props)
  const TouchableHighlight = (props: any) => createElement('div', props)

  return {
    Platform: { OS: 'web', select: (obj: any) => obj.web || obj.default },
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Alert: { alert: vi.fn() },
    Linking: { openURL: vi.fn(), canOpenURL: vi.fn().mockResolvedValue(true) },
    View, Text, Pressable, ScrollView, TextInput, Image, TouchableHighlight,
    FlatList: (props: any) => createElement('div', props),
    ActivityIndicator: (props: any) => createElement('div', props),
    Switch: (props: any) => createElement('input', { type: 'checkbox', ...props }),
    Animated: { Value: vi.fn(() => ({ setValue: vi.fn() })), timing: vi.fn(() => ({ start: vi.fn() })), View: (props: any) => createElement('div', props) },
    useWindowDimensions: () => ({ width: 375, height: 812, scale: 1, fontScale: 1 }),
    KeyboardAvoidingView: (props: any) => createElement('div', props),
    SafeAreaView: (props: any) => createElement('div', props),
    Modal: (props: any) => createElement('div', props),
    StatusBar: (props: any) => null,
    AppState: { addEventListener: vi.fn(() => ({ remove: vi.fn() })), currentState: 'active' },
    Dimensions: { get: () => ({ width: 375, height: 812 }), addEventListener: vi.fn(), removeEventListener: vi.fn() },
  }
})

// Mock native-only modules
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
    useCssElement: (Component: ComponentType<any>, props: Record<string, unknown>) =>
      React.createElement(Component, props),
    useNativeVariable: () => undefined,
  }
})

vi.mock('@/components/tw', () => require('react-native'))

afterEach(() => {
  cleanup()
})
