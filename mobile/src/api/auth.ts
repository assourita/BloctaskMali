import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, setTokens, clearTokens } from './client';
import { invalidateCache } from './cache';
import { resolveActiveRole } from '../utils/roles';
import type { AppRole } from '../utils/roles';
import type { AuthTokens, User, UserRole } from '../types';
import type { RegisterResponse } from './notifications';
import { verifyEmail, resendVerificationEmail } from './notifications';

export { verifyEmail, resendVerificationEmail };

const USER_KEY = 'user';
const ROLE_KEY = 'active_role';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  user_type: UserRole;
}

export async function loginWithGoogle(idToken: string, userType = 'client'): Promise<User> {
  await AsyncStorage.multiRemove([USER_KEY, ROLE_KEY]);
  invalidateCache();
  const res = await apiRequest<{ access: string; refresh: string; user: User }>('/auth/google/', {
    method: 'POST',
    body: JSON.stringify({ id_token: idToken, user_type: userType }),
  });
  await setTokens(res.access, res.refresh);
  const user = { ...res.user, active_role: resolveActiveRole(res.user) };
  await saveUser(user);
  return user;
}

export async function login(payload: LoginPayload): Promise<User> {
  await AsyncStorage.multiRemove([USER_KEY, ROLE_KEY]);
  invalidateCache();
  const tokens = await apiRequest<AuthTokens>('/auth/token/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  await setTokens(tokens.access, tokens.refresh);
  return fetchProfile();
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  await AsyncStorage.multiRemove([USER_KEY, ROLE_KEY]);
  invalidateCache();
  return apiRequest<RegisterResponse>(
    '/users/register/',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function fetchProfile(): Promise<User> {
  const user = await apiRequest<User>('/users/me/');
  const enriched = { ...user, active_role: resolveActiveRole(user) };
  await saveUser(enriched);
  return enriched;
}

export async function saveUser(user: User): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  if (user.active_role) {
    await AsyncStorage.setItem(ROLE_KEY, user.active_role);
  }
}

export async function loadStoredUser(): Promise<User | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as User;
    return { ...user, active_role: resolveActiveRole(user) };
  } catch {
    return null;
  }
}

export async function switchRole(role: AppRole): Promise<User> {
  await apiRequest('/users/switch-role/', {
    method: 'POST',
    body: JSON.stringify({ role }),
  });
  await AsyncStorage.setItem(ROLE_KEY, role);
  invalidateCache();
  return fetchProfile();
}

export async function logout(): Promise<void> {
  await clearTokens();
  await AsyncStorage.multiRemove([USER_KEY, ROLE_KEY]);
  invalidateCache();
}
