/**
 * HedgingEngine — top-level orchestrator.
 *
 * Cycle:
 *   1. Aggregate net BTC delta against the trader book.
 *   2. Evaluate the circuit breaker.
 *   3. Ask NetDeltaTargeter for an action; if `place`, ask DailyBudgetCap to
 *      approve the spend; if approved, route to the active VenueConnector.
 *   4. On fill, write the hedge_ledger entry.
 *
 * This PR ships the engine behind a feature flag (`VITE_HEDGE_ENABLED`).
 * Default off; ops dashboards pick it up via `state()` for monitoring.
 */

import { Decimal } from 'decimal.js';
import type { VenueConnector, NetExposureSnapshot, BudgetCapState, CircuitBreakerState, HedgeAction } from './types';
import { ExposureAggregator } from './ExposureAggregator';
import { NetDeltaTargeter } from './NetDeltaTargeter';
import { DailyBudgetCap } from './DailyBudgetCap';
import { CircuitBreaker } from './CircuitBreaker';
import { LedgerService } from '../ledger/LedgerService';
import { realizedVolatility } from '../pricing/realizedVolatility';
import type { PartnerExchangeAdapter } from '../partner';

interface HedgingEngineDeps {
  partner: PartnerExchangeAdapter;
  ledger: LedgerService;
  venue: VenueConnector;
  budget?: DailyBudgetCap;
  breaker?: CircuitBreaker;
  targeter?: NetDeltaTargeter;
}

export interface HedgeCycleResult {
  snapshot: NetExposureSnapshot;
  breaker: CircuitBreakerState;
  budget: BudgetCapState;
  action: HedgeAction;
  filled?: { venue: string; baseQty: string; quoteUSD: string; feesUSD: string };
  error?: string;
}

export class HedgingEngine {
  private readonly aggregator: ExposureAggregator;
  private readonly targeter: NetDeltaTargeter;
  private readonly budget: DailyBudgetCap;
  private readonly breaker: CircuitBreaker;
  private readonly venue: VenueConnector;
  private readonly ledger: LedgerService;
  private rollingMeanSigma = 0.6;
  private cycleSeq = 0;

  constructor(deps: HedgingEngineDeps) {
    this.aggregator = new ExposureAggregator(deps.partner);
    this.targeter = deps.targeter ?? new NetDeltaTargeter();
    this.budget = deps.budget ?? new DailyBudgetCap();
    this.breaker = deps.breaker ?? new CircuitBreaker();
    this.venue = deps.venue;
    this.ledger = deps.ledger;
  }

  /** Single cycle: snapshot → decide → (optionally) place. */
  async runOnce(activeUserIds: string[], spotUSD: number, sigma?: number): Promise<HedgeCycleResult> {
    const usedSigma = sigma ?? realizedVolatility.getAnnualized();
    const snapshot = await this.aggregator.snapshot(activeUserIds, spotUSD, usedSigma);
    this.rollingMeanSigma = 0.95 * this.rollingMeanSigma + 0.05 * usedSigma;

    const breaker = this.breaker.evaluate({
      netDeltaBTC: snapshot.netDeltaBTC,
      realizedSigma: usedSigma,
      rollingMeanSigma: this.rollingMeanSigma,
    });
    if (breaker.tripped) {
      return {
        snapshot,
        breaker,
        budget: this.budget.state(),
        action: { kind: 'noop', reason: `circuit breaker: ${breaker.reason}` },
      };
    }

    const action = this.targeter.decide(snapshot);
    if (action.kind === 'noop') {
      return { snapshot, breaker, budget: this.budget.state(), action };
    }

    const expectedCost = action.baseQty.mul(spotUSD).mul(0.0011); // round-trip taker
    if (this.budget.wouldBreach(expectedCost)) {
      return {
        snapshot,
        breaker,
        budget: this.budget.state(),
        action: { kind: 'noop', reason: 'daily hedge budget would be breached' },
      };
    }

    this.cycleSeq += 1;
    const idempotencyKey = `hedge:${snapshot.asOf}:${this.cycleSeq}`;
    const placed = await this.venue.place({
      venue: this.venue.name,
      symbol: this.venue.defaultSymbol,
      side: action.side,
      baseQty: action.baseQty,
      bucketStartedAt: snapshot.asOf - 30_000,
      bucketEndedAt: snapshot.asOf,
      idempotencyKey,
    });

    if ('err' in placed) {
      return { snapshot, breaker, budget: this.budget.state(), action, error: placed.err };
    }

    this.budget.record(placed.ok.feesUSD);

    await this.ledger.appendHedge({
      venue: placed.ok.venue,
      kind: 'hedge_fill',
      symbol: placed.ok.symbol,
      side: placed.ok.side,
      baseQty: placed.ok.baseQty,
      quoteUSD: placed.ok.quoteUSD,
      feesUSD: placed.ok.feesUSD,
      bucketStartedAt: placed.ok.bucketStartedAt,
      bucketEndedAt: placed.ok.bucketEndedAt,
      venueOrderRef: placed.ok.venueOrderRef,
      idempotencyKey: placed.ok.idempotencyKey,
    });

    return {
      snapshot,
      breaker,
      budget: this.budget.state(),
      action,
      filled: {
        venue: placed.ok.venue,
        baseQty: placed.ok.baseQty.toString(),
        quoteUSD: placed.ok.quoteUSD.toString(),
        feesUSD: placed.ok.feesUSD.toString(),
      },
    };
  }
}

// Suppress unused-import warning for Decimal — part of the transitive type surface.
const _ensureDecimalType: typeof Decimal = Decimal;
void _ensureDecimalType;
