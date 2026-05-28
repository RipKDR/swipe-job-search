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
  assetBundlePatterns: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.webp', '**/*.ttf', '**/*.woff', '**/*.woff2', '**/*.eot', '**/*.otf', '**/*.ico', '**/*.webmanifest', '**/*.json', '**/*.xml', '**/*.html', '**/*.css', '**/*.js', '**/*.ts', '**/*.tsx'],
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
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://staging.supabase.com',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
    posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY || 'phc_WDgWJzgamgBweAJpsRkD3sd08GcY6YGCPpHIlRWAwz9 ',
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || 'https://9432efc5f59b5e3d96df0e0a1ba738f8@o4510222864613376.ingest.us.sentry.io/4511465987178496',
    appEnv: process.env.EXPO_PUBLIC_APP_ENV || 'staging',
    eas: {
      projectId: 'e3d8894d-8177-4a4a-9dc5-2824f74a5d27' // hi-hired-staging
    },
    posthogProjectId: '251748',
    posthogPersonalAccessToken: 'phx_ZQyhTyMD285zvZk84Kw5NuhSm7HpS5dgWPtJni3x8HygFK8P',
    sentryAuthToken: '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',
    sentryOrg: 'steps-to-recovery',
    sentryProject: 'react-native-yx'
  }
});
