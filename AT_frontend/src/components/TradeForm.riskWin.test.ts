/**
 * Risk → Win panel contract — v2: hero "Win", small "Risk" subtitle,
 * no multiplier or arrow.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pricingService } from '../services/pricing/PricingService';

const formatUSD = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

test('panel reads "If you win $X" with the hero number from the quote', () => {
  const q = pricingService.quote({
    optionType: 'call', spotUSD: 70_000,
    strikeOffsetUSD: 25, tenor: '1m', contracts: 5, sigma: 0.6,
  });
  const heroLine = `If you win $${formatUSD(q.potentialPayoutUSD.toNumber())}`;
  assert.match(heroLine, /^If you win \$\d+\.\d{2}$/);
  assert.equal(q.premiumUSD.toNumber(), 5);
});

test('risk subtitle equals stake (premium per contract = $1, so n contracts = $n)', () => {
  for (const n of [1, 5, 25, 100]) {
    const q = pricingService.quote({
      optionType: 'put', spotUSD: 70_000,
      strikeOffsetUSD: 10, tenor: '5m', contracts: n, sigma: 0.6,
    });
    assert.equal(q.premiumUSD.toNumber(), n);
  }
});

test('win amount is risk × payout multiple', () => {
  const q = pricingService.quote({
    optionType: 'call', spotUSD: 70_000,
    strikeOffsetUSD: 25, tenor: '1m', contracts: 5, sigma: 0.6,
  });
  const expected = q.premiumUSD.toNumber() * q.payoutMultiple;
  assert.ok(Math.abs(q.potentialPayoutUSD.toNumber() - expected) < 1e-9);
});
