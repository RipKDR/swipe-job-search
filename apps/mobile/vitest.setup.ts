import { createElement, type ComponentType } from 'react'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Make fireEvent.press an alias for fireEvent.click (DOM equivalent of RN press)
import { fireEvent } from '@testing-library/react'
;(fireEvent as any).press = fireEvent.click

// --- Shared props normaliser for all RN mocks ---
// Flattens RN-specific props to DOM equivalents so vitest/happy-dom can render them.
const normalizeRNProps = (props: any) => {
  if (!props) return props;
  const {
    testID, accessibilityRole, accessibilityState, placeholderTextColor,
    multiline, numberOfLines, textAlignVertical,
    onSubmitEditing, returnKeyType, onPressIn, onPressOut, keyboardType,
    textBreakStrategy, lineBreakMode, adjustsFontSizeToFit,
    minimumFontScale, allowFontScaling,
    ...rest
  } = props;
  const normalized: any = { ...rest };
  if (testID) normalized['data-testid'] = testID;
  // Flatten RN style arrays (e.g., [{…}, {…}]) for DOM elements
  if (Array.isArray(normalized.style)) {
    normalized.style = Object.assign({}, ...normalized.style);
  }
  // Map RN event handlers to web equivalents
  if (normalized.onPress) {
    normalized.onClick = normalized.onPress;
    delete normalized.onPress;
  }
  if (normalized.onChangeText) {
    const _onChangeText = normalized.onChangeText;
    normalized.onChange = (e: any) => {
      const val = e?.target?.value ?? '';
      _onChangeText(val);
    };
    delete normalized.onChangeText;
  }
  return normalized;
};
const normalizedDiv = (props: any) => createElement('div', normalizeRNProps(props));

// Mock react-native — provides React Native APIs for the Node/vitest environment
vi.mock('react-native', () => {
  const withTestId = (tag: string) => (props: any) =>
    createElement(tag, normalizeRNProps(props));
  const View = withTestId('div');
  const Text = withTestId('span');
  const Pressable = withTestId('button');
  const ScrollView = withTestId('div');
  const TextInput = (props: any) => createElement('input', normalizeRNProps(props));
  const Image = (props: any) => createElement('img', props);
  const TouchableHighlight = withTestId('div');

  return {
    Platform: {
      OS: 'web',
      select: (obj: Record<string, unknown>) => {
        const os = 'web';
        if (Object.prototype.hasOwnProperty.call(obj, os)) return obj[os];
        if (Object.prototype.hasOwnProperty.call(obj, 'native')) return obj.native;
        if (Object.prototype.hasOwnProperty.call(obj, 'default')) return obj.default;
        return undefined;
      },
    },
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Alert: { alert: vi.fn() },
    Linking: { openURL: vi.fn(), canOpenURL: vi.fn().mockResolvedValue(true) },
    View, Text, Pressable, ScrollView, TextInput, Image, TouchableHighlight,
    FlatList: (props: any) => createElement('div', props),
    ActivityIndicator: (props: any) => createElement('div', props),
    Switch: (props: any) => createElement('input', { type: 'checkbox', ...props }),
    Animated: {
      Value: vi.fn(() => ({ setValue: vi.fn() })),
      timing: vi.fn(() => ({ start: vi.fn() })),
      View: normalizedDiv,
    },
    useWindowDimensions: () => ({ width: 375, height: 812, scale: 1, fontScale: 1 }),
    KeyboardAvoidingView: (props: any) => createElement('div', props),
    SafeAreaView: (props: any) => createElement('div', props),
    Modal: (props: any) => createElement('div', props),
    StatusBar: (props: any) => null,
    AppState: { addEventListener: vi.fn(() => ({ remove: vi.fn() })), currentState: 'active' },
    Dimensions: { get: () => ({ width: 375, height: 812 }), addEventListener: vi.fn(), removeEventListener: vi.fn() },
  };
});

// Mock native-only modules
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}))

// Mock expo-haptics at setup level so Vite's runtime require() in lib/swipe.ts
// intercepts through vitest's CJS layering (not through Vite alias). Using vi.fn()
// enables expect(mock).toHaveBeenCalled() assertions in tests.
vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn().mockResolvedValue(undefined),
  selectionAsync: vi.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}))

// Mock expo to prevent Vite 8 type-stripping errors on expo/src/Expo.ts
vi.mock('expo', () => ({}))

