/**
 * v3 strike picker contract — chip is signed offset only.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

const STRIKE_OFFSETS = [5, 10, 25, 50] as const;

const chipLabel = (
  offset: number,
  optionType: 'call' | 'put' | null,
): string => {
  const sign = optionType === 'put' ? '−' : '+';
  return `${sign}$${offset}`;
};

test('exactly 4 offsets ascending', () => {
  assert.equal(STRIKE_OFFSETS.length, 4);
  for (let i = 1; i < STRIKE_OFFSETS.length; i++) {
    assert.ok(STRIKE_OFFSETS[i]! > STRIKE_OFFSETS[i - 1]!);
  }
});

test('chip label uses + sign for CALL and pre-pick (assume up)', () => {
  assert.equal(chipLabel(5, 'call'), '+$5');
  assert.equal(chipLabel(50, null), '+$50');
});

test('chip label uses unicode minus for PUT', () => {
  assert.equal(chipLabel(5, 'put'), '−$5');
  assert.equal(chipLabel(25, 'put'), '−$25');
});

test('chip is disabled before direction is picked', () => {
  const isDisabled = (optionType: 'call' | 'put' | null): boolean => optionType == null;
  assert.equal(isDisabled(null), true);
  assert.equal(isDisabled('call'), false);
  assert.equal(isDisabled('put'), false);
});
