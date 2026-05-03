/**
 * PricingService — quotes the trader-facing fixed-payout multiple from a
 * Black-Scholes-derived digital probability plus an explicit edge model.
 *
 * Trader UX stays binary ("Stake $X → Win $Y"); under the hood the multiplier
 * is computed live from spot, vol, and tenor instead of read from a hardcoded
 * payout table. The legacy table remains accessible behind `legacyPayout()`
 * so PR #6 / PR #7 can A/B against it during rollout.
 *
 * Edge model:
 *   payoutMultiple = (1 / digitalProb) * (1 - edgePct)
 *   where edgePct = baseEdge + tenorEdge(tenor) + ivPenalty(rv)
 *
 * Floors:
 *   - hard floor of 1.05x so the trader never sees < 5% gross winning return
 *   - hard ceiling of 25x so the platform doesn't quote insane multiples for
 *     deep-OTM short tenors
 */

import { Decimal } from 'decimal.js';
import { digitalCallProb, digitalPutProb, optionValue } from './blackScholes';
import { realizedVolatility } from './realizedVolatility';

export type Tenor = '30s' | '1m' | '5m' | '15m' | '1h' | '5s' | '10s' | '15s';

export const TENOR_TO_SECONDS: Record<Tenor, number> = {
  '5s': 5,
  '10s': 10,
  '15s': 15,
  '30s': 30,
  '1m': 60,
  '5m': 5 * 60,
  '15m': 15 * 60,
  '1h': 60 * 60,
};

const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

export interface QuoteArgs {
  optionType: 'call' | 'put';
  spotUSD: number;
  strikeOffsetUSD: number;
  tenor: Tenor;
  contracts: number;
  /** Override volatility; otherwise pulled from realizedVolatility */
  sigma?: number;
}

export interface Quote {
  spotUSD: number;
  strikeUSD: number;
  tenor: Tenor;
  T: number;
  sigma: number;
  digitalProb: number;
  payoutMultiple: number;
  premiumUSD: Decimal;
  potentialPayoutUSD: Decimal;
  edgePct: number;
}

const HARD_FLOOR_MULTIPLE = 1.05;
const HARD_CEILING_MULTIPLE = 25;
const BASE_EDGE_PCT = 0.05;

/**
 * Tenor-dependent edge: shorter tenors get a bigger edge to compensate for
 * adverse selection by latency-arbitraging bots.
 */
const tenorEdgePct = (tenor: Tenor): number => {
  switch (tenor) {
    case '5s':
    case '10s':
    case '15s':
      return 0.20;
    case '30s':
      return 0.10;
    case '1m':
      return 0.06;
    case '5m':
      return 0.03;
    case '15m':
      return 0.02;
    case '1h':
      return 0.01;
  }
};

/**
 * High-vol regime penalty: when realized vol is far above 60% (typical BTC
 * baseline) the platform widens edge to absorb hedging slippage.
 */
const ivPenaltyPct = (sigma: number): number => {
  if (sigma <= 0.6) return 0;
  if (sigma <= 1.2) return 0.02;
  return 0.05;
};

const computeStrike = (spot: number, offset: number, kind: 'call' | 'put'): number =>
  kind === 'call' ? spot + offset : spot - offset;

const PER_CONTRACT_PREMIUM_USD = 1;

