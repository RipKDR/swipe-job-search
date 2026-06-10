export default {
  expo: {
    name: "Hi-Hired",
    "slug": "hi-hired",
    "version": "1.0.0",
    "platforms": [
      "ios",
      "android",
      "web"
    ],
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "scheme": "hi-hired",
    "android": {
      "package": "com.hihired.app",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#6366f1"
      },
      "permissions": [
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION"
      ]
    },
    "ios": {
      "bundleIdentifier": "au.com.hihired.app"
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro",
      "output": "single"
    },
    "extra": {
      "eas": {
        "projectId": "e3d8894d-8177-4a4a-9dc5-2824f74a5d27"
      },
      "router": {},
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    },
    "plugins": [
      "expo-dev-client",
      "expo-router",
      "expo-secure-store",
      [
        "expo-splash-screen",
        {
          "image": "./assets/splash-icon.png",
          "resizeMode": "contain",
          "backgroundColor": "#0f172a"
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#6366f1",
          "defaultChannelName": "default"
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow Hi-Hired to access your photos for profile pictures."
        }
      ],
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Hi-Hired uses your location to show nearby jobs.",
          "locationWhenInUsePermission": "Hi-Hired uses your location to show nearby jobs."
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
