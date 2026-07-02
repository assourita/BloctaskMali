import type { User } from '../types';

export type AppRole = 'client' | 'provider' | 'enterprise' | 'admin';

/** Rôle affiché dans l'UI — aligné sur le backend (get_effective_role). */
export function resolveActiveRole(
  user: Pick<User, 'active_role' | 'user_type' | 'secondary_role'> | null | undefined,
): AppRole {
  if (!user) return 'client';
  const available = getAvailableRoles(user);
  const active = user.active_role as AppRole | undefined;
  if (active && available.includes(active)) return active;
  const primary = user.user_type as AppRole;
  if (primary === 'provider' || primary === 'enterprise' || primary === 'admin') return primary;
  return 'client';
}

export function getAvailableRoles(user: Pick<User, 'user_type' | 'secondary_role'>): AppRole[] {
  const roles: AppRole[] = [];
  if (user.user_type) roles.push(user.user_type as AppRole);
  if (user.secondary_role && !roles.includes(user.secondary_role as AppRole)) {
    roles.push(user.secondary_role as AppRole);
  }
  return roles;
}

export function isEnterpriseAccount(user: Pick<User, 'user_type'> | null | undefined): boolean {
  return user?.user_type === 'enterprise';
}

export function isAdminAccount(user: Pick<User, 'user_type'> | null | undefined): boolean {
  return user?.user_type === 'admin';
}
