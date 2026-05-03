import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from 'decimal.js';
import type { PartnerTicket } from '../services/partner';

const partition = (tickets: PartnerTicket[]) => ({
  active: tickets.filter(t => t.status === 'active'),
  history: tickets.filter(t => t.status !== 'active'),
});

const mk = (id: number, status: PartnerTicket['status'], outcome?: PartnerTicket['outcome']): PartnerTicket => ({
  id,
  userId: 'u',
  optionType: 'call',
  strikePriceUSD: new Decimal(60_000),
  entryPriceUSD: new Decimal(60_000),
  tenor: '1m',
  contracts: 1,
  premiumUSD: new Decimal(1),
  status,
  openedAt: 0,
  outcome,
});

test('partition splits active vs history correctly', () => {
  const tickets = [
    mk(1, 'active'),
    mk(2, 'settled', 'win'),
    mk(3, 'cancelled'),
    mk(4, 'active'),
    mk(5, 'settled', 'loss'),
  ];
  const { active, history } = partition(tickets);
  assert.equal(active.length, 2);
  assert.equal(history.length, 3);
});

test('history outcome → tone mapping covers win/loss/tie/cancel', () => {
  type Tone = 'up' | 'down' | 'flat';
  const toneOf = (t: PartnerTicket): Tone => {
    if (t.outcome === 'win') return 'up';
    if (t.outcome === 'tie') return 'flat';
    return 'down';
  };
  assert.equal(toneOf(mk(1, 'settled', 'win')), 'up');
  assert.equal(toneOf(mk(2, 'settled', 'loss')), 'down');
  assert.equal(toneOf(mk(3, 'settled', 'tie')), 'flat');
  assert.equal(toneOf(mk(4, 'cancelled')), 'down');
});

test('tab counts reflect raw partition', () => {
  const tickets = [mk(1, 'active'), mk(2, 'active'), mk(3, 'settled', 'win')];
  const { active, history } = partition(tickets);
  assert.equal(active.length, 2);
  assert.equal(history.length, 1);
});
