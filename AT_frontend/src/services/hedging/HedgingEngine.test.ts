import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from 'decimal.js';
import { HedgingEngine } from './HedgingEngine';
import { NetDeltaTargeter } from './NetDeltaTargeter';
import { DailyBudgetCap } from './DailyBudgetCap';
import { CircuitBreaker } from './CircuitBreaker';
import { MockPartnerExchangeAdapter } from '../partner/MockPartnerExchangeAdapter';
import { LedgerWritingPartnerExchange } from '../partner/LedgerWritingPartnerExchange';
import { InMemoryLedgerStore, LedgerService } from '../ledger/LedgerService';
import type { VenueConnector, HedgeFillEvent, PlaceHedgeArgs, VenueQuote } from './types';

class StubVenue implements VenueConnector {
  readonly name = 'stub';
  readonly defaultSymbol = 'BTCUSDT';
  public placedCount = 0;
  constructor(private readonly price: number = 60_000) {}
  async quote(symbol: string, side: 'buy' | 'sell', _qty: Decimal): Promise<VenueQuote> {
    return { venue: this.name, symbol, side, price: this.price, available: new Decimal(10), estCostPct: 0.0011 };
  }
  async place(args: PlaceHedgeArgs): Promise<{ ok: HedgeFillEvent } | { err: string }> {
    this.placedCount += 1;
    const quoteUSD = args.baseQty.mul(this.price);
    return {
      ok: {
        venue: this.name,
        symbol: args.symbol,
        side: args.side,
        baseQty: args.baseQty,
        quoteUSD,
        feesUSD: quoteUSD.mul(0.00055),
        bucketStartedAt: args.bucketStartedAt,
        bucketEndedAt: args.bucketEndedAt,
        venueOrderRef: `stub-${this.placedCount}`,
        idempotencyKey: args.idempotencyKey,
      },
    };
  }
}

const wired = () => {
  const inner = new MockPartnerExchangeAdapter();
  const ledger = new LedgerService(new InMemoryLedgerStore());
  const partner = new LedgerWritingPartnerExchange(inner, ledger);
  const venue = new StubVenue();
  return { partner, ledger, venue };
};

test('engine no-ops when book is empty (no exposure)', async () => {
  const { partner, ledger, venue } = wired();
  const eng = new HedgingEngine({ partner, ledger, venue });
  const r = await eng.runOnce([], 60_000, 0.6);
  assert.equal(r.action.kind, 'noop');
  assert.equal(venue.placedCount, 0);
});

test('engine places a hedge when net delta is outside the band', async () => {
  const { partner, ledger, venue } = wired();
  // Open ~$10k of net call exposure: 10,000 contracts × prob ~0.5 / spot ~ 0.083 BTC > 0.05 band
  await partner.placeTicket({
    userId: 'big-user',
    optionType: 'call',
    strikeOffsetUSD: 5,
    tenor: '5m',
    contracts: 10_000,
    entryPriceUSD: new Decimal(60_000),
    strikePriceUSD: new Decimal(60_005),
    premiumUSD: new Decimal(10_000),
    idempotencyKey: 'big-1',
  });
  const eng = new HedgingEngine({ partner, ledger, venue });
  const r = await eng.runOnce(['big-user'], 60_000, 0.6);
  assert.equal(r.action.kind, 'place');
  assert.equal(venue.placedCount, 1);
  assert.ok(r.filled);
});

test('budget cap blocks placement when expected cost exceeds the cap', async () => {
  const { partner, ledger, venue } = wired();
  const userIds: string[] = [];
  for (let u = 0; u < 5; u++) {
    const userId = `whale-${u}`;
    userIds.push(userId);
    await partner.placeTicket({
      userId,
      optionType: 'call',
      strikeOffsetUSD: 5,
      tenor: '5m',
      contracts: 8_000,
      entryPriceUSD: new Decimal(60_000),
      strikePriceUSD: new Decimal(60_005),
      premiumUSD: new Decimal(8_000),
      idempotencyKey: `whale-${u}`,
    });
  }
  const tinyBudget = new DailyBudgetCap({ bootstrap: 1 });
  const eng = new HedgingEngine({ partner, ledger, venue, budget: tinyBudget });
  const r = await eng.runOnce(userIds, 60_000, 0.6);
  assert.equal(r.action.kind, 'noop');
  assert.match((r.action as { reason: string }).reason, /budget/);
  assert.equal(venue.placedCount, 0);
});

test('circuit breaker trips on net-delta ceiling and prevents placement', async () => {
  const { partner, ledger, venue } = wired();
  await partner.placeTicket({
    userId: 'shock-user',
    optionType: 'call',
    strikeOffsetUSD: 5,
    tenor: '5m',
    contracts: 5_000,
    entryPriceUSD: new Decimal(60_000),
    strikePriceUSD: new Decimal(60_005),
    premiumUSD: new Decimal(5_000),
    idempotencyKey: 'shock-1',
  });
  const breaker = new CircuitBreaker({ hardNetDeltaCeilingBTC: 0.0001, rvShockSigmaMultiple: 100 });
  const eng = new HedgingEngine({ partner, ledger, venue, breaker });
  const r = await eng.runOnce(['shock-user'], 60_000, 0.6);
  assert.equal(r.breaker.tripped, true);
  assert.equal(venue.placedCount, 0);
});

test('NetDeltaTargeter sizes the hedge to the band edge', () => {
  const t = new NetDeltaTargeter({ bandBTC: 0.05, venue: 'bybit' });
  const a = t.decide({
    asOf: Date.now(),
    spotUSD: 60_000,
    netDeltaBTC: new Decimal(0.5),
    grossNotionalBTC: new Decimal(1),
    ticketCount: 1,
  });
  if (a.kind !== 'place') throw new Error('expected place');
  assert.equal(a.side, 'buy');
  assert.equal(a.baseQty.toString(), '0.45');
});

test('NetDeltaTargeter is a no-op inside the band', () => {
  const t = new NetDeltaTargeter({ bandBTC: 0.1, venue: 'bybit' });
  const a = t.decide({
    asOf: 0,
    spotUSD: 60_000,
    netDeltaBTC: new Decimal(0.05),
    grossNotionalBTC: new Decimal(0.05),
    ticketCount: 1,
  });
  assert.equal(a.kind, 'noop');
});

test('DailyBudgetCap respects setPhase and tracks daily spend', () => {
  const cap = new DailyBudgetCap();
  assert.equal(cap.capUSD().toString(), '500');
  cap.setPhase('ramp');
  assert.equal(cap.capUSD().toString(), '2500');
  cap.record(new Decimal(100));
  assert.equal(cap.state().spentTodayUSD.toString(), '100');
  assert.equal(cap.wouldBreach(new Decimal(2400)), false);
  assert.equal(cap.wouldBreach(new Decimal(2401)), true);
});

test('hedge ledger records the fill on a successful place', async () => {
  const { partner, ledger, venue } = wired();
  await partner.placeTicket({
    userId: 'ledg-user',
    optionType: 'put',
    strikeOffsetUSD: 5,
    tenor: '5m',
    contracts: 8_000,
    entryPriceUSD: new Decimal(60_000),
    strikePriceUSD: new Decimal(59_995),
    premiumUSD: new Decimal(8_000),
    idempotencyKey: 'ledg-1',
  });
  const eng = new HedgingEngine({ partner, ledger, venue });
  await eng.runOnce(['ledg-user'], 60_000, 0.6);
  const entries = await ledger.buildPartnerReconcile({ fromTs: 0, toTs: Date.now() + 1_000 });
  assert.ok(entries.rows.some(r => r.partnerUserId === 'ledg-user'));
});
