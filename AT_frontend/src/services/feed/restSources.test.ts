import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchCoinbaseExchange,
  fetchKraken,
  fetchBinanceUs,
  fetchFirstAvailable,
  type RestSource,
} from './restSources';

const realFetch = globalThis.fetch;

const stubFetch = (
  responder: (url: string) => { ok: boolean; status?: number; body?: unknown },
) => {
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const r = responder(url);
    return {
      ok: r.ok,
      status: r.status ?? (r.ok ? 200 : 503),
      json: async () => r.body,
    } as unknown as Response;
  }) as typeof fetch;
};

beforeEach(() => {
  globalThis.fetch = realFetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

test('fetchCoinbaseExchange parses a valid ticker', async () => {
  stubFetch(() => ({ ok: true, body: { price: '79543.5' } }));
  const t = await fetchCoinbaseExchange();
  assert.equal(t?.price, 79543.5);
  assert.equal(t?.source, 'coinbase_rest');
});

test('fetchCoinbaseExchange returns null on 503', async () => {
  stubFetch(() => ({ ok: false, status: 503 }));
  assert.equal(await fetchCoinbaseExchange(), null);
});

test('fetchKraken pulls XXBTZUSD last/high/low', async () => {
  stubFetch(() => ({
    ok: true,
    body: {
      result: {
        XXBTZUSD: {
          c: ['79543.5', '0.001'],
          h: ['80113.1', '81705.0'],
          l: ['79310.7', '79310.7'],
        },
      },
    },
  }));
  const t = await fetchKraken();
  assert.equal(t?.price, 79543.5);
  // Kraken's [today, last24h] tuple — we prefer [1] (24h) when present.
  assert.equal(t?.high24h, 81705);
  assert.equal(t?.low24h, 79310.7);
});

test('fetchKraken returns null when result is empty', async () => {
  stubFetch(() => ({ ok: true, body: { result: {}, error: [] } }));
  assert.equal(await fetchKraken(), null);
});

test('fetchBinanceUs parses lastPrice + 24h high/low', async () => {
  stubFetch(() => ({
    ok: true,
    body: { lastPrice: '79572.4', highPrice: '80100.0', lowPrice: '79100.0' },
  }));
  const t = await fetchBinanceUs();
  assert.equal(t?.price, 79572.4);
  assert.equal(t?.high24h, 80100);
  assert.equal(t?.low24h, 79100);
  assert.equal(t?.source, 'binance_us_rest');
});

test('fetchFirstAvailable falls through failures to the next source', async () => {
  let calls: string[] = [];
  const fail: RestSource = async () => { calls.push('fail'); return null; };
  const ok: RestSource = async () => { calls.push('ok'); return { price: 1, source: 's', high24h: 1, low24h: 1 }; };
  const t = await fetchFirstAvailable([fail, fail, ok]);
  assert.equal(t?.price, 1);
  assert.deepEqual(calls, ['fail', 'fail', 'ok']);
});

test('fetchFirstAvailable returns null when all sources fail', async () => {
  const fail: RestSource = async () => null;
  assert.equal(await fetchFirstAvailable([fail, fail]), null);
});
