import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mockPartnerExchange } from './MockPartnerExchange';

test('ensureUser is idempotent and returns starting balance', async () => {
  const a = await mockPartnerExchange.ensureUser('test-user-1');
  const b = await mockPartnerExchange.ensureUser('test-user-1');
  assert.equal(a.id, b.id);
  assert.equal(a.balanceUSD.toString(), b.balanceUSD.toString());
  assert.ok(a.balanceUSD.greaterThan(0));
});

test('placeTrade debits premium and creates an active position', async () => {
  const userId = 'test-user-2';
  const before = (await mockPartnerExchange.ensureUser(userId)).balanceUSD.toNumber();
  const result = await mockPartnerExchange.placeTrade({
    userId,
    optionType: 'call',
    strikeOffset: 5,
    expiry: '1m',
    contracts: 3,
    entryPriceCents: 6_000_000,
    strikePriceCents: 6_000_500,
  });
  assert.ok('ok' in result);
  const after = (await mockPartnerExchange.getUser(userId))!.balanceUSD.toNumber();
  assert.equal(before - after, 3);
});

test('recordSettlement credits payout on win and is idempotent', async () => {
  const userId = 'test-user-3';
  await mockPartnerExchange.ensureUser(userId);
  const placed = await mockPartnerExchange.placeTrade({
    userId,
    optionType: 'put',
    strikeOffset: 10,
    expiry: '5m',
    contracts: 2,
    entryPriceCents: 6_000_000,
    strikePriceCents: 5_999_000,
  });
  if (!('ok' in placed)) throw new Error('placeTrade failed');
  const balanceAfterTrade = (await mockPartnerExchange.getUser(userId))!.balanceUSD.toNumber();

  const settle = await mockPartnerExchange.recordSettlement({
    positionId: placed.ok,
    outcome: 'win',
    payoutCents: 1000,
    profitCents: 800,
    finalPriceCents: 5_990_000,
  });
  assert.ok('ok' in settle);
  const after = (await mockPartnerExchange.getUser(userId))!.balanceUSD.toNumber();
  assert.equal(after - balanceAfterTrade, 10);

  const second = await mockPartnerExchange.recordSettlement({
    positionId: placed.ok,
    outcome: 'win',
    payoutCents: 1000,
    profitCents: 800,
    finalPriceCents: 5_990_000,
  });
  assert.ok('ok' in second);
  const final = (await mockPartnerExchange.getUser(userId))!.balanceUSD.toNumber();
  assert.equal(final, after, 'second settlement should not double-credit');
});

test('recordSettlement on a loss leaves balance unchanged from post-trade state', async () => {
  const userId = 'test-user-4';
  await mockPartnerExchange.ensureUser(userId);
  const placed = await mockPartnerExchange.placeTrade({
    userId,
    optionType: 'call',
    strikeOffset: 5,
    expiry: '30s',
    contracts: 1,
    entryPriceCents: 6_000_000,
    strikePriceCents: 6_000_500,
  });
  if (!('ok' in placed)) throw new Error('placeTrade failed');
  const beforeSettle = (await mockPartnerExchange.getUser(userId))!.balanceUSD.toNumber();
  const r = await mockPartnerExchange.recordSettlement({
    positionId: placed.ok,
    outcome: 'loss',
    payoutCents: 0,
    profitCents: 0,
    finalPriceCents: 6_000_000,
  });
  assert.ok('ok' in r);
  const afterSettle = (await mockPartnerExchange.getUser(userId))!.balanceUSD.toNumber();
  assert.equal(beforeSettle, afterSettle);
});

test('insufficient balance is rejected', async () => {
  const userId = 'test-user-5';
  await mockPartnerExchange.ensureUser(userId);
  const r = await mockPartnerExchange.placeTrade({
    userId,
    optionType: 'call',
    strikeOffset: 5,
    expiry: '1m',
    contracts: 1_000_000,
    entryPriceCents: 6_000_000,
    strikePriceCents: 6_000_500,
  });
  assert.ok('err' in r);
});
