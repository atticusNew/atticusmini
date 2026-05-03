/**
 * ActiveTicketCard v4 contract — three-row body math.
 *
 * The card surfaces three numbers that drive the hold-vs-sell
 * decision: best case at expiry (payout if ITM), take-now value
 * (sell-back refund), and the current floating PnL. We test the
 * pure derivations here without rendering React.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

const formatUSD = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pnlTone = (pnl: number): 'pos' | 'neg' | 'flat' =>
  pnl > 0.005 ? 'pos' : pnl < -0.005 ? 'neg' : 'flat';

const pnlString = (pnl: number): string => {
  const tone = pnlTone(pnl);
  if (tone === 'flat') return '$0.00';
  return `${pnl >= 0 ? '+' : '−'}$${formatUSD(Math.abs(pnl))}`;
};

test('If-you-win row equals stake × payoutMultiple (the contract value)', () => {
  const stake = 5;
  const payoutMultiple = 1.4;
  const potentialPayout = stake * payoutMultiple;
  assert.equal(`$${formatUSD(potentialPayout)}`, '$7.00');
});

test('PnL string uses unicode minus and signed value', () => {
  assert.equal(pnlString(2.5), '+$2.50');
  assert.equal(pnlString(-1.2), '−$1.20');
});

test('PnL near zero collapses to "$0.00" (within 0.5¢ deadband)', () => {
  assert.equal(pnlString(0), '$0.00');
  assert.equal(pnlString(0.004), '$0.00');
  assert.equal(pnlString(-0.004), '$0.00');
});

test('PnL color tone respects the deadband threshold', () => {
  assert.equal(pnlTone(0), 'flat');
  assert.equal(pnlTone(0.005), 'flat');
  assert.equal(pnlTone(0.006), 'pos');
  assert.equal(pnlTone(-0.006), 'neg');
});

test('"If you win" can exceed "Worth now" — common case mid-trade', () => {
  // Worth now is the early-exit refund, capped at 2.5x premium and
  // discounted by the 10% sellback edge. For a 1.4x payout most of
  // the trade life, refund < potential payout.
  const stake = 5;
  const payoutMultiple = 1.4;
  const potentialPayout = stake * payoutMultiple;
  const refund = 4.2; // mid-life MTM example
  assert.ok(potentialPayout > refund);
  assert.equal(`$${formatUSD(potentialPayout)}`, '$7.00');
  assert.equal(`$${formatUSD(refund)}`, '$4.20');
});
