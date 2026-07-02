import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/config';
import {
  cacheKey,
  getInflight,
  invalidateAfterMutation,
  readCache,
  setInflight,
  writeCache,
} from './cache';

const TOKEN_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

let memoryToken: string | null | undefined;
let refreshPromise: Promise<string | null> | null = null;

export async function getAccessToken(): Promise<string | null> {
  if (memoryToken !== undefined) return memoryToken;
  memoryToken = await AsyncStorage.getItem(TOKEN_KEY);
  return memoryToken;
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  memoryToken = access;
  await AsyncStorage.multiSet([
    [TOKEN_KEY, access],
    [REFRESH_KEY, refresh],
  ]);
}

export async function clearTokens(): Promise<void> {
  memoryToken = null;
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY]);
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refresh = await AsyncStorage.getItem(REFRESH_KEY);
    if (!refresh) return null;

    const res = await safeFetch(`${API_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    memoryToken = data.access;
    const pairs: [string, string][] = [[TOKEN_KEY, data.access]];
    if (data.refresh) pairs.push([REFRESH_KEY, data.refresh]);
    await AsyncStorage.multiSet(pairs);
    return data.access;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function parseError(data: unknown, status: number): string {
  if (typeof data === 'object' && data && 'detail' in data) {
    return String((data as { detail: string }).detail);
  }
  if (typeof data === 'object' && data && 'error' in data) {
    return String((data as { error: string }).error);
  }
  return `Erreur ${status}`;
}

function isNetworkError(err: unknown): boolean {
  return (
    err instanceof TypeError &&
    /network request failed|failed to fetch|network error/i.test(String(err.message))
  );
}

function networkErrorMessage(): string {
  return `Impossible de joindre le serveur (${API_URL}). Lancez le backend avec « python manage.py runserver 0.0.0.0:8000 » et vérifiez le Wi‑Fi.`;
}

async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (err) {
    if (isNetworkError(err)) {
      throw new ApiError(networkErrorMessage(), 0);
    }
    throw err;
  }
}

async function parseResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const key = cacheKey(method, path);

  if (method !== 'GET') {
    invalidateAfterMutation(path);
  } else {
    const cached = readCache<T>(key);
    if (cached !== undefined) return cached;
    const pending = getInflight<T>(key);
    if (pending) return pending;
  }

  const run = async (): Promise<T> => {
    const token = await getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await safeFetch(`${API_URL}${path}`, { ...options, headers });

    if (res.status === 401 && retry) {
      memoryToken = undefined;
      const newToken = await refreshAccessToken();
      if (newToken) return apiRequest<T>(path, options, false);
      await clearTokens();
    }

    const data = await parseResponse(res);
    if (!res.ok) throw new ApiError(parseError(data, res.status), res.status, data);

    if (method === 'GET') writeCache(key, data, path);
    return data as T;
  };

  if (method === 'GET') {
    const promise = run();
    setInflight(key, promise);
    return promise;
  }
  return run();
}

/** Requête multipart (upload fichiers) — ne pas définir Content-Type manuellement */
export async function apiFormRequest<T>(
  path: string,
  formData: FormData,
  retry = true,
  method: 'POST' | 'PATCH' | 'PUT' = 'POST',
): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await safeFetch(`${API_URL}${path}`, { method, headers, body: formData });

  if (res.status === 401 && retry) {
    memoryToken = undefined;
    const newToken = await refreshAccessToken();
    if (newToken) return apiFormRequest<T>(path, formData, false, method);
    await clearTokens();
  }

  const data = await parseResponse(res);
  if (!res.ok) throw new ApiError(parseError(data, res.status), res.status, data);
  return data as T;
}
