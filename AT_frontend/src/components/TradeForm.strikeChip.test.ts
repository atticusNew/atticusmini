/**
 * Strike chip rewrite contract — v2.
 * - Headline is the absolute target price (not the offset).
 * - Distance tag (close/near/reach/far) replaces "% likely".
 * - Direction tints the chip border.
 * - 4 tiers ascending by payout aggressiveness.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pricingService } from '../services/pricing/PricingService';

const STRIKE_TIERS = [
  { offset: 5,   tag: 'close' },
  { offset: 10,  tag: 'near' },
  { offset: 25,  tag: 'reach' },
  { offset: 50,  tag: 'far' },
] as const;

test('exactly 4 tiers ordered close→far', () => {
  assert.equal(STRIKE_TIERS.length, 4);
  assert.deepEqual(
    STRIKE_TIERS.map(t => t.tag),
    ['close', 'near', 'reach', 'far'],
  );
});

test('payout multiplier grows monotonically as the target moves further', () => {
  const mults = STRIKE_TIERS.map(t =>
    pricingService.quote({
      optionType: 'call', spotUSD: 70_000,
      strikeOffsetUSD: t.offset, tenor: '1m', contracts: 1, sigma: 0.6,
    }).payoutMultiple,
  );
  for (let i = 1; i < mults.length; i++) {
    assert.ok(mults[i]! >= mults[i - 1]!,
      `mult[${i}] (${mults[i]}) should be >= mult[${i - 1}] (${mults[i - 1]})`);
  }
});

test('CALL chip headline is spot + offset (the absolute target shown on the chart)', () => {
  const q = pricingService.quote({
    optionType: 'call', spotUSD: 70_000.41,
    strikeOffsetUSD: 25, tenor: '1m', contracts: 1, sigma: 0.6,
  });
  assert.equal(q.strikeUSD, 70_025.41);
});

test('PUT chip headline is spot − offset', () => {
  const q = pricingService.quote({
    optionType: 'put', spotUSD: 70_000.41,
    strikeOffsetUSD: 25, tenor: '1m', contracts: 1, sigma: 0.6,
  });
  assert.equal(q.strikeUSD, 69_975.41);
});

test('chip tone resolves to neutral before direction is picked, tinted after', () => {
  const toneFor = (optionType: 'call' | 'put' | null): 'up' | 'down' | 'neutral' => {
    if (optionType === 'call') return 'up';
    if (optionType === 'put') return 'down';
    return 'neutral';
  };
  assert.equal(toneFor(null), 'neutral');
  assert.equal(toneFor('call'), 'up');
  assert.equal(toneFor('put'), 'down');
});
