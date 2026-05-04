/**
 * v5 tenor schedule contract — edge + lockout for the new ladder.
 *
 * - Edge schedule: 30s 10% / 1m 6% / 2m 4% / 3m 3% (steeper at the
 *   short end where adverse selection is worst).
 * - Lockout schedule: 30s 5s / 1m 5s / 2m 8s / 3m 10s (slightly more
 *   protection on longer tenors so traders can't time the ~95%-prob
 *   refund right at the boundary).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from 'decimal.js';
import { pricingService } from './PricingService';
import { EarlyExitService } from '../sellback/EarlyExitService';
import { setPartnerExchange, MockPartnerExchangeAdapter } from '../partner';

const baseQuote = (tenor: '30s' | '1m' | '2m' | '3m') =>
  pricingService.quote({
    optionType: 'call',
    spotUSD: 70_000,
    strikeOffsetUSD: 25,
    tenor,
    contracts: 1,
    sigma: 0.6,
  });

test('edge schedule is monotonically decreasing across the v5 ladder', () => {
  const e30 = baseQuote('30s').edgePct;
  const e60 = baseQuote('1m').edgePct;
  const e2m = baseQuote('2m').edgePct;
  const e3m = baseQuote('3m').edgePct;
  assert.ok(e30 > e60, `30s ${e30} should be > 1m ${e60}`);
  assert.ok(e60 > e2m, `1m ${e60} should be > 2m ${e2m}`);
  assert.ok(e2m > e3m, `2m ${e2m} should be > 3m ${e3m}`);
});

test('30s edge equals base 0.05 + tenor 0.10 = 0.15 at baseline vol', () => {
  const e = baseQuote('30s').edgePct;
  assert.ok(Math.abs(e - 0.15) < 1e-9, `expected 0.15, got ${e}`);
});

test('3m edge equals base 0.05 + tenor 0.03 = 0.08 at baseline vol', () => {
  const e = baseQuote('3m').edgePct;
  assert.ok(Math.abs(e - 0.08) < 1e-9, `expected 0.08, got ${e}`);
});

const placeForTenor = async (tenor: string) => {
  const adapter = new MockPartnerExchangeAdapter();
  setPartnerExchange(adapter);
  const r = await adapter.placeTicket({
    userId: 'u-v5', optionType: 'call', strikeOffsetUSD: 25,
    tenor, contracts: 1,
    entryPriceUSD: new Decimal(70_000),
    strikePriceUSD: new Decimal(70_025),
    premiumUSD: new Decimal(1),
    idempotencyKey: `v5-${tenor}-${Date.now()}-${Math.random()}`,
  });
  if (!('ok' in r)) throw new Error('place failed');
  return r.ok;
};

test('30s lockout is 5s — full safe window is 25s', async () => {
  const t = await placeForTenor('30s');
  const ee = new EarlyExitService();
  const q = ee.quote(t, 70_000, t.openedAt);
  assert.equal(q.secondsUntilLockout, 25);
});

test('1m lockout is 5s — full safe window is 55s', async () => {
  const t = await placeForTenor('1m');
  const ee = new EarlyExitService();
  const q = ee.quote(t, 70_000, t.openedAt);
  assert.equal(q.secondsUntilLockout, 55);
});

test('2m lockout is 8s — full safe window is 112s', async () => {
  const t = await placeForTenor('2m');
  const ee = new EarlyExitService();
  const q = ee.quote(t, 70_000, t.openedAt);
  assert.equal(q.secondsUntilLockout, 112);
});

test('3m lockout is 10s — full safe window is 170s', async () => {
  const t = await placeForTenor('3m');
  const ee = new EarlyExitService();
  const q = ee.quote(t, 70_000, t.openedAt);
  assert.equal(q.secondsUntilLockout, 170);
});
