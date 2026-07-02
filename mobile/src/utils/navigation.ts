import { router } from 'expo-router';
import type { User } from '../types';

/** Chemins accessibles même si le profil est incomplet. */
const ALLOWED_WHEN_BLOCKED = [
  '/profile',
  '/profile-completion',
  '/help',
  '/login',
  '/register',
  '/home',
  '/forgot-password',
];

export function isPathAllowedWhenBlocked(pathname: string): boolean {
  return ALLOWED_WHEN_BLOCKED.some((p) => pathname === p || pathname.includes(p));
}

export function navigateAfterAuth(user: User | null): void {
  if (user && user.can_access_platform === false) {
    router.replace('/(tabs)/profile');
    return;
  }
  router.replace('/(tabs)');
}

export function guardPlatformAccess(pathname: string, user: User | null): boolean {
  if (!user || user.can_access_platform !== false) return true;
  if (isPathAllowedWhenBlocked(pathname)) return true;
  router.replace('/(tabs)/profile');
  return false;
}
