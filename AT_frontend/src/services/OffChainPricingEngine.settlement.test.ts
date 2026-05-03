/**
 * OffChainPricingEngine.calculateSettlement contract.
 *
 * Settlement payout must equal premium * (quoted multiple at trade time).
 * Tests cover: win using frozen quote, win re-quoted from PricingService
 * for supported tenors, loss/tie outcomes, multi-contract scaling, and the
 * defensive fallback for unknown tenors.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OffChainPricingEngine } from './OffChainPricingEngine';
import { pricingService } from './pricing/PricingService';

const engine = new OffChainPricingEngine();
engine.disconnect();

test('win uses frozen quoted multiple exactly', () => {
  const r = engine.calculateSettlement('call', 25, '1m', 70_100, 70_000, 5, 1.7);
  assert.equal(r.outcome, 'win');
  assert.equal(r.payout, 5 * 1.7);
  assert.equal(r.profit, 5 * 1.7 - 5);
  assert.equal(r.strikePrice, 70_025);
});

test('win without frozen multiple re-quotes via PricingService for supported tenor', () => {
  const expected = pricingService.quote({
    optionType: 'put',
    spotUSD: 70_000,
    strikeOffsetUSD: 50,
    tenor: '5m',
    contracts: 3,
  }).payoutMultiple;
  const r = engine.calculateSettlement('put', 50, '5m', 69_900, 70_000, 3);
  assert.equal(r.outcome, 'win');
  assert.ok(Math.abs(r.payout - 3 * expected) < 1e-9);
});

test('loss returns zero payout and negative profit equal to premium', () => {
  const r = engine.calculateSettlement('call', 25, '1m', 69_900, 70_000, 4, 1.7);
  assert.equal(r.outcome, 'loss');
  assert.equal(r.payout, 0);
  assert.equal(r.profit, -4);
});

test('tie refunds the premium', () => {
  const r = engine.calculateSettlement('call', 25, '1m', 70_025, 70_000, 2, 1.7);
  assert.equal(r.outcome, 'tie');
  assert.equal(r.payout, 2);
  assert.equal(r.profit, 0);
});

test('payout scales linearly with contract count', () => {
  const one = engine.calculateSettlement('call', 25, '1m', 70_100, 70_000, 1, 1.7);
  const ten = engine.calculateSettlement('call', 25, '1m', 70_100, 70_000, 10, 1.7);
  assert.equal(ten.payout, one.payout * 10);
  assert.equal(ten.profit, one.profit * 10);
});

test('unknown tenor without a frozen multiple falls back to floor 1.05x', () => {
  const r = engine.calculateSettlement('call', 25, '7m', 70_100, 70_000, 5);
  assert.equal(r.outcome, 'win');
  assert.equal(r.payout, 5 * 1.05);
});

test('settlement matches what a fresh quote would have shown the user', () => {
  const q = pricingService.quote({
    optionType: 'call',
    spotUSD: 65_000,
    strikeOffsetUSD: 100,
    tenor: '15m',
    contracts: 7,
  });
  const r = engine.calculateSettlement(
    'call', 100, '15m', 65_500, 65_000, 7, q.payoutMultiple,
  );
  assert.equal(r.outcome, 'win');
  assert.ok(Math.abs(r.payout - q.potentialPayoutUSD.toNumber()) < 1e-6);
});