export class PricingService {
  quote(args: QuoteArgs): Quote {
    const T = Math.max(TENOR_TO_SECONDS[args.tenor] / SECONDS_PER_YEAR, 1e-9);
    const sigma = Math.max(args.sigma ?? realizedVolatility.getAnnualized(), 0.05);
    const strike = computeStrike(args.spotUSD, args.strikeOffsetUSD, args.optionType);

    const bsArgs = { spot: args.spotUSD, strike, sigma, T };
    const digitalProb =
      args.optionType === 'call' ? digitalCallProb(bsArgs) : digitalPutProb(bsArgs);

    const edgePct = BASE_EDGE_PCT + tenorEdgePct(args.tenor) + ivPenaltyPct(sigma);
    const fairMultiple = digitalProb > 0 ? 1 / digitalProb : HARD_CEILING_MULTIPLE;
    const quotedRaw = fairMultiple * (1 - edgePct);
    const payoutMultiple = Math.min(
      HARD_CEILING_MULTIPLE,
      Math.max(HARD_FLOOR_MULTIPLE, quotedRaw),
    );

    const premium = new Decimal(args.contracts).mul(PER_CONTRACT_PREMIUM_USD);
    const payout = premium.mul(payoutMultiple);

    return {
      spotUSD: args.spotUSD,
      strikeUSD: strike,
      tenor: args.tenor,
      T,
      sigma,
      digitalProb,
      payoutMultiple,
      premiumUSD: premium,
      potentialPayoutUSD: payout,
      edgePct,
    };
  }

  /**
   * Mark-to-market value of an open ticket, used by the sell-back UI in PR #7.
   * Returns USD value the platform would pay to repurchase the ticket
   * (after edge), floored at 0.
   */
  markToMarketUSD(args: {
    optionType: 'call' | 'put';
    spotUSD: number;
    strikeUSD: number;
    tenor: Tenor;
    secondsRemaining: number;
    contracts: number;
    sigma?: number;
  }): Decimal {
    if (args.secondsRemaining <= 0) return new Decimal(0);
    const T = Math.max(args.secondsRemaining / SECONDS_PER_YEAR, 1e-9);
    const sigma = Math.max(args.sigma ?? realizedVolatility.getAnnualized(), 0.05);
    const probITM =
      args.optionType === 'call'
        ? digitalCallProb({ spot: args.spotUSD, strike: args.strikeUSD, sigma, T })
        : digitalPutProb({ spot: args.spotUSD, strike: args.strikeUSD, sigma, T });
    const quote = this.quote({
      optionType: args.optionType,
      spotUSD: args.spotUSD,
      strikeOffsetUSD: Math.abs(args.spotUSD - args.strikeUSD),
      tenor: args.tenor,
      contracts: args.contracts,
      sigma,
    });
    const expectedPayout = quote.potentialPayoutUSD.mul(probITM);
    const premium = new Decimal(args.contracts).mul(PER_CONTRACT_PREMIUM_USD);
    const sellbackEdge = 0.10;
    const value = expectedPayout.mul(1 - sellbackEdge);
    return value.greaterThan(premium.mul(2.5)) ? premium.mul(2.5) : value;
  }

  /** European put/call value for any tenor — used by hedging engine, not user UX. */
  vanillaValueUSD(args: {
    optionType: 'call' | 'put';
    spotUSD: number;
    strikeUSD: number;
    tenor: Tenor;
    sigma?: number;
  }): Decimal {
    const T = Math.max(TENOR_TO_SECONDS[args.tenor] / SECONDS_PER_YEAR, 1e-9);
    const sigma = Math.max(args.sigma ?? realizedVolatility.getAnnualized(), 0.05);
    return new Decimal(
      optionValue(args.optionType, { spot: args.spotUSD, strike: args.strikeUSD, sigma, T }),
    );
  }

  /** Legacy hardcoded payout table; PRESERVED for rollback / A-B during rollout. */
  legacyPayout(tenor: '5s' | '10s' | '15s', strikeOffset: 2.5 | 5 | 10 | 15): number {
    const TABLE: Record<'5s' | '10s' | '15s', Record<number, number>> = {
      '5s': { 2.5: 3.33, 5: 4.0, 10: 10.0, 15: 20.0 },
      '10s': { 2.5: 2.86, 5: 3.33, 10: 6.67, 15: 13.33 },
      '15s': { 2.5: 2.5, 5: 2.86, 10: 5.0, 15: 10.0 },
    };
    return TABLE[tenor]?.[strikeOffset] ?? 1;
  }
}

export const pricingService = new PricingService();