// Mock react-native-screens — its TypeScript source in node_modules
// causes SyntaxError: Unexpected token 'typeof' on Node.js v24
vi.mock('react-native-screens', () => ({
  enableScreens: () => {},
  screensEnabled: () => false,
  Screen: ({ children }: any) => null,
  ScreenContainer: ({ children }: any) => null,
  NativeScreen: ({ children }: any) => null,
  ScreenStack: ({ children }: any) => null,
  SearchBar: () => null,
  FullWindowOverlay: ({ children }: any) => children,
  ScreenStackHeaderConfig: () => null,
}))

// Mock react-native-safe-area-context — also commonly loaded by expo-router
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => require('react').createElement('div', null, children),
  SafeAreaView: ({ children }: any) => require('react').createElement('div', null, children),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
  SafeAreaConsumer: ({ children }: any) => children({ top: 0, right: 0, bottom: 0, left: 0 }),
  initialWindowMetrics: null,
}))

// Mock posthog-js to prevent ECONNRESET / network-request errors in test env
vi.mock('posthog-js', () => ({ default: { init: () => {}, capture: () => {} } }))
vi.mock('@posthog/core', () => ({}))

const { posthogHookStub } = vi.hoisted(() => {
  const posthogHookStub = () => ({
    capture: vi.fn(),
    identify: vi.fn(),
    screen: vi.fn(),
    reset: vi.fn(),
    getFeatureFlag: () => undefined,
    isFeatureEnabled: () => false,
    reloadFeatureFlags: () => Promise.resolve(),
  })
  return { posthogHookStub }
})

// posthog-react-native can pull react-native-screens TS (`keyof typeof`) → SyntaxError in Node.
vi.mock('posthog-react-native', () => ({
  usePostHog: posthogHookStub,
  PostHogProvider: ({ children }: { children?: unknown }) => children ?? null,
  default: { capture: vi.fn(), identify: vi.fn() },
}))

vi.mock('@/hooks/usePostHog', () => ({
  usePostHog: posthogHookStub,
}))

vi.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    getCurrentRoute: () => ({ name: 'Test' }),
    isReady: () => true,
  }),
  useNavigationState: () => undefined,
  NavigationContainer: ({ children }: { children?: unknown }) => children ?? null,
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

// Mock react-native-reanimated — its dep react-native-worklets has ESM resolution
// issues in Vite 8 / Node v24. All RN tests that import Reanimated need this.
vi.mock('react-native-reanimated', () => ({
  default: { View: normalizedDiv },
  useSharedValue: (init: any) => ({ value: init }),
  useAnimatedStyle: () => ({}),
  runOnJS: (fn: any) => fn,
  withSpring: (val: any) => val,
  withTiming: (val: any) => val,
  Animated: { View: normalizedDiv },
}))

// Mock react-native-gesture-handler — its internal findNodeHandle fails in vitest
vi.mock('react-native-gesture-handler', () => ({
  Gesture: {
    Pan: () => {
      const handlers: any = {};
      const pan = {
        enabled: (val: boolean) => { handlers.enabled = val; return pan; },
        onUpdate: (fn: any) => { handlers.onUpdate = fn; return pan; },
        onEnd: (fn: any) => { handlers.onEnd = fn; return pan; },
      };
      return pan;
    },
  },
  GestureDetector: ({ children }: any) => normalizedDiv({ children }),
  GestureHandlerRootView: ({ children }: any) => normalizedDiv({ children }),
  Swipeable: ({ children }: any) => children,
  State: {},
  Directions: {},
}))

// Mock @/components/tw — reuse shared normalizeRNProps so RN event handlers work
vi.mock('@/components/tw', () => {
  const { createElement: ce } = require('react');
  const View = (props: any) => ce('div', normalizeRNProps(props));
  const Text = (props: any) => ce('span', normalizeRNProps(props));
  const Pressable = (props: any) => ce('button', normalizeRNProps(props));
  const ScrollView = (props: any) => ce('div', normalizeRNProps(props));
  const TextInput = (props: any) => ce('input', normalizeRNProps(props));
  const Image = (props: any) => ce('img', normalizeRNProps(props));
  const TouchableHighlight = (props: any) => ce('div', normalizeRNProps(props));
  return {
    View, Text, Pressable, ScrollView, TextInput, Image, TouchableHighlight,
    Link: (props: any) => ce('a', normalizeRNProps(props)),
    useCSSVariable: (v: string) => v,
  };
})

// Mock expo-location — native module cannot load in Node/vitest
vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
  getCurrentPositionAsync: vi.fn().mockResolvedValue({
    coords: { latitude: -37.767, longitude: 144.961, accuracy: 100 },
  }),
  Accuracy: { Balanced: 3 },
}))

afterEach(() => {
  cleanup()
})
