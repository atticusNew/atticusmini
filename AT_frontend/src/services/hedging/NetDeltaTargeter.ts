/**
 * NetDeltaTargeter — decides whether to hedge based on a no-trade band.
 *
 * Inside the band: noop. Outside: emit a place-hedge action sized to bring
 * net delta back to the inner edge of the band, never overshooting. This
 * avoids the spread-cost trap of hedging tiny imbalances.
 */

import { Decimal } from 'decimal.js';
import type { HedgeAction, NetExposureSnapshot } from './types';

interface TargeterConfig {
  /** No-trade band, in BTC. e.g. 0.05 = ±0.05 BTC of net delta. */
  bandBTC: number;
  /** Default venue label written to the action. */
  venue: string;
}

const DEFAULTS: TargeterConfig = {
  bandBTC: 0.05,
  venue: 'bybit',
};

export class NetDeltaTargeter {
  constructor(private readonly cfg: TargeterConfig = DEFAULTS) {}

  decide(snapshot: NetExposureSnapshot): HedgeAction {
    const net = snapshot.netDeltaBTC;
    const band = new Decimal(this.cfg.bandBTC);
    if (net.abs().lessThanOrEqualTo(band)) {
      return { kind: 'noop', reason: `inside ±${this.cfg.bandBTC} BTC band` };
    }
    // Net positive (platform short BTC) → buy BTC perp to flatten.
    // Net negative (platform long BTC) → sell BTC perp to flatten.
    const side: 'buy' | 'sell' = net.greaterThan(0) ? 'buy' : 'sell';
    const magnitude = net.abs().minus(band);
    return {
      kind: 'place',
      venue: this.cfg.venue,
      side,
      baseQty: magnitude,
      reason: `net delta ${net.toFixed(4)} BTC outside ±${this.cfg.bandBTC} band`,
    };
  }
}
