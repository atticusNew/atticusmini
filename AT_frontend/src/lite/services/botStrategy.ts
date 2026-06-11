/**
 * botStrategy — drives the opponent during a Lite duel.
 *
 * The bot is intentionally simple and transparent: it decides an entry
 * direction up front, then may "sell" early to lock a good PnL or cut a bad
 * one. Higher-skill opponents time their exit better. This keeps duels
 * lively without a real counterparty while the matchmaking/backend is built.
 *
 * Pure functions + an injectable RNG so behaviour is testable.
 */

import type { Direction, MatchSide, Opponent } from '../types';
import { livePnlUSD } from './matchEngine';

export type Rng = () => number;

const defaultRng: Rng = Math.random;

/** Pick the bot's entry direction. Slightly momentum-biased by recent move. */
export const chooseDirection = (
  recentReturn: number,
  skill: number,
  rng: Rng = defaultRng,
): Direction => {
  // Skilled bots follow short-term momentum more often; weak bots are noisy.
  const momentumBias = Math.tanh(recentReturn * 500) * skill; // -skill..skill
  const pUp = 0.5 + momentumBias * 0.5;
  return rng() < pUp ? 'up' : 'down';
};

export interface BotDecisionArgs {
  opponent: Opponent;
  side: MatchSide;
  spot: number;
  secondsRemaining: number;
  rng?: Rng;
}

/**
 * Decide whether the bot sells now. Returns true to lock PnL early.
 * Heuristics:
 *  - Take profit when comfortably green (threshold scales with skill).
 *  - Cut losses when clearly red late in the window.
 *  - Never sell in the very first moments (let the position breathe).
 */
export const shouldSell = (args: BotDecisionArgs): boolean => {
  const { opponent, side, spot, secondsRemaining, rng = defaultRng } = args;
  if (side.status !== 'open') return false;
  if (secondsRemaining > 26) return false; // let it breathe for ~4s

  const pnl = livePnlUSD(side, spot);
  const takeProfitUSD = side.amountUSD * (0.15 + opponent.skill * 0.35);
  const stopLossUSD = -side.amountUSD * (0.4 + opponent.skill * 0.3);

  if (pnl >= takeProfitUSD) return rng() < 0.5 + opponent.skill * 0.4;
  if (secondsRemaining < 8 && pnl <= stopLossUSD) return rng() < 0.6;
  return false;
};
