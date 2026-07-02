import type { ReactNode } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';

/** Redirige si l'utilisateur n'est pas gérant entreprise. */
export function useEnterpriseGuard(): { allowed: boolean; redirect: ReactNode | null } {
  const { user, activeRole } = useAuth();
  if (!user) return { allowed: false, redirect: <Redirect href="/" /> };
  if (activeRole !== 'enterprise' || user.user_type !== 'enterprise') {
    return { allowed: false, redirect: <Redirect href="/(tabs)" /> };
  }
  return { allowed: true, redirect: null };
}
