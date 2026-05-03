/**
 * DailyBudgetCap — caps cumulative hedge cost per UTC day.
 *
 * Cost = fees + slippage + realized hedging error. Phases ramp the cap as
 * confidence in the hedging model grows, env-overridable via
 * VITE_HEDGE_BUDGET_SCHEDULE_JSON for ops tuning without a redeploy.
 *
 * Phases (defaults):
 *   bootstrap  $500/day (first 30 trading days)
 *   ramp       $2,500/day (after model is stable for 14 days)
 *   scale      $10,000/day (after model is stable for 30 days @ >$10M monthly flow)
 */

import { Decimal } from 'decimal.js';
import type { BudgetCapState } from './types';

const DEFAULT_SCHEDULE = {
  bootstrap: 500,
  ramp: 2_500,
  scale: 10_000,
} as const;

export type BudgetPhase = keyof typeof DEFAULT_SCHEDULE;

const utcDayKey = (ts: number): string => new Date(ts).toISOString().slice(0, 10);

export class DailyBudgetCap {
  private spentByDay = new Map<string, Decimal>();
  private currentPhase: BudgetPhase = 'bootstrap';
  private schedule: Record<BudgetPhase, number>;

  constructor(scheduleOverride?: Partial<Record<BudgetPhase, number>>) {
    this.schedule = { ...DEFAULT_SCHEDULE, ...scheduleOverride };
  }

  setPhase(phase: BudgetPhase): void {
    this.currentPhase = phase;
  }

  capUSD(): Decimal {
    return new Decimal(this.schedule[this.currentPhase]);
  }

  state(nowMs: number = Date.now()): BudgetCapState {
    return {
      spentTodayUSD: this.spentByDay.get(utcDayKey(nowMs)) ?? new Decimal(0),
      capUSD: this.capUSD(),
      phase: this.currentPhase,
      asOf: nowMs,
    };
  }

  /** Returns true if `costUSD` would breach today's cap. Does NOT mutate. */
  wouldBreach(costUSD: Decimal, nowMs: number = Date.now()): boolean {
    const spent = this.spentByDay.get(utcDayKey(nowMs)) ?? new Decimal(0);
    return spent.plus(costUSD).greaterThan(this.capUSD());
  }

  /** Records spend after a hedge fill is confirmed. */
  record(costUSD: Decimal, nowMs: number = Date.now()): void {
    const k = utcDayKey(nowMs);
    const prior = this.spentByDay.get(k) ?? new Decimal(0);
    this.spentByDay.set(k, prior.plus(costUSD));
  }
}
