/**
 * CircuitBreaker — auto-pause new hedge orders when one of:
 *   - daily cap is exhausted (handled at HedgingEngine level via DailyBudgetCap)
 *   - realized vol diverges sharply from implied (vol shock)
 *   - net-delta exceeds an absolute hard ceiling
 */

import type { Decimal } from 'decimal.js';
import type { CircuitBreakerState } from './types';

interface BreakerConfig {
  hardNetDeltaCeilingBTC: number;
  rvShockSigmaMultiple: number;
}

const DEFAULTS: BreakerConfig = {
  hardNetDeltaCeilingBTC: 5.0,
  rvShockSigmaMultiple: 3.0,
};

export class CircuitBreaker {
  private state: CircuitBreakerState = { tripped: false };
  constructor(private readonly cfg: BreakerConfig = DEFAULTS) {}

  evaluate(input: {
    netDeltaBTC: Decimal;
    realizedSigma: number;
    rollingMeanSigma: number;
  }): CircuitBreakerState {
    if (input.netDeltaBTC.abs().greaterThan(this.cfg.hardNetDeltaCeilingBTC)) {
      this.state = {
        tripped: true,
        reason: `net delta ${input.netDeltaBTC.toFixed(4)} BTC exceeds hard ceiling ${this.cfg.hardNetDeltaCeilingBTC}`,
        trippedAt: Date.now(),
      };
      return this.state;
    }
    if (
      input.rollingMeanSigma > 0 &&
      input.realizedSigma > input.rollingMeanSigma * this.cfg.rvShockSigmaMultiple
    ) {
      this.state = {
        tripped: true,
        reason: `realized vol ${input.realizedSigma.toFixed(2)} > ${this.cfg.rvShockSigmaMultiple}x rolling mean ${input.rollingMeanSigma.toFixed(2)}`,
        trippedAt: Date.now(),
      };
      return this.state;
    }
    this.state = { tripped: false };
    return this.state;
  }

  reset(): void {
    this.state = { tripped: false };
  }

  current(): CircuitBreakerState {
    return this.state;
  }
}
