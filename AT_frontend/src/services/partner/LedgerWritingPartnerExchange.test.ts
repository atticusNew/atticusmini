import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from 'decimal.js';
import { MockPartnerExchangeAdapter } from './MockPartnerExchangeAdapter';
import { LedgerWritingPartnerExchange } from './LedgerWritingPartnerExchange';
import { InMemoryLedgerStore, LedgerService } from '../ledger/LedgerService';

const wired = () => {
  const inner = new MockPartnerExchangeAdapter();
  const ledger = new LedgerService(new InMemoryLedgerStore());
  const adapter = new LedgerWritingPartnerExchange(inner, ledger);
  return { adapter, ledger };
};

test('placeTicket writes premium_debit', async () => {
  const { adapter, ledger } = wired();
  const r = await adapter.placeTicket({
    userId: 'u1',
    optionType: 'call',
    strikeOffsetUSD: 5,
    tenor: '1m',
    contracts: 2,
    entryPriceUSD: new Decimal(60_000),
    strikePriceUSD: new Decimal(60_005),
    premiumUSD: new Decimal(2),
    idempotencyKey: 'p1',
  });
  assert.ok('ok' in r);
  const bal = await ledger.traderBalance('u1');
  assert.equal(bal.toString(), '-2');
});

test('settleTicket on a win writes payout_credit', async () => {
  const { adapter, ledger } = wired();
  const placed = await adapter.placeTicket({
    userId: 'u2',
    optionType: 'call',
    strikeOffsetUSD: 5,
    tenor: '1m',
    contracts: 1,
    entryPriceUSD: new Decimal(60_000),
    strikePriceUSD: new Decimal(60_005),
    premiumUSD: new Decimal(1),
    idempotencyKey: 'p2',
  });
  if (!('ok' in placed)) throw new Error('place failed');
  await adapter.settleTicket({
    ticketId: placed.ok.id,
    outcome: 'win',
    payoutUSD: new Decimal(3),
    profitUSD: new Decimal(2),
    finalPriceUSD: new Decimal(60_010),
    idempotencyKey: 's2',
  });
  const bal = await ledger.traderBalance('u2');
  assert.equal(bal.toString(), '2'); // -1 premium + 3 payout
});

test('cancelTicket writes sellback_refund_credit', async () => {
  const { adapter, ledger } = wired();
  const placed = await adapter.placeTicket({
    userId: 'u3',
    optionType: 'put',
    strikeOffsetUSD: 5,
    tenor: '5m',
    contracts: 4,
    entryPriceUSD: new Decimal(60_000),
    strikePriceUSD: new Decimal(59_995),
    premiumUSD: new Decimal(4),
    idempotencyKey: 'p3',
  });
  if (!('ok' in placed)) throw new Error('place failed');
  await adapter.cancelTicket({
    ticketId: placed.ok.id,
    reason: 'user_sellback',
    refundUSD: new Decimal(2.75),
    idempotencyKey: 'c3',
  });
  const bal = await ledger.traderBalance('u3');
  assert.equal(bal.toString(), '-1.25'); // -4 premium + 2.75 refund
});

test('reconcile rows agree with realized balance', async () => {
  const { adapter, ledger } = wired();
  const placed = await adapter.placeTicket({
    userId: 'u4',
    optionType: 'call',
    strikeOffsetUSD: 5,
    tenor: '1m',
    contracts: 1,
    entryPriceUSD: new Decimal(60_000),
    strikePriceUSD: new Decimal(60_005),
    premiumUSD: new Decimal(1),
    idempotencyKey: 'p4',
  });
  if (!('ok' in placed)) throw new Error('place failed');
  await adapter.settleTicket({
    ticketId: placed.ok.id,
    outcome: 'win',
    payoutUSD: new Decimal(2.5),
    profitUSD: new Decimal(1.5),
    finalPriceUSD: new Decimal(60_010),
    idempotencyKey: 's4',
  });
  const window = { fromTs: 0, toTs: Date.now() + 60_000 };
  const { rows } = await ledger.buildPartnerReconcile(window);
  const row = rows.find(r => r.partnerUserId === 'u4')!;
  assert.equal(row.netUSD, '1.50');
});
