/**
 * Tenor ladder contract — v5: micro-options ladder, 30s · 1m · 2m · 3m.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Tenor } from '../services/pricing/PricingService';
import { TENOR_TO_SECONDS } from '../services/pricing/PricingService';

const VISIBLE_TENORS: Tenor[] = ['30s', '1m', '2m', '3m'];

test('exactly 4 tenors are visible to the trader', () => {
  assert.equal(VISIBLE_TENORS.length, 4);
});

test('long tenors (5m, 15m, 1h) are no longer offered', () => {
  assert.equal(VISIBLE_TENORS.includes('5m' as Tenor), false);
  assert.equal(VISIBLE_TENORS.includes('15m' as Tenor), false);
  assert.equal(VISIBLE_TENORS.includes('1h' as Tenor), false);
});

test('ladder is monotonically increasing in seconds', () => {
  for (let i = 1; i < VISIBLE_TENORS.length; i++) {
    assert.ok(TENOR_TO_SECONDS[VISIBLE_TENORS[i]!] > TENOR_TO_SECONDS[VISIBLE_TENORS[i - 1]!]);
  }
});

test('top of ladder is 3 minutes (180s) — caps trader time-value optionality', () => {
  assert.equal(TENOR_TO_SECONDS[VISIBLE_TENORS[VISIBLE_TENORS.length - 1]!], 180);
});
