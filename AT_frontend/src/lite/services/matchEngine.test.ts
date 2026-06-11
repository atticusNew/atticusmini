import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clampAmount,
  clampWager,
  closeSide,
  createMatch,
  effectivePnlUSD,
  isExpired,
  isInTheMoney,
  livePnlUSD,
  LITE_LEVERAGE,
  openSide,
  secondsRemaining,
  settleMatch,
  strikeFor,
} from './matchEngine';

const baseMatch = () =>
  createMatch({
    id: 'm1',
    mode: 'pvp',
    wagerUSD: 25,
    you: { name: 'You', avatar: '', amountUSD: 10 },
    opp: { name: 'Bot', avatar: '', amountUSD: 10 },
  });

test('clamps amount and wager into allowed bands', () => {
  assert.equal(clampAmount(0), 1);
  assert.equal(clampAmount(999), 100);
  assert.equal(clampAmount(12.6), 13);
  assert.equal(clampWager(0), 1);
  assert.equal(clampWager(500), 100);
});

test('idle side has zero PnL', () => {
  const m = baseMatch();
  assert.equal(livePnlUSD(m.you, 100_000), 0);
});

test('strike equals entry; profit is the directional move from it', () => {
  const m = baseMatch();
  const you = openSide(m.you, 'up', 100_000);
  const strike = strikeFor(100_000, 'up');
  assert.equal(you.strikeUSD, strike);
  assert.equal(strike, 100_000); // dot sits on the price line at entry

  // At entry → flat, not yet in the money.
  assert.equal(livePnlUSD(you, 100_000), 0);
  assert.equal(isInTheMoney(you, 100_000), false);

  // Above entry → in the money, scaled by leverage.
  const spot = 101_000;
  const expected = (10 * LITE_LEVERAGE * (spot - 100_000)) / 100_000;
  assert.ok(Math.abs(livePnlUSD(you, spot) - expected) < 1e-6);
  assert.equal(isInTheMoney(you, spot), true);
});

test('down position profits when spot falls', () => {
  const m = baseMatch();
  const you = openSide(m.you, 'down', 100_000);
  assert.ok(livePnlUSD(you, 99_000) > 0);
  assert.ok(livePnlUSD(you, 101_000) < 0);
});

test('downside is floored at -amount (capped loss)', () => {
  const m = baseMatch();
  const you = openSide(m.you, 'up', 100_000);
  // Catastrophic 50% drop would be enormous, but loss is capped at stake.
  assert.equal(livePnlUSD(you, 50_000), -10);
});

test('closeSide locks realized PnL and effective uses it afterwards', () => {
  const m = baseMatch();
  const opened = openSide(m.you, 'up', 100_000);
  const closed = closeSide(opened, 101_000, 123);
  assert.equal(closed.status, 'closed');
  assert.equal(closed.closedAt, 123);
  // Effective PnL ignores later spot once closed.
  assert.equal(effectivePnlUSD(closed, 200_000), closed.realizedPnlUSD);
});

test('higher profit wins the wager; net includes own PnL + transfer', () => {
  let m = baseMatch();
  m = { ...m, you: openSide(m.you, 'up', 100_000), opp: openSide(m.opp, 'down', 100_000), entrySpot: 100_000, startedAt: 0, phase: 'live' };
  // Spot rises: you (up) win, bot (down) lose.
  const settled = settleMatch(m, 101_000, 1000);
  assert.equal(settled.result?.outcome, 'you');
  assert.ok(settled.result!.youPnlUSD > 0);
  assert.ok(settled.result!.oppPnlUSD < 0);
  assert.equal(settled.result!.youNetUSD, settled.result!.youPnlUSD + 25);
});

test('equal PnL is a push with no wager transfer', () => {
  let m = baseMatch();
  // Both same direction + same amount → identical PnL.
  m = { ...m, you: openSide(m.you, 'up', 100_000), opp: openSide(m.opp, 'up', 100_000), entrySpot: 100_000, startedAt: 0, phase: 'live' };
  const settled = settleMatch(m, 100_500, 1000);
  assert.equal(settled.result?.outcome, 'push');
  assert.equal(settled.result!.youNetUSD, settled.result!.youPnlUSD);
});

test('solo mode never transfers a wager', () => {
  let m = createMatch({
    id: 's1', mode: 'solo', wagerUSD: 50,
    you: { name: 'You', avatar: '', amountUSD: 10 },
    opp: { name: 'Solo', avatar: '', amountUSD: 10 },
  });
  m = { ...m, you: openSide(m.you, 'up', 100_000), entrySpot: 100_000, startedAt: 0, phase: 'live' };
  const settled = settleMatch(m, 101_000, 1000);
  assert.equal(settled.result!.wagerUSD, 0);
  assert.equal(settled.result!.youNetUSD, settled.result!.youPnlUSD);
});

test('countdown + expiry track the duration window', () => {
  let m = baseMatch();
  m = { ...m, startedAt: 1_000, phase: 'live' };
  assert.equal(secondsRemaining(m, 1_000), 30);
  assert.equal(secondsRemaining(m, 16_000), 15);
  assert.equal(isExpired(m, 31_000), true);
  assert.equal(isExpired(m, 20_000), false);
});
