/**
 * positionsHelpers — partition / filter / summary contract.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from 'decimal.js';
import type { PartnerTicket } from '../services/partner';
import {
  partitionByStatus,
  filterByRange,
  summarize,
  sortHistoryDesc,
  settledPnlUSD,
} from './positionsHelpers';

const mk = (overrides: Partial<PartnerTicket>): PartnerTicket => ({
  id: 1,
  userId: 'u',
  optionType: 'call',
  strikePriceUSD: new Decimal(60_000),
  entryPriceUSD: new Decimal(60_000),
  tenor: '1m',
  contracts: 1,
  premiumUSD: new Decimal(5),
  status: 'settled',
  openedAt: 0,
  ...overrides,
});

test('partition splits by status (active vs everything else)', () => {
  const { active, history } = partitionByStatus([
    mk({ id: 1, status: 'active' }),
    mk({ id: 2, status: 'settled', outcome: 'win', payoutUSD: new Decimal(8.5) }),
    mk({ id: 3, status: 'cancelled', payoutUSD: new Decimal(3) }),
  ]);
  assert.equal(active.length, 1);
  assert.equal(history.length, 2);
});

test('filterByRange respects 24h window using settledAt then openedAt fallback', () => {
  const now = 1_000_000_000;
  const fresh = mk({ id: 1, status: 'settled', settledAt: now - 60_000, outcome: 'loss' });
  const old = mk({ id: 2, status: 'settled', settledAt: now - 25 * 60 * 60 * 1000, outcome: 'loss' });
  const r = filterByRange([fresh, old], '24h', now);
  assert.equal(r.length, 1);
  assert.equal(r[0]!.id, 1);
});

test('settledPnlUSD: win = payout - premium, loss = -premium, tie = 0, cancelled = refund - premium', () => {
  assert.equal(
    settledPnlUSD(mk({ status: 'settled', outcome: 'win', payoutUSD: new Decimal(8.5) })),
    3.5,
  );
  assert.equal(
    settledPnlUSD(mk({ status: 'settled', outcome: 'loss' })),
    -5,
  );
  assert.equal(settledPnlUSD(mk({ status: 'settled', outcome: 'tie', payoutUSD: new Decimal(5) })), 0);
  assert.equal(
    settledPnlUSD(mk({ status: 'cancelled', payoutUSD: new Decimal(3) })),
    -2,
  );
});

test('summarize counts and net add up correctly', () => {
  const s = summarize([
    mk({ id: 1, status: 'settled', outcome: 'win', payoutUSD: new Decimal(8.5) }),
    mk({ id: 2, status: 'settled', outcome: 'win', payoutUSD: new Decimal(7) }),
    mk({ id: 3, status: 'settled', outcome: 'loss' }),
    mk({ id: 4, status: 'settled', outcome: 'tie', payoutUSD: new Decimal(5) }),
    mk({ id: 5, status: 'cancelled', payoutUSD: new Decimal(4) }),
  ]);
  assert.equal(s.count, 5);
  assert.equal(s.wins, 2);
  assert.equal(s.losses, 1);
  assert.equal(s.ties, 1);
  assert.equal(s.cancelled, 1);
  // (8.5-5) + (7-5) + (-5) + 0 + (4-5) = 3.5 + 2 - 5 + 0 - 1 = -0.5
  assert.ok(Math.abs(s.netUSD - -0.5) < 1e-9);
  // win rate over decisive (2 wins / 3 decisive)
  assert.ok(s.winRate !== null && Math.abs(s.winRate - 2 / 3) < 1e-9);
});

test('summarize.winRate is null when there are no decisive tickets', () => {
  const s = summarize([
    mk({ id: 1, status: 'settled', outcome: 'tie', payoutUSD: new Decimal(5) }),
    mk({ id: 2, status: 'cancelled', payoutUSD: new Decimal(3) }),
  ]);
  assert.equal(s.winRate, null);
});

test('sortHistoryDesc orders by settledAt then openedAt desc', () => {
  const sorted = sortHistoryDesc([
    mk({ id: 1, status: 'settled', settledAt: 100 }),
    mk({ id: 2, status: 'settled', settledAt: 300 }),
    mk({ id: 3, status: 'cancelled', openedAt: 200 }),
  ]);
  assert.deepEqual(sorted.map(t => t.id), [2, 3, 1]);
});
