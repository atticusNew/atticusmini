/**
 * Subtle haptic feedback (mobile vibration). Intentionally understated —
 * tactile confirmation only, never celebratory. No-ops on unsupported
 * devices and when the user prefers reduced motion.
 */

import { getSetting } from './settings';

const canVibrate = (): boolean =>
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

const reducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const buzz = (pattern: number | number[]): void => {
  if (!canVibrate() || reducedMotion() || !getSetting('haptics')) return;
  try { navigator.vibrate(pattern); } catch { /* ignore */ }
};

export const haptics = {
  /** Light confirmation for a tap / selection. */
  tap: () => buzz(10),
  /** Entering a position. */
  pick: () => buzz(14),
  /** Locking in / selling. */
  sell: () => buzz([8, 30, 8]),
  /** Match settled — a single soft cue, win or lose (no celebration). */
  settle: () => buzz(24),
};
