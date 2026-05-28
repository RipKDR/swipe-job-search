import { ConfigContext } from 'expo/config';
import type { ExpoConfig } from '@expo/config-types';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Hi-Hired',
  slug: 'hi-hired',
  version: '0.0.1',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  scheme: 'hi-hired',
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
      'expo-splash-screen',
      {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#0f172a'
      }
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#6366f1',
        defaultChannelName: 'default'
      }
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Hi-Hired to access your photos for profile pictures.',
      }
    ]
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // All secrets live in .env.local (gitignored) — never hardcode in source
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    posthogProjectId: process.env.EXPO_PUBLIC_POSTHOG_PROJECT_ID ?? '',
    posthogPersonalAccessToken: process.env.EXPO_PUBLIC_POSTHOG_PAT ?? '',
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
    sentryAuthToken: process.env.EXPO_PUBLIC_SENTRY_AUTH_TOKEN ?? '',
    sentryOrg: process.env.EXPO_PUBLIC_SENTRY_ORG ?? 'steps-to-recovery',
    sentryProject: process.env.EXPO_PUBLIC_SENTRY_PROJECT ?? 'react-native-yx',
    appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'staging',
    eas: {}
  },
});
