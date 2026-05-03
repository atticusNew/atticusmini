/**
 * Pure helpers driving the paper-balance pill's session math.
 *
 * Kept separate from the React context so they can be unit tested without
 * a DOM. The provider feeds raw balance snapshots into `nextBalanceState`
 * and renders whatever it returns; `resetState` produces a fresh session.
 */

import type { BalanceDelta } from '../contexts/BalanceProvider';

export interface BalanceSessionState {
  initialized: boolean;
  sessionStart: number;
  previous: number | null;
  current: number;
  dayPnl: number;
  lastDelta: BalanceDelta | null;
}

export const initialBalanceState = (): BalanceSessionState => ({
  initialized: false,
  sessionStart: 0,
  previous: null,
  current: 0,
  dayPnl: 0,
  lastDelta: null,
});

const EPS = 0.0001;

/**
 * Apply a fresh balance reading to the session state.
 * - First reading anchors `sessionStart`.
 * - Subsequent readings emit a `lastDelta` if the change exceeds EPS.
 * - `dayPnl` is always `current - sessionStart`.
 */
export const nextBalanceState = (
  prev: BalanceSessionState,
  next: number,
  now: number = Date.now(),
): BalanceSessionState => {
  if (!prev.initialized) {
    return {
      initialized: true,
      sessionStart: next,
      previous: next,
      current: next,
      dayPnl: 0,
      lastDelta: null,
    };
  }
  const diff = next - (prev.previous ?? next);
  const lastDelta: BalanceDelta | null =
    Math.abs(diff) > EPS ? { amount: diff, at: now } : prev.lastDelta;
  return {
    initialized: true,
    sessionStart: prev.sessionStart,
    previous: next,
    current: next,
    dayPnl: next - prev.sessionStart,
    lastDelta,
  };
};

export const resetBalanceState = (): BalanceSessionState => initialBalanceState();
