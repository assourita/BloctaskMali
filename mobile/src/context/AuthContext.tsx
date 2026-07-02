import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  fetchProfile,
  loadStoredUser,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  switchRole as apiSwitchRole,
  type LoginPayload,
  type RegisterPayload,
} from '../api/auth';
import type { RegisterResponse } from '../api/notifications';
import { registerDevicePushToken } from '../services/pushNotifications';
import { getAccessToken } from '../api/client';
import { invalidateCache } from '../api/cache';
import type { AppRole } from '../utils/roles';
import { resolveActiveRole } from '../utils/roles';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  activeRole: AppRole;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  switchRole: (role: AppRole) => Promise<void>;
  refreshProfile: () => Promise<User>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const activeRole = useMemo<AppRole>(() => resolveActiveRole(user), [user]);

  const bootstrap = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        setUser(null);
        return;
      }
      const stored = await loadStoredUser();
      if (stored) setUser(stored);
      try {
        const profile = await fetchProfile();
        setUser(profile);
      } catch {
        /* backend injoignable : conserver la session locale */
      }
  void registerDevicePushToken().catch(() => {});
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(async (payload: LoginPayload) => {
    const profile = await apiLogin(payload);
    setUser(profile);
    void registerDevicePushToken();
    return profile;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    return apiRegister(payload);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    invalidateCache();
    setUser(null);
  }, []);

  const switchRole = useCallback(async (role: AppRole) => {
    const profile = await apiSwitchRole(role);
    setUser(profile);
  }, []);

  const refreshProfile = useCallback(async () => {
    const profile = await fetchProfile();
    setUser(profile);
    return profile;
  }, []);

  const value = useMemo(
    () => ({ user, activeRole, loading, login, register, logout, switchRole, refreshProfile }),
    [user, activeRole, loading, login, register, logout, switchRole, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
