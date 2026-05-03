/**
 * useFirstTradeHint — gates the onboarding hint that appears above the
 * trade form on first visit and auto-dismisses on the first placed trade.
 *
 * Persistence is intentionally cheap: a single localStorage flag, no
 * external state. Server-side rendering is supported (SSR check) but
 * the demo is SPA-only today.
 */

import { useCallback, useEffect, useState } from 'react';

export const FIRST_TRADE_HINT_KEY = 'atticus.demo.firstTradeHintDismissed';

const isStorageAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const k = '__atticus_storage_test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
};

export const isHintDismissed = (storage: Pick<Storage, 'getItem'>): boolean => {
  return storage.getItem(FIRST_TRADE_HINT_KEY) === '1';
};

export const useFirstTradeHint = (): {
  visible: boolean;
  dismiss: () => void;
} => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isStorageAvailable()) return;
    setVisible(!isHintDismissed(window.localStorage));
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    if (isStorageAvailable()) {
      window.localStorage.setItem(FIRST_TRADE_HINT_KEY, '1');
    }
  }, []);

  return { visible, dismiss };
};
