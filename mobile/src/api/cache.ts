/** Cache mémoire court + déduplication des requêtes GET en cours. */

interface CacheEntry {
  data: unknown;
  expires: number;
}

const store = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

function ttlForPath(path: string): number {
  if (path.includes('/config/landing')) return 120_000;
  if (path.includes('/notifications')) return 25_000;
  if (path.includes('/users/me') || path.includes('/enterprise/profile')) return 60_000;
  if (path.includes('/missions/stats')) return 35_000;
  if (path.includes('/missions/')) return 30_000;
  if (path.includes('/analytics/')) return 45_000;
  return 40_000;
}

export function cacheKey(method: string, path: string): string {
  return `${method}:${path}`;
}

export function readCache<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expires) {
    store.delete(key);
    return undefined;
  }
  return hit.data as T;
}

export function writeCache(key: string, data: unknown, path: string): void {
  store.set(key, { data, expires: Date.now() + ttlForPath(path) });
}

export function getInflight<T>(key: string): Promise<T> | undefined {
  return inflight.get(key) as Promise<T> | undefined;
}

export function setInflight(key: string, promise: Promise<unknown>): void {
  inflight.set(key, promise);
  promise.finally(() => {
    if (inflight.get(key) === promise) inflight.delete(key);
  });
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of [...store.keys()]) {
    if (key.includes(prefix)) store.delete(key);
  }
}

export function invalidateAfterMutation(path: string): void {
  if (path.includes('/missions')) invalidateCache('/missions');
  if (path.includes('/escrow') || path.includes('/deposits')) {
    invalidateCache('/escrow');
    invalidateCache('/enterprise/profile');
    invalidateCache('/users/me');
  }
  if (path.includes('/notifications')) invalidateCache('/notifications');
  if (path.includes('/enterprise') || path.includes('/employees')) {
    invalidateCache('/enterprise');
    invalidateCache('/users/enterprise');
  }
  if (path.includes('/apply')) {
    invalidateCache('/missions');
    invalidateCache('/applications');
  }
}
