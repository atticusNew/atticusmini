/**
 * Direction-neutral default contract.
 *
 * The form must not pre-select a direction; review must stay gated until
 * the trader explicitly taps UP or DOWN; strike chips show the helper
 * copy in the no-direction state.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

const isDirectionPicked = (optionType: 'call' | 'put' | null): boolean => optionType != null;

const strikeChipSubtitle = (
  optionType: 'call' | 'put' | null,
  prob: number | null,
  mult: number | null,
): string => {
  if (prob != null && mult != null) return `${prob}% likely · ${mult.toFixed(2)}×`;
  return optionType == null ? 'pick UP or DOWN first' : '';
};

const ctaCopy = (args: {
  submitting: boolean; isTradeActive: boolean;
  optionType: 'call' | 'put' | null; strikeOffset: number; stake: number;
}): string => {
  if (args.submitting) return 'Placing…';
  if (args.isTradeActive) return 'Trade in progress';
  if (!args.optionType) return 'Pick UP or DOWN to start';
  if (!args.strikeOffset) return 'Pick a target price';
  return `Review · $${args.stake}`;
};

test('direction defaults to null (neutral); review is gated until tap', () => {
  assert.equal(isDirectionPicked(null), false);
  assert.equal(isDirectionPicked('call'), true);
  assert.equal(isDirectionPicked('put'), true);
});

test('strike chip subtitle reads "pick UP or DOWN first" before direction is set', () => {
  assert.equal(strikeChipSubtitle(null, null, null), 'pick UP or DOWN first');
});

test('strike chip subtitle shows likelihood once direction is set', () => {
  assert.equal(strikeChipSubtitle('call', 60, 1.4), '60% likely · 1.40×');
});

test('CTA copy steers the user to the next missing field', () => {
  const base = { submitting: false, isTradeActive: false, optionType: null, strikeOffset: 0, stake: 5 } as const;
  assert.equal(ctaCopy({ ...base }), 'Pick UP or DOWN to start');
  assert.equal(ctaCopy({ ...base, optionType: 'call' as const }), 'Pick a target price');
  assert.equal(ctaCopy({ ...base, optionType: 'call' as const, strikeOffset: 25 }), 'Review · $5');
});
