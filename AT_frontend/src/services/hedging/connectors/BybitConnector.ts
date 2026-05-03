/**
 * BybitConnector — read-only quote + paper-mode `place`.
 *
 * Real REST/WS integration lands when API keys are wired. The current
 * implementation pulls best bid/ask from Bybit's public REST endpoint for
 * BTCUSDT linear perp; `place` simulates a fill at the latest quote.
 */

import { Decimal } from 'decimal.js';
import type { HedgeFillEvent, PlaceHedgeArgs, VenueConnector, VenueQuote } from '../types';

const BASE_URL = 'https://api.bybit.com';
const ROUND_TRIP_FEE_PCT = 0.0011; // 0.055% taker × 2

export class BybitConnector implements VenueConnector {
  readonly name = 'bybit';
  readonly defaultSymbol = 'BTCUSDT';

  async quote(symbol: string, side: 'buy' | 'sell', baseQty: Decimal): Promise<VenueQuote> {
    const url = `${BASE_URL}/v5/market/tickers?category=linear&symbol=${encodeURIComponent(symbol)}`;
    let price = 0;
    let available = new Decimal(0);
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const data = (await resp.json()) as {
          result?: { list?: Array<{ bid1Price?: string; ask1Price?: string; bid1Size?: string; ask1Size?: string }> };
        };
        const ticker = data.result?.list?.[0];
        if (ticker) {
          price = side === 'buy'
            ? parseFloat(ticker.ask1Price ?? '0')
            : parseFloat(ticker.bid1Price ?? '0');
          available = new Decimal(side === 'buy' ? ticker.ask1Size ?? '0' : ticker.bid1Size ?? '0');
        }
      }
    } catch {
      // network errors leave price at 0; caller's circuit breaker handles it
    }
    return {
      venue: this.name,
      symbol,
      side,
      price,
      available,
      estCostPct: ROUND_TRIP_FEE_PCT,
    };
  }

  async place(args: PlaceHedgeArgs): Promise<{ ok: HedgeFillEvent } | { err: string }> {
    const q = await this.quote(args.symbol, args.side, args.baseQty);
    if (!q.price || q.price <= 0) return { err: 'no quote available' };
    const quoteUSD = args.baseQty.mul(q.price);
    const fees = quoteUSD.mul(ROUND_TRIP_FEE_PCT / 2);
    return {
      ok: {
        venue: this.name,
        symbol: args.symbol,
        side: args.side,
        baseQty: args.baseQty,
        quoteUSD,
        feesUSD: fees,
        bucketStartedAt: args.bucketStartedAt,
        bucketEndedAt: args.bucketEndedAt,
        venueOrderRef: `paper-${this.name}-${Date.now()}`,
        idempotencyKey: args.idempotencyKey,
      },
    };
  }
}

export const bybitConnector = new BybitConnector();
