import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { registerPushToken } from '../api/notifications';

/** Push distant indisponible dans Expo Go (SDK 53+). */
export function isRemotePushSupported(): boolean {
  if (!Device.isDevice) return false;
  if (Constants.appOwnership === 'expo') return false;
  return true;
}

async function loadNotificationsModule() {
  if (!isRemotePushSupported()) return null;
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

export async function setupPushNotifications(): Promise<string | null> {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) return null;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'BlockTask',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

export async function registerDevicePushToken(): Promise<void> {
  if (!isRemotePushSupported()) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[BlockTask] Push distant désactivé (Expo Go ou simulateur).');
    }
    return;
  }
  try {
    const token = await setupPushNotifications();
    if (token) {
      await registerPushToken(token);
    }
  } catch {
    /* permissions refusées ou module indisponible */
  }
}

export async function addNotificationResponseListener(
  handler: (data: Record<string, unknown>) => void,
): Promise<{ remove: () => void } | null> {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) return null;

  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    handler((response.notification.request.content.data || {}) as Record<string, unknown>);
  });
  return { remove: () => sub.remove() };
}
