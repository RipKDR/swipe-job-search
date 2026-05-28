import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Hi-Hired',
  slug: 'hi-hired',
  version: '0.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  scheme: 'hi-hired',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0f172a'
  },
  assetBundlePatterns: ['**/*'],
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
    bundler: 'metro'
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
    // Populated from EAS / .env via expo-constants at runtime (never secrets in bundle)
    // See STACK.md Environment Variables Matrix + EXPO_2026.md § env
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://YOUR-DEV-PROJECT.supabase.co',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR-ANON-KEY',
    posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY || '',
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
    appEnv: process.env.EXPO_PUBLIC_APP_ENV || 'development',
    eas: {
      projectId: 'YOUR-EAS-PROJECT-ID' // set in EAS dashboard per env (dev/staging/prod)
    }
  }
});