/**
 * OKXConnector — scaffold only.
 *
 * Same interface as BybitConnector. Public quote endpoint is wired so the
 * hedging engine can solicit price comparisons; `place` is intentionally
 * not implemented in this PR (returns err).
 */

import { Decimal } from 'decimal.js';
import type { HedgeFillEvent, PlaceHedgeArgs, VenueConnector, VenueQuote } from '../types';

const BASE_URL = 'https://www.okx.com';
const ROUND_TRIP_FEE_PCT = 0.001; // 0.05% taker × 2

export class OKXConnector implements VenueConnector {
  readonly name = 'okx';
  readonly defaultSymbol = 'BTC-USDT-SWAP';

  async quote(symbol: string, side: 'buy' | 'sell', _baseQty: Decimal): Promise<VenueQuote> {
    const url = `${BASE_URL}/api/v5/market/ticker?instId=${encodeURIComponent(symbol)}`;
    let price = 0;
    let available = new Decimal(0);
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const data = (await resp.json()) as {
          data?: Array<{ askPx?: string; bidPx?: string; askSz?: string; bidSz?: string }>;
        };
        const ticker = data.data?.[0];
        if (ticker) {
          price = side === 'buy' ? parseFloat(ticker.askPx ?? '0') : parseFloat(ticker.bidPx ?? '0');
          available = new Decimal(side === 'buy' ? ticker.askSz ?? '0' : ticker.bidSz ?? '0');
        }
      }
    } catch {
      // ignore
    }
    return { venue: this.name, symbol, side, price, available, estCostPct: ROUND_TRIP_FEE_PCT };
  }

  async place(_args: PlaceHedgeArgs): Promise<{ ok: HedgeFillEvent } | { err: string }> {
    return { err: 'OKX execution not implemented (scaffold only)' };
  }
}

export const okxConnector = new OKXConnector();
