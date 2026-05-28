import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Hi-Hired',
  slug: 'hi-hired',
  version: '0.0.1',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  scheme: 'hi-hired',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0f172a'
  },
  assetBundlePatterns: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.webp'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'au.com.hihired.app'
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0f172a'
    },
    package: 'au.com.hihired.app'
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
    output: 'single',
  },
  plugins: [
    'expo-dev-client',
    'expo-router',
    'expo-secure-store',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#6366f1',
        defaultChannel: 'default'
      }
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Hi-Hired to access your photos for profile pictures.'
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    // All secrets live in .env.local (gitignored) — never hardcode in source
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY || '',
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    posthogProjectId: process.env.EXPO_PUBLIC_POSTHOG_PROJECT_ID || '',
    posthogPersonalAccessToken: process.env.EXPO_PUBLIC_POSTHOG_PAT || '',
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
    sentryAuthToken: process.env.EXPO_PUBLIC_SENTRY_AUTH_TOKEN || '',
    sentryOrg: process.env.EXPO_PUBLIC_SENTRY_ORG || 'steps-to-recovery',
    sentryProject: process.env.EXPO_PUBLIC_SENTRY_PROJECT || 'react-native-yx',
    appEnv: process.env.EXPO_PUBLIC_APP_ENV || 'staging',
    eas: {
      projectId: 'e3d8894d-8177-4a4a-9dc5-2824f74a5d27'
    }
  }
});
