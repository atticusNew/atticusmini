import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from 'decimal.js';
import { MockPartnerExchangeAdapter } from './MockPartnerExchangeAdapter';

test('getSession returns demo session and seeds the user', async () => {
  const a = new MockPartnerExchangeAdapter();
  const s = await a.getSession();
  assert.ok(s);
  const b = await a.getBalance(s!.partnerUserId);
  assert.ok(b.availableUSD.greaterThan(0));
});

test('placeTicket reserves premium and returns the ticket', async () => {
  const a = new MockPartnerExchangeAdapter();
  const userId = 'u1';
  const before = (await a.getBalance(userId)).availableUSD.toNumber();
  const r = await a.placeTicket({
    userId,
    optionType: 'call',
    strikeOffsetUSD: 5,
    tenor: '1m',
    contracts: 4,
    entryPriceUSD: new Decimal(60_000),
    strikePriceUSD: new Decimal(60_005),
    premiumUSD: new Decimal(4),
    idempotencyKey: 'k1',
  });
  assert.ok('ok' in r);
  const after = await a.getBalance(userId);
  assert.equal(before - after.availableUSD.toNumber(), 4);
  assert.equal(after.reservedUSD.toNumber(), 4);
});

test('placeTicket is idempotent on the same key', async () => {
  const a = new MockPartnerExchangeAdapter();
  const args = {
    userId: 'u2',
    optionType: 'put' as const,
    strikeOffsetUSD: 10,
    tenor: '5m',
    contracts: 2,
    entryPriceUSD: new Decimal(60_000),
    strikePriceUSD: new Decimal(59_990),
    premiumUSD: new Decimal(2),
    idempotencyKey: 'kdup',
  };
  const r1 = await a.placeTicket(args);
  const r2 = await a.placeTicket(args);
  assert.ok('ok' in r1 && 'ok' in r2);
  assert.equal(r1.ok.id, r2.ok.id);
  const bal = await a.getBalance('u2');
  assert.equal(bal.availableUSD.toNumber(), 9_998);
});

test('settleTicket on a win moves money from reserved to available + payout', async () => {
  const a = new MockPartnerExchangeAdapter();
  const placed = await a.placeTicket({
    userId: 'u3',
    optionType: 'call',
    strikeOffsetUSD: 5,
    tenor: '30s',
    contracts: 1,
    entryPriceUSD: new Decimal(60_000),
    strikePriceUSD: new Decimal(60_005),
    premiumUSD: new Decimal(1),
    idempotencyKey: 'kp3',
  });
  if (!('ok' in placed)) throw new Error('placement failed');
  const beforeAvail = (await a.getBalance('u3')).availableUSD.toNumber();
  const r = await a.settleTicket({
    ticketId: placed.ok.id,
    outcome: 'win',
    payoutUSD: new Decimal(2),
    profitUSD: new Decimal(1),
    finalPriceUSD: new Decimal(60_010),
    idempotencyKey: 'ks3',
  });
  assert.ok('ok' in r);
  const after = await a.getBalance('u3');
  assert.equal(after.reservedUSD.toNumber(), 0);
  assert.equal(after.availableUSD.toNumber(), beforeAvail + 2);
});

test('settleTicket is idempotent', async () => {
  const a = new MockPartnerExchangeAdapter();
  const placed = await a.placeTicket({
    userId: 'u4',
    optionType: 'call',
    strikeOffsetUSD: 5,
    tenor: '30s',
    contracts: 1,
    entryPriceUSD: new Decimal(60_000),
    strikePriceUSD: new Decimal(60_005),
    premiumUSD: new Decimal(1),
    idempotencyKey: 'kp4',
  });
  if (!('ok' in placed)) throw new Error('placement failed');
  await a.settleTicket({
    ticketId: placed.ok.id,
    outcome: 'win',
    payoutUSD: new Decimal(3),
    profitUSD: new Decimal(2),
    finalPriceUSD: new Decimal(60_010),
    idempotencyKey: 'ks4',
  });
  const mid = (await a.getBalance('u4')).availableUSD.toNumber();
  await a.settleTicket({
    ticketId: placed.ok.id,
    outcome: 'win',
    payoutUSD: new Decimal(3),
    profitUSD: new Decimal(2),
    finalPriceUSD: new Decimal(60_010),
    idempotencyKey: 'ks4-again',
  });
  const after = (await a.getBalance('u4')).availableUSD.toNumber();
  assert.equal(mid, after, 'duplicate settle must not double-credit');
});

test('cancelTicket refunds, only on active tickets', async () => {
  const a = new MockPartnerExchangeAdapter();
  const placed = await a.placeTicket({
    userId: 'u5',
    optionType: 'put',
    strikeOffsetUSD: 5,
    tenor: '5m',
    contracts: 5,
    entryPriceUSD: new Decimal(60_000),
    strikePriceUSD: new Decimal(59_995),
    premiumUSD: new Decimal(5),
    idempotencyKey: 'kp5',
  });
  if (!('ok' in placed)) throw new Error('placement failed');
  const beforeCancel = (await a.getBalance('u5')).availableUSD.toNumber();
  const r = await a.cancelTicket({
    ticketId: placed.ok.id,
    reason: 'user_sellback',
    refundUSD: new Decimal(3.5),
    idempotencyKey: 'kc5',
  });
  assert.ok('ok' in r);
  const after = await a.getBalance('u5');
  assert.equal(after.availableUSD.toNumber(), beforeCancel + 3.5);
  assert.equal(after.reservedUSD.toNumber(), 0);

  const second = await a.cancelTicket({
    ticketId: placed.ok.id,
    reason: 'user_sellback',
    refundUSD: new Decimal(3.5),
    idempotencyKey: 'kc5-2',
  });
  assert.ok('err' in second);
});

test('insufficient balance is rejected without state change', async () => {
  const a = new MockPartnerExchangeAdapter();
  const r = await a.placeTicket({
    userId: 'u6',
    optionType: 'call',
    strikeOffsetUSD: 5,
    tenor: '30s',
    contracts: 1,
    entryPriceUSD: new Decimal(60_000),
    strikePriceUSD: new Decimal(60_005),
    premiumUSD: new Decimal(1_000_000),
    idempotencyKey: 'kbad',
  });
  assert.ok('err' in r);
  const bal = await a.getBalance('u6');
  assert.equal(bal.reservedUSD.toNumber(), 0);
});

test('getUserTickets returns newest first', async () => {
  const a = new MockPartnerExchangeAdapter();
  for (const k of ['a', 'b', 'c']) {
    await a.placeTicket({
      userId: 'u7',
      optionType: 'call',
      strikeOffsetUSD: 5,
      tenor: '30s',
      contracts: 1,
      entryPriceUSD: new Decimal(60_000),
      strikePriceUSD: new Decimal(60_005),
      premiumUSD: new Decimal(1),
      idempotencyKey: `u7-${k}`,
    });
  }
  const tickets = await a.getUserTickets('u7');
  assert.equal(tickets.length, 3);
  assert.ok(tickets[0]!.openedAt >= tickets[1]!.openedAt);
});
