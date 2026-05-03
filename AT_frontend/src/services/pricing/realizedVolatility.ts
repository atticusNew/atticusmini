/**
 * Realized volatility EMA on log-returns of the spot tape.
 *
 * Maintains an exponentially-weighted variance of per-tick log returns,
 * annualized using the observed sample interval. Output is always a positive
 * number; `getAnnualized()` returns 0 until at least 2 ticks have arrived.
 *
 * Tuning:
 *   - `halfLifeMs` controls how quickly recent vol dominates the estimate.
 *     A 5-minute half-life is a sensible default for short-tenor BTC.
 *   - `floor` clips the output away from zero so the pricer never sees
 *     sigma=0 (which would collapse to intrinsic).
 *   - `cap` clips the output at a sane upper bound (e.g. 4.0 = 400%).
 */

export interface RVConfig {
  halfLifeMs?: number;
  floor?: number;
  cap?: number;
}

const DEFAULT_HALF_LIFE_MS = 5 * 60 * 1000;
const DEFAULT_FLOOR = 0.15;
const DEFAULT_CAP = 4.0;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export class RealizedVolatilityEMA {
  private prevPrice: number | null = null;
  private prevTs: number | null = null;
  private varEma = 0;
  private intervalEma = 0;
  private hasSample = false;
  private readonly alpha: number;
  private readonly halfLifeMs: number;
  private readonly floor: number;
  private readonly cap: number;

  constructor(cfg: RVConfig = {}) {
    this.halfLifeMs = cfg.halfLifeMs ?? DEFAULT_HALF_LIFE_MS;
    this.floor = cfg.floor ?? DEFAULT_FLOOR;
    this.cap = cfg.cap ?? DEFAULT_CAP;
    this.alpha = 1 - Math.pow(0.5, 1 / Math.max(this.halfLifeMs / 1000, 1));
  }

  observe(price: number, tsMs: number): void {
    if (price <= 0 || !Number.isFinite(price)) return;
    if (this.prevPrice == null || this.prevTs == null) {
      this.prevPrice = price;
      this.prevTs = tsMs;
      return;
    }
    const dt = Math.max(tsMs - this.prevTs, 1);
    const r = Math.log(price / this.prevPrice);
    const rSq = r * r;
    if (!this.hasSample) {
      this.varEma = rSq;
      this.intervalEma = dt;
      this.hasSample = true;
    } else {
      this.varEma = this.alpha * rSq + (1 - this.alpha) * this.varEma;
      this.intervalEma = this.alpha * dt + (1 - this.alpha) * this.intervalEma;
    }
    this.prevPrice = price;
    this.prevTs = tsMs;
  }

  /** Annualized vol, clipped to [floor, cap]. Returns floor before any samples. */
  getAnnualized(): number {
    if (!this.hasSample || this.intervalEma <= 0) return this.floor;
    const samplesPerYear = YEAR_MS / this.intervalEma;
    const annualVar = this.varEma * samplesPerYear;
    const sigma = Math.sqrt(Math.max(annualVar, 0));
    return Math.max(this.floor, Math.min(this.cap, sigma));
  }
}

export const realizedVolatility = new RealizedVolatilityEMA();
