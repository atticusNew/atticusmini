import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from 'decimal.js';
import { EarlyExitService } from './EarlyExitService';
import { setPartnerExchange, MockPartnerExchangeAdapter } from '../partner';
import { LedgerWritingPartnerExchange } from '../partner/LedgerWritingPartnerExchange';
import { InMemoryLedgerStore, LedgerService } from '../ledger/LedgerService';

const seedAdapter = () => {
  const inner = new MockPartnerExchangeAdapter();
  const ledger = new LedgerService(new InMemoryLedgerStore());
  const adapter = new LedgerWritingPartnerExchange(inner, ledger);
  setPartnerExchange(adapter);
  return { adapter, ledger };
};

const placeTicket = async (adapter: LedgerWritingPartnerExchange) => {
  const r = await adapter.placeTicket({
    userId: 'u-test',
    optionType: 'call',
    strikeOffsetUSD: 5,
    tenor: '2m',
    contracts: 1,
    entryPriceUSD: new Decimal(60_000),
    strikePriceUSD: new Decimal(60_005),
    premiumUSD: new Decimal(1),
    idempotencyKey: 'p-test',
  });
  if (!('ok' in r)) throw new Error('place failed');
  return r.ok;
};

test('quote returns unavailable for non-active ticket', async () => {
  const { adapter } = seedAdapter();
  const ticket = await placeTicket(adapter);
  const ee = new EarlyExitService();
  const q = ee.quote({ ...ticket, status: 'settled' }, 60_000);
  assert.equal(q.available, false);
  assert.match(q.reason ?? '', /not active/);
});

test('quote returns unavailable for legacy tenor', async () => {
  const { adapter } = seedAdapter();
  const ticket = await placeTicket(adapter);
  const ee = new EarlyExitService();
  const q = ee.quote({ ...ticket, tenor: '5s' }, 60_000);
  assert.equal(q.available, false);
  assert.match(q.reason ?? '', /legacy tenor/);
});

test('quote returns unavailable in lockout window', async () => {
  const { adapter } = seedAdapter();
  const ticket = await placeTicket(adapter);
  const ee = new EarlyExitService();
  // 2m tenor has an 8s lockout in v5; jump to t=tenor−5s (inside it).
  const tenorSec = 2 * 60;
  const lateOpenedAt = Date.now() - (tenorSec - 5) * 1000;
  const q = ee.quote({ ...ticket, openedAt: lateOpenedAt }, 60_000);
  assert.equal(q.available, false);
  assert.match(q.reason ?? '', /locked out/);
});

test('quote on a fresh active ticket returns a positive refund', async () => {
  const { adapter } = seedAdapter();
  const ticket = await placeTicket(adapter);
  const ee = new EarlyExitService();
  const q = ee.quote(ticket, 60_005);
  assert.equal(q.available, true);
  assert.ok(q.refundUSD.greaterThan(0));
});

test('sell() cancels the ticket and credits the refund via the ledger', async () => {
  const { adapter, ledger } = seedAdapter();
  const ticket = await placeTicket(adapter);
  const ee = new EarlyExitService();
  const r = await ee.sell({
    ticketId: ticket.id,
    spotUSD: 60_010,
    idempotencyKey: 's-test',
  });
  assert.ok('ok' in r);
  const closed = await adapter.getTicket(ticket.id);
  assert.equal(closed?.status, 'cancelled');
  const balance = await ledger.traderBalance('u-test');
  assert.ok(balance.greaterThan(new Decimal(-1)), 'refund should partially offset premium');
});

test('sell() in lockout window is rejected without state change', async () => {
  const { adapter } = seedAdapter();
  const ticket = await placeTicket(adapter);
  const tenorSec = 2 * 60;
  // Force lockout (8s on 2m tenor in v5) by mutating openedAt.
  const t = (await adapter.getTicket(ticket.id))!;
  t.openedAt = Date.now() - (tenorSec - 2) * 1000;

  const ee = new EarlyExitService();
  const r = await ee.sell({ ticketId: ticket.id, spotUSD: 60_010, idempotencyKey: 's-locked' });
  assert.ok('err' in r);
  const stillActive = await adapter.getTicket(ticket.id);
  assert.equal(stillActive?.status, 'active');
});
