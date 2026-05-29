import { ConfigContext } from 'expo/config';
import type { ExpoConfig } from '@expo/config-types';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config as ExpoConfig,
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
    }
  }
});
