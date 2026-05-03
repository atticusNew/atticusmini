import type { Decimal } from 'decimal.js';
import type { Tenor } from '../pricing/PricingService';

/**
 * Net delta exposure the platform carries against open trader tickets.
 * Positive = platform is net short BTC vs traders (we'd lose if BTC rips).
 * Negative = platform is net long BTC vs traders.
 */
export interface NetExposureSnapshot {
  asOf: number;
  spotUSD: number;
  /** Total BTC delta the platform owes the trader book (BTC, signed). */
  netDeltaBTC: Decimal;
  /** Notional gross exposure (BTC, unsigned). */
  grossNotionalBTC: Decimal;
  ticketCount: number;
}

export interface HedgeFillEvent {
  venue: string;
  symbol: string;
  side: 'buy' | 'sell';
  baseQty: Decimal;
  quoteUSD: Decimal;
  feesUSD: Decimal;
  bucketStartedAt: number;
  bucketEndedAt: number;
  venueOrderRef: string;
  idempotencyKey: string;
}

export interface VenueQuote {
  venue: string;
  symbol: string;
  side: 'buy' | 'sell';
  /** Top-of-book price in USD per 1 BTC. */
  price: number;
  /** Available size at that price (BTC). */
  available: Decimal;
  /** Round-trip fee + slippage estimate as a fraction of notional. */
  estCostPct: number;
}

export interface PlaceHedgeArgs {
  venue: string;
  symbol: string;
  side: 'buy' | 'sell';
  baseQty: Decimal;
  bucketStartedAt: number;
  bucketEndedAt: number;
  idempotencyKey: string;
}

export interface VenueConnector {
  readonly name: string;
  readonly defaultSymbol: string;
  /** Read-only quote; no order placed. */
  quote(symbol: string, side: 'buy' | 'sell', baseQty: Decimal): Promise<VenueQuote>;
  /** Execute the hedge. PR #9 stays in paper mode; live impl lands later. */
  place(args: PlaceHedgeArgs): Promise<{ ok: HedgeFillEvent } | { err: string }>;
}

export interface BudgetCapState {
  spentTodayUSD: Decimal;
  capUSD: Decimal;
  phase: 'bootstrap' | 'ramp' | 'scale';
  asOf: number;
}

export interface CircuitBreakerState {
  tripped: boolean;
  reason?: string;
  trippedAt?: number;
}

export type HedgeAction =
  | { kind: 'noop'; reason: string }
  | { kind: 'place'; venue: string; side: 'buy' | 'sell'; baseQty: Decimal; reason: string };

/** Marker type alias to keep tenor types reachable from hedging modules. */
export type HedgingTenor = Tenor;
