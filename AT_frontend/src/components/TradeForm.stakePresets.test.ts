/**
 * Stake preset contract — v2: 4 cleanly-spaced presets, stepper still
 * snaps within [1, 100].
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

const STAKE_PRESETS = [1, 5, 25, 100] as const;
const STAKE_MIN = 1;
const STAKE_MAX = 100;

const setStakeClamped = (n: number): number =>
  Math.min(STAKE_MAX, Math.max(STAKE_MIN, Math.round(n)));

test('exactly 4 presets and they ascend', () => {
  assert.equal(STAKE_PRESETS.length, 4);
  for (let i = 1; i < STAKE_PRESETS.length; i++) {
    assert.ok(STAKE_PRESETS[i]! > STAKE_PRESETS[i - 1]!);
  }
});

test('preset endpoints are min and max', () => {
  assert.equal(STAKE_PRESETS[0], STAKE_MIN);
  assert.equal(STAKE_PRESETS[STAKE_PRESETS.length - 1], STAKE_MAX);
});

test('stepper clamps below min and above max', () => {
  assert.equal(setStakeClamped(0), 1);
  assert.equal(setStakeClamped(-50), 1);
  assert.equal(setStakeClamped(101), 100);
  assert.equal(setStakeClamped(9999), 100);
});

test('stepper rounds fractional input', () => {
  assert.equal(setStakeClamped(5.4), 5);
  assert.equal(setStakeClamped(5.6), 6);
});
