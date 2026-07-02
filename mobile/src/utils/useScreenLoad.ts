import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { invalidateCache } from '../api/cache';

/**
 * Recharge les données à chaque retour sur l'écran (ex. après une postulation).
 */
export function useFocusReload(reload: () => void | Promise<void>, enabled = true) {
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      void reload();
    }, [enabled, reload]),
  );
}

/**
 * Charge les données sans ré-afficher le loader plein écran après le premier chargement.
 */
export function useScreenLoad(loadFn: () => Promise<void>, deps: unknown[]) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const ready = useRef(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async (mode: 'initial' | 'refresh' | 'silent' = 'silent') => {
    if (mode === 'initial' && !ready.current) setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    try {
      await loadFn();
      ready.current = true;
    } catch {
      /* erreurs réseau / auth gérées par les écrans */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, deps);

  useEffect(() => {
    load(ready.current ? 'silent' : 'initial');
  }, [load]);

  const refresh = useCallback(() => {
    invalidateCache();
    return load('refresh');
  }, [load]);

  return {
    loading: loading && !ready.current,
    refreshing,
    refresh,
    reload: () => load('silent'),
  };
}
