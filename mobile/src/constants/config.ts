import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Hôte spécial émulateur Android → machine hôte */
const EMULATOR_ANDROID_HOST = '10.0.2.2';

function parseIpFromHost(host?: string | null): string | null {
  if (!host) return null;
  const stripped = host.replace(/^[^:]+:\/\//, '');
  const ip = stripped.split(':')[0]?.trim();
  if (!ip || ip === 'localhost' || ip === '127.0.0.1') return null;
  return ip;
}

/** IP LAN du PC où tourne Metro (même réseau Wi‑Fi que le téléphone). */
export function getLanDevIp(): string | null {
  const fromExpoGo = Constants.expoGoConfig?.debuggerHost;
  const fromHostUri = Constants.expoConfig?.hostUri;
  const fromLegacy = (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;

  return parseIpFromHost(fromExpoGo) ?? parseIpFromHost(fromHostUri) ?? parseIpFromHost(fromLegacy);
}

function replaceDevHosts(url: string, lanIp: string): string {
  return url
    .replace(/\/\/localhost(?=[:/])/gi, `//${lanIp}`)
    .replace(/\/\/127\.0\.0\.1(?=[:/])/g, `//${lanIp}`)
    .replace(/\/\/10\.0\.2\.2(?=[:/])/g, `//${lanIp}`);
}

function resolveApiUrl(): string {
  const lanIp = getLanDevIp();
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (envUrl) {
    if (lanIp && /localhost|127\.0\.0\.1|10\.0\.2\.2/i.test(envUrl)) {
      return replaceDevHosts(envUrl, lanIp);
    }
    return envUrl;
  }

  if (lanIp) {
    return `http://${lanIp}:8000/api`;
  }

  if (Platform.OS === 'android') {
    return `http://${EMULATOR_ANDROID_HOST}:8000/api`;
  }

  return 'http://localhost:8000/api';
}

export const API_URL = resolveApiUrl();
export const APP_NAME = 'BlockTask';

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('[BlockTask] API_URL =', API_URL);
}

/** Base média (host sans le suffixe /api) pour résoudre des chemins relatifs. */
export const MEDIA_BASE = API_URL.replace(/\/api\/?$/, '');

/** Construit une URL absolue pour un fichier média servi par le backend. */
export function mediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${MEDIA_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}
