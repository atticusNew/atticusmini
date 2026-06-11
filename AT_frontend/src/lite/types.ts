/**
 * Atticus Lite — domain model for the retail PvP "duel" experience.
 *
 * Lite is a social + gambling + trading skin on top of the same BTC
 * options engine used by the main "Micro Options" app. Two traders each
 * run a 30-second BTC position; whoever profits the most over the window
 * wins the agreed wager. Solo mode runs the same position with no
 * opponent / wager transfer.
 *
 * This file is deliberately UI-framework-free so the model can be reused
 * by a future backend / partner-exchange implementation.
 */

export type Direction = 'up' | 'down';

/** Where the trader entered the app from (deck step 1). */
export type RegistrationMethod = 'app' | 'third_party';

export interface LiteProfile {
  id: string;
  /** Short handle / display name shown on the swipe card. */
  name: string;
  /** One-line bio / tagline. */
  bio: string;
  /**
   * Avatar. Either a remote URL or a data URL from a local upload.
   * Kept as a plain string so the persistence layer stays simple.
   */
  avatar: string;
  registrationMethod: RegistrationMethod;
  createdAt: number;
  /** Lightweight social stats surfaced on the card (deck shows streak/wins/win%). */
  stats: ProfileStats;
}

export interface ProfileStats {
  streak: number;
  wins: number;
  losses: number;
}

/** A potential opponent presented in the swipe deck. */
export interface Opponent {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  stats: ProfileStats;
  /**
   * Hidden skill knob (0..1) driving the bot during a match. Never shown
   * to the trader; matchmaking can use it to keep duels competitive.
   */
  skill: number;
}

export type MatchMode = 'pvp' | 'solo';

export type SideId = 'you' | 'opp';

export type SideStatus = 'idle' | 'open' | 'closed';

/**
 * One trader's leg of a duel. A side opens a single directional position
 * (the "buy"), can "sell" to lock its PnL early, or hold to expiry. PnL is
 * continuous (mark-to-spot) so "who profited the most" is well-defined.
 */
export interface MatchSide {
  id: SideId;
  name: string;
  avatar: string;
  direction: Direction | null;
  /** Option amount / notional the trader put to work ($1..$100). */
  amountUSD: number;
  /** Spot captured when this side opened its position. */
  entrySpot: number | null;
  /** Wall-clock ms the side opened (for plotting the entry dot on the chart). */
  entryAt: number | null;
  /**
   * Strike barrier the side is measured against — set just beyond entry in the
   * chosen direction (entry + offset for HIGH, entry − offset for LOW). Price
   * must push PAST this line to move into profit, so the strike is a real
   * price factor, not just the entry.
   */
  strikeUSD: number | null;
  status: SideStatus;
  /** Realized PnL once the side is closed (sold early or settled at expiry). */
  realizedPnlUSD: number | null;
  /** Wall-clock ms the side closed, if closed. */
  closedAt: number | null;
}

export type MatchPhase =
  // Pre-trade: both sides choosing direction + amount (deck: "10 seconds to set").
  | 'arming'
  // Live 30s window.
  | 'live'
  // Window elapsed (or both sold) — winner computed.
  | 'settled';

export interface MatchState {
  id: string;
  mode: MatchMode;
  wagerUSD: number;
  /** Fixed expiry for Lite (deck: all trades 30s). */
  durationSec: number;
  /** ms timestamp the live window started, or null while arming. */
  startedAt: number | null;
  entrySpot: number | null;
  phase: MatchPhase;
  you: MatchSide;
  opp: MatchSide;
  result: MatchResult | null;
}

export type MatchOutcome = 'you' | 'opp' | 'push';

export interface MatchResult {
  outcome: MatchOutcome;
  youPnlUSD: number;
  oppPnlUSD: number;
  /** Net change to your balance = your option PnL + wager transfer. */
  youNetUSD: number;
  wagerUSD: number;
  finalSpot: number;
}
