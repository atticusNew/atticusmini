/**
 * BalancePill day-P&L deadband contract — v4.
 *
 * Both the tone (color) and the prefix (+ / − / none) are driven
 * from the same ±$0.005 deadband so single-cent rounding swings
 * can't flip between '+ green' and 'no prefix dim' between updates.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

const PNL_EPS = 0.005;
const pnlTone = (n: number): 'pos' | 'neg' | 'flat' =>
  n > PNL_EPS ? 'pos' : n < -PNL_EPS ? 'neg' : 'flat';
const pnlPrefix = (tone: 'pos' | 'neg' | 'flat'): string =>
  tone === 'pos' ? '+' : tone === 'neg' ? '−' : '';

test('+5 cents is positive', () => {
  assert.equal(pnlTone(0.05), 'pos');
  assert.equal(pnlPrefix(pnlTone(0.05)), '+');
});

test('-5 cents is negative', () => {
  assert.equal(pnlTone(-0.05), 'neg');
  assert.equal(pnlPrefix(pnlTone(-0.05)), '−');
});

test('exact zero is flat with no prefix', () => {
  assert.equal(pnlTone(0), 'flat');
  assert.equal(pnlPrefix(pnlTone(0)), '');
});

test('sub-half-cent is treated as flat (deadband)', () => {
  assert.equal(pnlTone(0.004), 'flat');
  assert.equal(pnlTone(-0.004), 'flat');
  assert.equal(pnlPrefix(pnlTone(0.004)), '');
});

test('half-cent boundary is flat (strict greater-than)', () => {
  assert.equal(pnlTone(0.005), 'flat');
  assert.equal(pnlTone(-0.005), 'flat');
});

test('just-over-deadband flips correctly', () => {
  assert.equal(pnlTone(0.006), 'pos');
  assert.equal(pnlTone(-0.006), 'neg');
});
