import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pricingService } from '../services/pricing/PricingService';

// TradeForm contract tests: the form maps user choices directly into
// pricingService.quote(). We verify the mappings rather than render React
// (which keeps the test fast and free of jsdom).

test('quote for direction=call adds offset to spot for the strike', () => {
  const q = pricingService.quote({
    optionType: 'call',
    spotUSD: 60_000,
    strikeOffsetUSD: 25,
    tenor: '1m',
    contracts: 5,
  });
  assert.equal(q.strikeUSD, 60_025);
  assert.equal(q.premiumUSD.toString(), '5');
});

test('quote for direction=put subtracts offset from spot for the strike', () => {
  const q = pricingService.quote({
    optionType: 'put',
    spotUSD: 60_000,
    strikeOffsetUSD: 25,
    tenor: '1m',
    contracts: 5,
  });
  assert.equal(q.strikeUSD, 59_975);
});

test('payoutMultiple is bounded between 1.05x and 25x', () => {
  for (const offset of [5, 10, 25, 50]) {
    for (const tenor of ['30s', '1m', '2m', '3m'] as const) {
      const q = pricingService.quote({
        optionType: 'call',
        spotUSD: 60_000,
        strikeOffsetUSD: offset,
        tenor,
        contracts: 1,
        sigma: 0.6,
      });
      assert.ok(q.payoutMultiple >= 1.05, `${tenor}/${offset}: mult ${q.payoutMultiple}`);
      assert.ok(q.payoutMultiple <= 25, `${tenor}/${offset}: mult ${q.payoutMultiple}`);
    }
  }
});

test('digital probability is bounded in [0,1]', () => {
  for (const offset of [5, 25, 50]) {
    const q = pricingService.quote({
      optionType: 'call',
      spotUSD: 60_000,
      strikeOffsetUSD: offset,
      tenor: '2m',
      contracts: 1,
      sigma: 0.6,
    });
    assert.ok(q.digitalProb >= 0);
    assert.ok(q.digitalProb <= 1);
  }
});

test('potentialPayoutUSD scales linearly with stake', () => {
  const a = pricingService.quote({
    optionType: 'call',
    spotUSD: 60_000,
    strikeOffsetUSD: 5,
    tenor: '1m',
    contracts: 1,
    sigma: 0.6,
  });
  const b = pricingService.quote({
    optionType: 'call',
    spotUSD: 60_000,
    strikeOffsetUSD: 5,
    tenor: '1m',
    contracts: 10,
    sigma: 0.6,
  });
  assert.equal(b.potentialPayoutUSD.toNumber(), a.potentialPayoutUSD.toNumber() * 10);
});
