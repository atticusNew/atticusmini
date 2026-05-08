/**
 * REST price-source adapters used as fallback when the live WebSocket feed
 * is unavailable (Coinbase Exchange occasionally goes into maintenance and
 * returns 503 on both REST and WS — that takes the whole demo down unless
 * we can roll to a different venue).
 *
 * Each source returns `null` instead of throwing so the orchestrator can
 * fall through to the next one cleanly.
 */

export interface PriceTick {
  price: number;
  source: string;
  high24h: number;
  low24h: number;
}

const TIMEOUT_MS = 2_500;

const fetchJson = async (url: string): Promise<unknown> => {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const t = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : null;
  try {
    const r = await fetch(url, { ...(ctrl ? { signal: ctrl.signal } : {}) });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    if (t) clearTimeout(t);
  }
};

interface CoinbaseTickerResp {
  price?: string;
}

interface KrakenTickerResp {
  result?: Record<string, { c?: [string, string]; h?: [string, string]; l?: [string, string] }>;
  error?: unknown[];
}

interface BinanceUsTickerResp {
  lastPrice?: string;
  highPrice?: string;
  lowPrice?: string;
}

export const fetchCoinbaseExchange = async (): Promise<PriceTick | null> => {
  const j = (await fetchJson('https://api.exchange.coinbase.com/products/BTC-USD/ticker')) as CoinbaseTickerResp | null;
  if (!j?.price) return null;
  const p = parseFloat(j.price);
  if (!isFinite(p) || p <= 0) return null;
  return { price: p, source: 'coinbase_rest', high24h: p, low24h: p };
};

export const fetchKraken = async (): Promise<PriceTick | null> => {
  const j = (await fetchJson('https://api.kraken.com/0/public/Ticker?pair=XBTUSD')) as KrakenTickerResp | null;
  const t = j?.result?.XXBTZUSD;
  if (!t?.c?.[0]) return null;
  const last = parseFloat(t.c[0]);
  const high = parseFloat(t.h?.[1] ?? t.h?.[0] ?? t.c[0]);
  const low = parseFloat(t.l?.[1] ?? t.l?.[0] ?? t.c[0]);
  if (!isFinite(last) || last <= 0) return null;
  return { price: last, source: 'kraken_rest', high24h: high, low24h: low };
};

export const fetchBinanceUs = async (): Promise<PriceTick | null> => {
  const j = (await fetchJson('https://api.binance.us/api/v3/ticker/24hr?symbol=BTCUSDT')) as BinanceUsTickerResp | null;
  if (!j?.lastPrice) return null;
  const p = parseFloat(j.lastPrice);
  if (!isFinite(p) || p <= 0) return null;
  return {
    price: p,
    source: 'binance_us_rest',
    high24h: parseFloat(j.highPrice ?? j.lastPrice),
    low24h: parseFloat(j.lowPrice ?? j.lastPrice),
  };
};

export type RestSource = () => Promise<PriceTick | null>;

export const REST_SOURCES: RestSource[] = [fetchCoinbaseExchange, fetchKraken, fetchBinanceUs];

/**
 * Try each source in order; return the first one that yields a tick.
 * Used by the polling supervisor in OffChainPricingEngine.
 */
export const fetchFirstAvailable = async (sources: RestSource[] = REST_SOURCES): Promise<PriceTick | null> => {
  for (const src of sources) {
    const tick = await src();
    if (tick) return tick;
  }
  return null;
};
