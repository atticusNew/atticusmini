import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from 'decimal.js';
import { MockPartnerExchangeAdapter } from './MockPartnerExchangeAdapter';

test('reset wipes users, tickets, and the next-id counter', async () => {
  const a = new MockPartnerExchangeAdapter();
  await a.placeTicket({
    userId: 'u',
    optionType: 'call',
    strikeOffsetUSD: 5,
    tenor: '1m',
    contracts: 1,
    entryPriceUSD: new Decimal(60_000),
    strikePriceUSD: new Decimal(60_005),
    premiumUSD: new Decimal(1),
    idempotencyKey: 'k1',
  });
  assert.equal((await a.getUserTickets('u')).length, 1);

  a.reset();
  assert.equal((await a.getUserTickets('u')).length, 0);

  const placed = await a.placeTicket({
    userId: 'u',
    optionType: 'call',
    strikeOffsetUSD: 5,
    tenor: '1m',
    contracts: 1,
    entryPriceUSD: new Decimal(60_000),
    strikePriceUSD: new Decimal(60_005),
    premiumUSD: new Decimal(1),
    idempotencyKey: 'k1',
  });
  assert.ok('ok' in placed);
  assert.equal(placed.ok.id, 1, 'next ticket id resets to 1');
});
