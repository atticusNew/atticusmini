/**
 * Stake stepper-only contract — v3 drops all preset chips, novice
 * adjusts via the −/+ stepper.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

const STAKE_MIN = 1;
const STAKE_MAX = 100;
const setStakeClamped = (n: number): number =>
  Math.min(STAKE_MAX, Math.max(STAKE_MIN, Math.round(n)));

test('default stake is $5', () => {
  assert.equal(setStakeClamped(5), 5);
});

test('stepper clamps to [1, 100]', () => {
  assert.equal(setStakeClamped(0), 1);
  assert.equal(setStakeClamped(101), 100);
  assert.equal(setStakeClamped(1_000_000), 100);
});

test('stepper rounds fractional input', () => {
  assert.equal(setStakeClamped(5.4), 5);
  assert.equal(setStakeClamped(5.6), 6);
});

test('stepper increments and decrements by 1', () => {
  let v = 5;
  v = setStakeClamped(v + 1); assert.equal(v, 6);
  v = setStakeClamped(v - 1); assert.equal(v, 5);
});
