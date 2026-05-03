import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from 'decimal.js';
import { InMemoryLedgerStore, LedgerService } from './LedgerService';

const newSvc = () => new LedgerService(new InMemoryLedgerStore());

test('appendTrader is idempotent on (idempotencyKey, kind, partnerUserId)', async () => {
  const svc = newSvc();
  const a = await svc.appendTrader({
    partnerUserId: 'u1',
    kind: 'premium_debit',
    amountUSD: new Decimal(5),
    ticketId: 1,
    idempotencyKey: 'k1',
  });
  const b = await svc.appendTrader({
    partnerUserId: 'u1',
    kind: 'premium_debit',
    amountUSD: new Decimal(5),
    ticketId: 1,
    idempotencyKey: 'k1',
  });
  assert.equal(a.id, b.id);
  assert.equal(a.seq, 1);
});

test('per-user seq is monotonic and isolated between users', async () => {
  const svc = newSvc();
  await svc.appendTrader({ partnerUserId: 'a', kind: 'premium_debit', amountUSD: new Decimal(1), idempotencyKey: 'a1' });
  await svc.appendTrader({ partnerUserId: 'b', kind: 'premium_debit', amountUSD: new Decimal(1), idempotencyKey: 'b1' });
  const a2 = await svc.appendTrader({ partnerUserId: 'a', kind: 'premium_debit', amountUSD: new Decimal(2), idempotencyKey: 'a2' });
  assert.equal(a2.seq, 2);
});

test('traderBalance reflects credits minus debits', async () => {
  const svc = newSvc();
  const userId = 'bal-user';
  await svc.appendTrader({ partnerUserId: userId, kind: 'premium_debit', amountUSD: new Decimal(10), idempotencyKey: 'd1' });
  await svc.appendTrader({ partnerUserId: userId, kind: 'payout_credit', amountUSD: new Decimal(25), idempotencyKey: 'c1' });
  await svc.appendTrader({ partnerUserId: userId, kind: 'admin_debit', amountUSD: new Decimal(5), idempotencyKey: 'd2' });
  const bal = await svc.traderBalance(userId);
  assert.equal(bal.toString(), '10');
});

test('buildPartnerReconcile aggregates within window', async () => {
  const svc = newSvc();
  await svc.appendTrader({ partnerUserId: 'r1', kind: 'premium_debit', amountUSD: new Decimal(3), idempotencyKey: 'r1d' });
  await svc.appendTrader({ partnerUserId: 'r1', kind: 'payout_credit', amountUSD: new Decimal(7.5), idempotencyKey: 'r1c' });
  await svc.appendTrader({ partnerUserId: 'r2', kind: 'premium_debit', amountUSD: new Decimal(1), idempotencyKey: 'r2d' });
  const now = Date.now();
  const { rows } = await svc.buildPartnerReconcile({ fromTs: now - 60_000, toTs: now + 60_000 });
  assert.equal(rows.length, 2);
  const r1 = rows.find(r => r.partnerUserId === 'r1')!;
  assert.equal(r1.netUSD, '4.50');
  assert.equal(r1.totalCreditsUSD, '7.50');
  assert.equal(r1.totalDebitsUSD, '3.00');
  assert.equal(r1.entryCount, 2);
});

test('exportPartnerReconcileCSV emits stable header + rows', async () => {
  const svc = newSvc();
  const csv = svc.exportPartnerReconcileCSV([
    { partnerUserId: 'a', netUSD: '5.00', totalCreditsUSD: '10.00', totalDebitsUSD: '5.00', entryCount: 2 },
  ]);
  assert.equal(csv.split('\n')[0], 'partner_user_id,net_usd,total_credits_usd,total_debits_usd,entry_count');
  assert.match(csv, /a,5\.00,10\.00,5\.00,2/);
});

test('hedge ledger is independent of trader ledger', async () => {
  const svc = newSvc();
  const e = await svc.appendHedge({
    venue: 'bybit',
    kind: 'hedge_fill',
    symbol: 'BTCUSDT',
    side: 'sell',
    baseQty: new Decimal('0.5'),
    quoteUSD: new Decimal('30000'),
    feesUSD: new Decimal('15'),
    bucketStartedAt: 100_000,
    bucketEndedAt: 101_000,
    venueOrderRef: 'b-1',
    idempotencyKey: 'h1',
  });
  assert.equal(e.seq, 1);
  const dup = await svc.appendHedge({
    venue: 'bybit',
    kind: 'hedge_fill',
    symbol: 'BTCUSDT',
    side: 'sell',
    baseQty: new Decimal('0.5'),
    quoteUSD: new Decimal('30000'),
    feesUSD: new Decimal('15'),
    bucketStartedAt: 100_000,
    bucketEndedAt: 101_000,
    venueOrderRef: 'b-1',
    idempotencyKey: 'h1',
  });
  assert.equal(dup.id, e.id);
});

test('markReconciled stamps batch id on the entries', async () => {
  const svc = newSvc();
  const a = await svc.appendTrader({ partnerUserId: 'm1', kind: 'premium_debit', amountUSD: new Decimal(1), idempotencyKey: 'm1d' });
  await svc.markReconciled([a.id], 'batch-2026-05-03');
  const csv = svc.exportPartnerReconcileCSV(
    (await svc.buildPartnerReconcile({ fromTs: 0, toTs: Date.now() + 60_000 })).rows,
  );
  assert.match(csv, /m1,/);
});
