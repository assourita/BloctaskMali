import * as Application from 'expo-application';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const extra = Constants.expoConfig?.extra as { googleWebClientId?: string } | undefined;

export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || extra?.googleWebClientId || '';

/** Client iOS (Google Cloud → Application iOS, bundle host.exp.Exponent pour Expo Go). */
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

/** Client Android (Google Cloud → Application Android, package host.exp.exponent pour Expo Go). */
export const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';

/** URI de redirection OAuth native (client iOS/Android, pas le client Web). */
export const GOOGLE_REDIRECT_URI = AuthSession.makeRedirectUri({
  native: `${Application.applicationId}:/oauthredirect`,
  scheme: 'blocktask',
});

if (__DEV__ && GOOGLE_WEB_CLIENT_ID) {
  console.log('[BlockTask] Google redirectUri =', GOOGLE_REDIRECT_URI);
  console.log('[BlockTask] Google applicationId =', Application.applicationId);
}

export function useGoogleAuth() {
  const config: Google.GoogleAuthRequestConfig = {
    webClientId: GOOGLE_WEB_CLIENT_ID,
  };

  // Ne jamais réutiliser le client Web comme client iOS/Android (bloqué par Google).
  if (Platform.OS === 'ios' && GOOGLE_IOS_CLIENT_ID) {
    config.iosClientId = GOOGLE_IOS_CLIENT_ID;
  } else if (Platform.OS === 'android' && GOOGLE_ANDROID_CLIENT_ID) {
    config.androidClientId = GOOGLE_ANDROID_CLIENT_ID;
  } else {
    config.clientId = GOOGLE_WEB_CLIENT_ID;
  }

  return Google.useAuthRequest(config, {
    native: `${Application.applicationId}:/oauthredirect`,
  });
}
