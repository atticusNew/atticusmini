/**
 * balanceState — pure session math driving the BalancePill.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialBalanceState,
  nextBalanceState,
  resetBalanceState,
} from './balanceState';

test('first reading anchors session start and emits no delta', () => {
  const s = nextBalanceState(initialBalanceState(), 10_000, 1_000);
  assert.equal(s.initialized, true);
  assert.equal(s.sessionStart, 10_000);
  assert.equal(s.current, 10_000);
  assert.equal(s.dayPnl, 0);
  assert.equal(s.lastDelta, null);
});

test('debit emits a negative delta and reduces day P&L', () => {
  const s1 = nextBalanceState(initialBalanceState(), 10_000, 1_000);
  const s2 = nextBalanceState(s1, 9_995, 2_000);
  assert.equal(s2.dayPnl, -5);
  assert.deepEqual(s2.lastDelta, { amount: -5, at: 2_000 });
});

test('credit emits a positive delta and grows day P&L', () => {
  let s = nextBalanceState(initialBalanceState(), 10_000, 1_000);
  s = nextBalanceState(s, 9_995, 2_000);
  s = nextBalanceState(s, 10_007, 3_000);
  assert.equal(s.dayPnl, 7);
  assert.deepEqual(s.lastDelta, { amount: 12, at: 3_000 });
});

test('an unchanged reading preserves the previous lastDelta', () => {
  let s = nextBalanceState(initialBalanceState(), 10_000, 1_000);
  s = nextBalanceState(s, 9_995, 2_000);
  const before = s.lastDelta;
  s = nextBalanceState(s, 9_995, 3_000);
  assert.deepEqual(s.lastDelta, before);
});

test('a sub-cent change is below epsilon and does not emit a delta', () => {
  let s = nextBalanceState(initialBalanceState(), 10_000, 1_000);
  s = nextBalanceState(s, 10_000.00005, 2_000);
  assert.equal(s.lastDelta, null);
});

test('reset returns a clean session unaware of prior balance', () => {
  let s = nextBalanceState(initialBalanceState(), 10_000, 1_000);
  s = nextBalanceState(s, 9_500, 2_000);
  const fresh = resetBalanceState();
  assert.equal(fresh.initialized, false);
  assert.equal(fresh.sessionStart, 0);
  assert.equal(fresh.lastDelta, null);
  const after = nextBalanceState(fresh, 10_000, 3_000);
  assert.equal(after.sessionStart, 10_000);
  assert.equal(after.dayPnl, 0);
});
