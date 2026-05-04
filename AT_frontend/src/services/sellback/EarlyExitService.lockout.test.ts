/**
 * EarlyExitService — secondsUntilLockout contract.
 *
 * Sell-back UI surfaces a "locks in Ns" hint so traders aren't surprised
 * when the button disappears. We assert the boundary cases: fresh
 * tickets show the full safe window, the warn-zone (<=10s) is hit
 * before lockout, and tickets already in the lockout report negative.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from 'decimal.js';
import { EarlyExitService } from './EarlyExitService';
import { setPartnerExchange, MockPartnerExchangeAdapter } from '../partner';

const seedAdapter = () => {
  const adapter = new MockPartnerExchangeAdapter();
  setPartnerExchange(adapter);
  return adapter;
};

const placeTicket = async (adapter: MockPartnerExchangeAdapter, tenor: string) => {
  const r = await adapter.placeTicket({
    userId: 'u-lockout',
    optionType: 'call',
    strikeOffsetUSD: 25,
    tenor,
    contracts: 1,
    entryPriceUSD: new Decimal(70_000),
    strikePriceUSD: new Decimal(70_025),
    premiumUSD: new Decimal(1),
    idempotencyKey: `place-${tenor}-${Date.now()}-${Math.random()}`,
  });
  if (!('ok' in r)) throw new Error('place failed');
  return r.ok;
};

test('1m ticket fresh: secondsUntilLockout is full window minus lockout (5s)', async () => {
  const adapter = seedAdapter();
  const t = await placeTicket(adapter, '1m');
  const ee = new EarlyExitService();
  const q = ee.quote(t, 70_000, t.openedAt);
  assert.equal(q.available, true);
  assert.equal(q.secondsUntilLockout, 60 - 5);
});

test('2m ticket 10s in: 110s remaining, 102s until lockout (8s lockout)', async () => {
  const adapter = seedAdapter();
  const t = await placeTicket(adapter, '2m');
  const ee = new EarlyExitService();
  const now = t.openedAt + 10_000;
  const q = ee.quote(t, 70_000, now);
  assert.equal(q.secondsRemaining, 110);
  assert.equal(q.secondsUntilLockout, 110 - 8);
});

test('3m ticket halfway through: 90s remaining, 80s until lockout (10s lockout)', async () => {
  const adapter = seedAdapter();
  const t = await placeTicket(adapter, '3m');
  const ee = new EarlyExitService();
  const now = t.openedAt + 90_000;
  const q = ee.quote(t, 70_000, now);
  assert.equal(q.secondsRemaining, 90);
  assert.equal(q.secondsUntilLockout, 90 - 10);
});

test('inside lockout window the quote is unavailable and secondsUntilLockout is 0 or negative', async () => {
  const adapter = seedAdapter();
  const t = await placeTicket(adapter, '2m');
  const ee = new EarlyExitService();
  // 2m tenor, 8s lockout. Jump to t = (120 - 5)s.
  const now = t.openedAt + (2 * 60 - 5) * 1000;
  const q = ee.quote(t, 70_000, now);
  assert.equal(q.available, false);
  assert.match(q.reason ?? '', /locked out/);
  assert.ok(q.secondsUntilLockout <= 0);
});

test('non-active ticket reports secondsUntilLockout = 0 and is unavailable', async () => {
  const adapter = seedAdapter();
  const t = await placeTicket(adapter, '1m');
  const ee = new EarlyExitService();
  const q = ee.quote({ ...t, status: 'settled' }, 70_000);
  assert.equal(q.available, false);
  assert.equal(q.secondsUntilLockout, 0);
});

test('legacy 5s tenor surfaces secondsUntilLockout = 0 and is unavailable', async () => {
  const adapter = seedAdapter();
  const t = await placeTicket(adapter, '5s');
  const ee = new EarlyExitService();
  const q = ee.quote(t, 70_000, t.openedAt);
  assert.equal(q.available, false);
  assert.equal(q.secondsUntilLockout, 0);
});
