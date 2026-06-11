/**
 * matchEngine — pure duel mechanics for Atticus Lite.
 *
 * Design goals:
 *  - "Whoever profits the most wins the wager" must be unambiguous, so each
 *    side's PnL is a continuous mark-to-spot number (not a binary in/out).
 *  - Buy / sell / hold all map onto a single open position that can be closed
 *    early (locking PnL) or settled at expiry.
 *  - Limited downside: a side can never lose more than the amount it put to
 *    work, mirroring the capped risk of the main app's options.
 *  - Deterministic + framework-free so it is unit-testable and re-usable by a
 *    future server implementation.
 *
 * The leverage knob converts tiny 30s BTC moves into a game-meaningful PnL.
 * It is intentionally a single constant here; production can source it from
 * the pricing/hedging layer so payouts stay risk-aligned.
 */

import type {
  Direction,
  MatchResult,
  MatchSide,
  MatchState,
  SideId,
  MatchMode,
} from '../types';

/** Amplifies sub-1% 30s BTC moves into an engaging PnL swing. */
export const LITE_LEVERAGE = 120;

/**
 * Strike barrier distance from entry, as a fraction of spot. The strike sits
 * this far beyond entry in the chosen direction, so price must cross it to
 * turn a profit — making the strike a meaningful price factor. ~0.045% of spot
 * is a beatable-but-real hurdle over a 30s BTC window.
 */
export const STRIKE_OFFSET_PCT = 0.00045;

/** Strike price for a side entering at `spot` going `direction`. */
export const strikeFor = (spot: number, direction: Direction): number =>
  direction === 'up'
    ? spot * (1 + STRIKE_OFFSET_PCT)
    : spot * (1 - STRIKE_OFFSET_PCT);

/** PnL deltas below this (USD) are treated as flat for tie detection. */
export const PNL_EPSILON = 0.01;

export const DEFAULT_DURATION_SEC = 30;
export const MIN_AMOUNT_USD = 1;
export const MAX_AMOUNT_USD = 100;
export const MIN_WAGER_USD = 1;
export const MAX_WAGER_USD = 100;

export const clampAmount = (n: number): number =>
  Math.min(MAX_AMOUNT_USD, Math.max(MIN_AMOUNT_USD, Math.round(n)));

export const clampWager = (n: number): number =>
  Math.min(MAX_WAGER_USD, Math.max(MIN_WAGER_USD, Math.round(n)));

const sign = (d: Direction): number => (d === 'up' ? 1 : -1);

/**
 * Mark-to-spot PnL for a side at a given spot, measured against the STRIKE
 * (not the raw entry). Price must cross the strike in the chosen direction to
 * turn green. Returns 0 until the side has an entry + direction. Downside is
 * floored at -amountUSD (you can't lose more than you staked); upside is
 * uncapped over the window.
 */
export const livePnlUSD = (side: MatchSide, spot: number): number => {
  if (side.direction == null || side.entrySpot == null || side.entrySpot <= 0) {
    return 0;
  }
  const strike = side.strikeUSD ?? side.entrySpot;
  const ret = (spot - strike) / side.entrySpot;
  const raw = side.amountUSD * LITE_LEVERAGE * sign(side.direction) * ret;
  return Math.max(-side.amountUSD, raw);
};

/** True when price is on the winning side of the strike for this side. */
export const isInTheMoney = (side: MatchSide, spot: number): boolean => {
  if (side.direction == null || side.strikeUSD == null) return false;
  return side.direction === 'up' ? spot > side.strikeUSD : spot < side.strikeUSD;
};

/**
 * Effective PnL used for ranking + settlement: the realized number if the
 * side is closed, otherwise the live mark.
 */
export const effectivePnlUSD = (side: MatchSide, spot: number): number =>
  side.status === 'closed' && side.realizedPnlUSD != null
    ? side.realizedPnlUSD
    : livePnlUSD(side, spot);

