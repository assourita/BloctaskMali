import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@blocktask/footer_collapsed';

/** Padding bas quand le footer est ouvert (hors safe area). */
export const APP_FOOTER_CONTENT_INSET = 78;
/** Padding bas quand le footer est réduit (chip de réouverture). */
export const APP_FOOTER_COLLAPSED_INSET = 40;

interface FooterVisibilityContextValue {
  collapsed: boolean;
  ready: boolean;
  contentInset: number;
  collapse: () => void;
  expand: () => void;
  toggle: () => void;
}

const FooterVisibilityContext = createContext<FooterVisibilityContextValue | null>(null);

export function FooterVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw === '1') setCollapsed(true);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: boolean) => {
    setCollapsed(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const collapse = useCallback(() => {
    void persist(true);
  }, [persist]);
  const expand = useCallback(() => {
    void persist(false);
  }, [persist]);
  const toggle = useCallback(() => {
    void persist(!collapsed);
  }, [collapsed, persist]);

  const contentInset = collapsed ? APP_FOOTER_COLLAPSED_INSET : APP_FOOTER_CONTENT_INSET;

  const value = useMemo(
    () => ({ collapsed, ready, contentInset, collapse, expand, toggle }),
    [collapsed, ready, contentInset, collapse, expand, toggle],
  );

  return (
    <FooterVisibilityContext.Provider value={value}>{children}</FooterVisibilityContext.Provider>
  );
}

export function useFooterVisibility(): FooterVisibilityContextValue {
  const ctx = useContext(FooterVisibilityContext);
  if (!ctx) throw new Error('useFooterVisibility must be used within FooterVisibilityProvider');
  return ctx;
}
