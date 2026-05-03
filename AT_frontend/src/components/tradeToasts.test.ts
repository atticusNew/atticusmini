/**
 * tradeToasts — pure formatters for trade-flow toast copy.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPlacedMsg, formatWonMsg, formatLostMsg, formatTieMsg, formatSoldBackMsg,
} from './tradeToasts';

test('placed message includes direction arrow, stake, tenor', () => {
  assert.equal(
    formatPlacedMsg({ direction: 'call', stake: 5, tenor: '1m' }),
    '↑ CALL placed · $5.00 · 1m',
  );
  assert.equal(
    formatPlacedMsg({ direction: 'put', stake: 25, tenor: '15m' }),
    '↓ PUT placed · $25.00 · 15m',
  );
});

test('won message shows profit and total payout', () => {
  assert.equal(
    formatWonMsg({ profit: 8.4, payout: 12 }),
    'Win  +$8.40  ·  paid $12.00',
  );
});

test('lost message uses unicode minus and absolute value', () => {
  assert.equal(formatLostMsg({ loss: -5 }), 'Loss  −$5.00');
  assert.equal(formatLostMsg({ loss: 5 }), 'Loss  −$5.00');
});

test('tie refund formatted with two decimals', () => {
  assert.equal(formatTieMsg({ refund: 5 }), 'Tie  ·  refunded $5.00');
});

test('sold-back positive P&L uses + prefix', () => {
  assert.equal(
    formatSoldBackMsg({ refund: 7.5, pnl: 2.5 }),
    'Sold back  $7.50  ·  +$2.50',
  );
});

test('sold-back negative P&L uses unicode minus', () => {
  assert.equal(
    formatSoldBackMsg({ refund: 2, pnl: -3 }),
    'Sold back  $2.00  ·  −$3.00',
  );
});
