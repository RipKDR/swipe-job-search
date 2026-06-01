/**
 * Push notification registration, routing, and in-app handling.
 * Per EXPO_ROUTER_AUTH_NOTIFS_HAPTICS_2026.md §3 + BACKEND.md device_tokens.
 * Web-safe: all native notification APIs are gated behind Platform.OS.
 */
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export type NotificationData = {
  type?: string;
  match_id?: string;
  job_id?: string;
};

export function resolveNotificationRoute(data: NotificationData | null | undefined): string | null {
  if (!data?.type) {
    return null;
  }

  if (data.type === 'match' || data.type === 'message') {
    if (!data.match_id) {
      return null;
    }
    return `/chat/${data.match_id}`;
  }

  return null;
}

export async function registerDeviceToken(
  profileId: string,
  expoPushToken: string,
  platform: 'ios' | 'android'
): Promise<void> {
  const { error } = await (supabase.from('device_tokens') as any).upsert(
    {
      profile_id: profileId,
      expo_push_token: expoPushToken,
      platform,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: 'expo_push_token' }
  );

  if (error) {
    throw error;
  }
}

export function configureNotificationHandler(): void {
  if (Platform.OS === 'web') return;
  const Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      // Suppress system banner when app is foregrounded — the in-app
      // Alert from useNotificationObserver handles that case instead.
      // Fixes ARCHITECTURE_AUDIT.md HIGH-1: app presence detection.
      shouldShowAlert: AppState.currentState !== 'active',
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const { default: Notifications } = await import('expo-notifications');
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    throw new Error('EAS projectId missing from app.config.ts');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('matches', {
      name: 'New Matches & Messages',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  const expoPushToken = tokenData.data;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await registerDeviceToken(user.id, expoPushToken, Platform.OS === 'ios' ? 'ios' : 'android');
  }

  return expoPushToken;
}

export function extractNotificationData(
  notification: { request: { content: { data: unknown } } }
): NotificationData {
  const raw = notification.request.content.data;
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  return raw as NotificationData;
}
