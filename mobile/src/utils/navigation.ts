import { router } from 'expo-router';
import type { User } from '../types';

/** Chemins accessibles même si le profil est incomplet. */
const ALLOWED_WHEN_BLOCKED = [
  '/profile',
  '/profile-completion',
  '/profile-edit',
  '/kyc',
  '/verify-phone',
  '/help',
  '/login',
  '/register',
  '/forgot-password',
  '/verify-email',
  '/map',
];

export function isPathAllowedWhenBlocked(pathname: string): boolean {
  const p = pathname || '';
  if (ALLOWED_WHEN_BLOCKED.some((allowed) => p === allowed || p.includes(allowed))) return true;
  if (p.includes('/profile') || p.includes('(tabs)/profile')) return true;
  return false;
}

export function navigateAfterAuth(user: User | null): void {
  if (user && user.can_access_platform === false) {
    router.push('/(tabs)/profile');
    return;
  }
  router.replace('/(tabs)');
}

export function guardPlatformAccess(pathname: string, user: User | null): boolean {
  if (!user || user.can_access_platform !== false) return true;
  if (isPathAllowedWhenBlocked(pathname)) return true;
  if (pathname.includes('profile')) return true;
  router.push('/(tabs)/profile');
  return false;
}
