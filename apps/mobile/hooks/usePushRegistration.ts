import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { AppState, Alert } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import {
  configureNotificationHandler,
  extractNotificationData,
  registerForPushNotificationsAsync,
  resolveNotificationRoute,
} from '@/lib/notifications';

/**
 * Registers Expo push token after auth and re-registers on token refresh.
 */
export function usePushRegistration() {
  const { session } = useAuth();
  const registeredRef = useRef<string | null>(null);

  useEffect(() => {
    configureNotificationHandler();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      registeredRef.current = null;
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (!cancelled && token) {
          registeredRef.current = token;
        }
      } catch (err) {
        console.warn('[push] registration failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);
}

/**
 * Deep-links to chat from notification tap; shows in-app alert when foregrounded.
 */
export function useNotificationObserver() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    function handleNotification(notification: Notifications.Notification, fromTap: boolean) {
      const data = extractNotificationData(notification);
      const route = resolveNotificationRoute(data);
      const title = notification.request.content.title ?? 'Hi-Hired';
      const body = notification.request.content.body ?? '';

      if (AppState.currentState === 'active' && !fromTap && body) {
        Alert.alert(title, body, route ? [{ text: 'Open', onPress: () => router.push(route as never) }, { text: 'Dismiss', style: 'cancel' }] : [{ text: 'OK' }]);
        return;
      }

      if (route && isMounted) {
        router.push(route as never);
      }
    }

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response?.notification) {
        handleNotification(response.notification, true);
      }
    });

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      handleNotification(notification, false);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotification(response.notification, true);
    });

    return () => {
      isMounted = false;
      receivedSub.remove();
      responseSub.remove();
    };
  }, [router]);
}
