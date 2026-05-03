import { test } from 'node:test';
import assert from 'node:assert/strict';

// Replicate the strike resolver locally so we can test it without
// rendering recharts (jsdom-free). Should match PriceChart.tsx behavior.
const computeStrike = (
  entryPrice: number | undefined,
  spot: number,
  optionType: 'call' | 'put' | null | undefined,
  offset: number,
): number | null => {
  if (!optionType || !offset || offset <= 0) return null;
  const base = entryPrice && entryPrice > 0 ? entryPrice : spot;
  if (!base) return null;
  return optionType === 'call' ? base + offset : base - offset;
};

test('strike anchors to entry price during an active trade', () => {
  assert.equal(computeStrike(60_000, 60_500, 'call', 25), 60_025);
  assert.equal(computeStrike(60_000, 60_500, 'put', 25), 59_975);
});

test('strike anchors to live spot before a trade is open', () => {
  assert.equal(computeStrike(undefined, 60_000, 'call', 50), 60_050);
  assert.equal(computeStrike(undefined, 60_000, 'put', 50), 59_950);
});

test('strike returns null when direction is missing', () => {
  assert.equal(computeStrike(60_000, 60_000, null, 25), null);
  assert.equal(computeStrike(60_000, 60_000, undefined, 25), null);
});

test('strike returns null with non-positive offset', () => {
  assert.equal(computeStrike(60_000, 60_000, 'call', 0), null);
  assert.equal(computeStrike(60_000, 60_000, 'call', -5), null);
});

test('strike returns null when there is no spot and no entry', () => {
  assert.equal(computeStrike(undefined, 0, 'call', 25), null);
});
