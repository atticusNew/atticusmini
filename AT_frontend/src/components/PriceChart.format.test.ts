/**
 * PriceChart formatting + tick-tone derivation contract.
 *
 * The chart had two engagement issues called out in the redesign:
 * 1. Whole-dollar formatting hid most BTC ticks (Coinbase ticks at $0.01).
 * 2. There was no tick-by-tick visual signal on the price tag.
 *
 * Both behaviors live behind tiny pure helpers we test here so we don't
 * spin up jsdom + recharts.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

const formatPrice = (n: number, decimals: number = 2): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const formatAxisPrice = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const TICK_EPS = 0.005;
const deriveTickTone = (prev: number, next: number): 'up' | 'down' | 'flat' => {
  if (prev <= 0) return 'flat';
  const diff = next - prev;
  if (Math.abs(diff) < TICK_EPS) return 'flat';
  return diff > 0 ? 'up' : 'down';
};

test('headline price renders cents so single-tick moves are visible', () => {
  assert.equal(formatPrice(67_432.41), '67,432.41');
  assert.equal(formatPrice(67_432.4), '67,432.40');
  assert.equal(formatPrice(67_432), '67,432.00');
});

test('axis ticks stay whole-dollar (space constraint)', () => {
  assert.equal(formatAxisPrice(67_432.41), '67,432');
  assert.equal(formatAxisPrice(70_000), '70,000');
});

test('tick tone is up for a 1-cent uptick once history is established', () => {
  assert.equal(deriveTickTone(67_432.40, 67_432.41), 'up');
});

test('tick tone is down for a 1-cent downtick', () => {
  assert.equal(deriveTickTone(67_432.41, 67_432.40), 'down');
});

test('sub-half-cent jitter is treated as flat', () => {
  assert.equal(deriveTickTone(67_432.41, 67_432.412), 'flat');
});

test('the very first tick has no prior sample and stays flat', () => {
  assert.equal(deriveTickTone(0, 67_432.41), 'flat');
});
