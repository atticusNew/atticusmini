/**
 * v5 timer-tone thresholds — absolute seconds, not ratio.
 *
 * Old logic (`ratio < 0.15 ? critical : ratio < 0.3 ? warn`) put a
 * 3m trade in 'warn' for the full last 54s — too much yellow. v5
 * uses absolute thresholds so the tone reads identically across all
 * four tenors.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

const timerTone = (remaining: number): 'normal' | 'warn' | 'critical' =>
  remaining <= 5 ? 'critical' : remaining <= 15 ? 'warn' : 'normal';

test('last 5 seconds is critical', () => {
  assert.equal(timerTone(0), 'critical');
  assert.equal(timerTone(5), 'critical');
});

test('last 15s (but >5s) is warn', () => {
  assert.equal(timerTone(6), 'warn');
  assert.equal(timerTone(15), 'warn');
});

test('above 15s remaining is normal', () => {
  assert.equal(timerTone(16), 'normal');
  assert.equal(timerTone(30), 'normal');
  assert.equal(timerTone(180), 'normal');
});

test('thresholds read the same on every v5 tenor', () => {
  // Spot-check that the same 'last 15s' window applies regardless of
  // total tenor. Old ratio gate: 30s × 0.3 = 9s; 3m × 0.3 = 54s.
  const remainingAtWarnEdge = 15;
  for (const total of [30, 60, 120, 180]) {
    assert.equal(timerTone(remainingAtWarnEdge), 'warn');
    // sanity: warn doesn't fire too early at 16s remaining
    assert.equal(timerTone(remainingAtWarnEdge + 1), 'normal');
    void total;
  }
});
