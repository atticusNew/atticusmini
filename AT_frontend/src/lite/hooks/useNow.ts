import { useEffect, useState } from 'react';

/**
 * Ticking clock. Returns Date.now() refreshed every `intervalMs`. Used by the
 * match screen to drive countdowns + live PnL without each consumer wiring its
 * own interval.
 */
export const useNow = (intervalMs = 250, enabled = true): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
  return now;
};