export const makeSide = (
  id: SideId,
  name: string,
  avatar: string,
  amountUSD: number,
): MatchSide => ({
  id,
  name,
  avatar,
  direction: null,
  amountUSD: clampAmount(amountUSD),
  entrySpot: null,
  entryAt: null,
  strikeUSD: null,
  status: 'idle',
  realizedPnlUSD: null,
  closedAt: null,
});

export interface CreateMatchArgs {
  id: string;
  mode: MatchMode;
  wagerUSD: number;
  you: { name: string; avatar: string; amountUSD: number };
  opp: { name: string; avatar: string; amountUSD: number };
  durationSec?: number;
}

export const createMatch = (args: CreateMatchArgs): MatchState => ({
  id: args.id,
  mode: args.mode,
  wagerUSD: clampWager(args.wagerUSD),
  durationSec: args.durationSec ?? DEFAULT_DURATION_SEC,
  startedAt: null,
  entrySpot: null,
  phase: 'arming',
  you: makeSide('you', args.you.name, args.you.avatar, args.you.amountUSD),
  opp: makeSide('opp', args.opp.name, args.opp.avatar, args.opp.amountUSD),
  result: null,
});

/** Open a side's position at the current spot (the "buy"). Idempotent-ish:
 *  re-opening an already-open side is a no-op. */
export const openSide = (
  side: MatchSide,
  direction: Direction,
  spot: number,
  nowMs: number = Date.now(),
): MatchSide => {
  if (side.status !== 'idle') return side;
  return {
    ...side,
    direction,
    entrySpot: spot,
    entryAt: nowMs,
    strikeUSD: strikeFor(spot, direction),
    status: 'open',
  };
};

/** Lock a side's PnL at the given spot (the "sell"). No-op unless open. */
export const closeSide = (
  side: MatchSide,
  spot: number,
  nowMs: number,
): MatchSide => {
  if (side.status !== 'open') return side;
  return {
    ...side,
    status: 'closed',
    realizedPnlUSD: livePnlUSD(side, spot),
    closedAt: nowMs,
  };
};

/** Remaining seconds in the live window (>= 0). */
export const secondsRemaining = (match: MatchState, nowMs: number): number => {
  if (match.startedAt == null) return match.durationSec;
  const elapsed = (nowMs - match.startedAt) / 1000;
  return Math.max(0, match.durationSec - elapsed);
};

export const isExpired = (match: MatchState, nowMs: number): boolean =>
  match.startedAt != null && secondsRemaining(match, nowMs) <= 0;

export const bothClosed = (match: MatchState): boolean =>
  match.you.status === 'closed' && match.opp.status === 'closed';

/**
 * Settle the match at a final spot. Any side still open is closed at that
 * spot. Winner = higher PnL ("profit the most"); equal within epsilon is a
 * push. Net balance change to "you" includes both your own option PnL and
 * the wager transfer. In solo mode there is no wager transfer.
 */
export const settleMatch = (
  match: MatchState,
  finalSpot: number,
  nowMs: number,
): MatchState => {
  const you = closeSide(match.you, finalSpot, nowMs);
  const opp = closeSide(match.opp, finalSpot, nowMs);

  const youPnl = effectivePnlUSD(you, finalSpot);
  const oppPnl = effectivePnlUSD(opp, finalSpot);

  let outcome: MatchResult['outcome'];
  if (Math.abs(youPnl - oppPnl) <= PNL_EPSILON) outcome = 'push';
  else outcome = youPnl > oppPnl ? 'you' : 'opp';

  const wager = match.mode === 'solo' ? 0 : match.wagerUSD;
  const wagerTransfer = outcome === 'you' ? wager : outcome === 'opp' ? -wager : 0;

  const result: MatchResult = {
    outcome,
    youPnlUSD: youPnl,
    oppPnlUSD: oppPnl,
    youNetUSD: youPnl + wagerTransfer,
    wagerUSD: wager,
    finalSpot,
  };

  return { ...match, you, opp, phase: 'settled', result };
};
