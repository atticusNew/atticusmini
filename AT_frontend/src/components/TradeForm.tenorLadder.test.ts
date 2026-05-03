/**
 * Tenor ladder contract — v2: 4 tenors only, 1h dropped.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Tenor } from '../services/pricing/PricingService';

const VISIBLE_TENORS: Tenor[] = ['30s', '1m', '5m', '15m'];

test('exactly 4 tenors are visible to the trader', () => {
  assert.equal(VISIBLE_TENORS.length, 4);
});

test('1h is no longer offered to the trader', () => {
  assert.equal(VISIBLE_TENORS.includes('1h' as Tenor), false);
});

test('ladder is monotonically increasing in seconds', () => {
  const sec: Record<Tenor, number> = {
    '5s': 5, '10s': 10, '15s': 15, '30s': 30, '1m': 60, '5m': 300, '15m': 900, '1h': 3600,
  };
  for (let i = 1; i < VISIBLE_TENORS.length; i++) {
    assert.ok(sec[VISIBLE_TENORS[i]!] > sec[VISIBLE_TENORS[i - 1]!]);
  }
});
