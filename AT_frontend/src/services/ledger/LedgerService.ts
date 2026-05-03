/**
 * LedgerService — append-only event log for trader-facing money flow + hedge fills.
 *
 * Invariants:
 *   - Every entry is immutable once written.
 *   - Per-user `seq` is monotonically increasing starting at 1.
 *   - The pair (idempotencyKey, kind) is unique. Re-appending returns the prior entry.
 *   - All amounts are stored as Decimal strings (never JS number).
 *
 * Two streams:
 *   - traderLedger: every credit/debit affecting a partnerUserId.
 *     Drives the partner reconcile export (T+1 daily by default).
 *   - hedgeLedger: every venue fill, tagged with the time-bucket it hedged.
 *     Drives internal P&L vs trader-flow reconciliation.
 *
 * Storage: an interface, with InMemoryLedgerStore for dev/tests. A Postgres
 * implementation lands when we have a deployment target; the InMemory shape is
 * intentionally row-oriented so it ports 1:1.
 */

import { Decimal } from 'decimal.js';

export type TraderLedgerKind =
  | 'premium_debit'
  | 'payout_credit'
  | 'sellback_refund_credit'
  | 'tie_refund_credit'
  | 'admin_credit'
  | 'admin_debit';

export type HedgeLedgerKind = 'hedge_fill' | 'hedge_unwind' | 'hedge_funding';

export interface TraderLedgerEntry {
  id: number;
  seq: number;
  partnerUserId: string;
  kind: TraderLedgerKind;
  amountUSD: string;
  ticketId?: number;
  idempotencyKey: string;
  createdAt: number;
  partnerReconcileBatchId?: string;
}

export interface HedgeLedgerEntry {
  id: number;
  seq: number;
  venue: string;
  kind: HedgeLedgerKind;
  symbol: string;
  side: 'buy' | 'sell';
  baseQty: string;
  quoteUSD: string;
  feesUSD: string;
  bucketStartedAt: number;
  bucketEndedAt: number;
  venueOrderRef: string;
  idempotencyKey: string;
  createdAt: number;
}

export interface AppendTraderArgs {
  partnerUserId: string;
  kind: TraderLedgerKind;
  amountUSD: Decimal;
  ticketId?: number;
  idempotencyKey: string;
}

export interface AppendHedgeArgs {
  venue: string;
  kind: HedgeLedgerKind;
  symbol: string;
  side: 'buy' | 'sell';
  baseQty: Decimal;
  quoteUSD: Decimal;
  feesUSD: Decimal;
  bucketStartedAt: number;
  bucketEndedAt: number;
  venueOrderRef: string;
  idempotencyKey: string;
}

export interface ReconcileWindow {
  fromTs: number;
  toTs: number;
}

export interface PartnerReconcileRow {
  partnerUserId: string;
  netUSD: string;
  totalCreditsUSD: string;
  totalDebitsUSD: string;
  entryCount: number;
}

export interface LedgerStore {
  appendTrader(e: AppendTraderArgs): Promise<TraderLedgerEntry>;
  appendHedge(e: AppendHedgeArgs): Promise<HedgeLedgerEntry>;
  getTraderEntriesForUser(partnerUserId: string): Promise<TraderLedgerEntry[]>;
  getTraderEntriesInWindow(window: ReconcileWindow): Promise<TraderLedgerEntry[]>;
  getHedgeEntriesInWindow(window: ReconcileWindow): Promise<HedgeLedgerEntry[]>;
  markTraderEntriesReconciled(ids: number[], batchId: string): Promise<void>;
}

const signOf = (kind: TraderLedgerKind): 1 | -1 => {
  switch (kind) {
    case 'payout_credit':
    case 'sellback_refund_credit':
    case 'tie_refund_credit':
    case 'admin_credit':
      return 1;
    case 'premium_debit':
    case 'admin_debit':
      return -1;
  }
};

export class InMemoryLedgerStore implements LedgerStore {
  private trader: TraderLedgerEntry[] = [];
  private hedge: HedgeLedgerEntry[] = [];
  private nextTraderId = 1;
  private nextHedgeId = 1;
  private traderSeqByUser = new Map<string, number>();
  private hedgeSeqByVenue = new Map<string, number>();
  private traderIdempotency = new Map<string, number>();
  private hedgeIdempotency = new Map<string, number>();

  async appendTrader(e: AppendTraderArgs): Promise<TraderLedgerEntry> {
    const key = `${e.idempotencyKey}|${e.kind}|${e.partnerUserId}`;
    const seenId = this.traderIdempotency.get(key);
    if (seenId !== undefined) {
      const existing = this.trader.find(x => x.id === seenId);
      if (existing) return existing;
    }
    const seq = (this.traderSeqByUser.get(e.partnerUserId) ?? 0) + 1;
    this.traderSeqByUser.set(e.partnerUserId, seq);
    const id = this.nextTraderId++;
    const entry: TraderLedgerEntry = {
      id,
      seq,
      partnerUserId: e.partnerUserId,
      kind: e.kind,
      amountUSD: e.amountUSD.toString(),
      ticketId: e.ticketId,
      idempotencyKey: e.idempotencyKey,
      createdAt: Date.now(),
    };
    this.trader.push(entry);
    this.traderIdempotency.set(key, id);
    return entry;
  }

  async appendHedge(e: AppendHedgeArgs): Promise<HedgeLedgerEntry> {
    const key = `${e.idempotencyKey}|${e.kind}|${e.venue}`;
    const seenId = this.hedgeIdempotency.get(key);
    if (seenId !== undefined) {
      const existing = this.hedge.find(x => x.id === seenId);
      if (existing) return existing;
    }
    const seq = (this.hedgeSeqByVenue.get(e.venue) ?? 0) + 1;
    this.hedgeSeqByVenue.set(e.venue, seq);
    const id = this.nextHedgeId++;
    const entry: HedgeLedgerEntry = {
      id,
      seq,
      venue: e.venue,
      kind: e.kind,
      symbol: e.symbol,
      side: e.side,
      baseQty: e.baseQty.toString(),
      quoteUSD: e.quoteUSD.toString(),
      feesUSD: e.feesUSD.toString(),
      bucketStartedAt: e.bucketStartedAt,
      bucketEndedAt: e.bucketEndedAt,
      venueOrderRef: e.venueOrderRef,
      idempotencyKey: e.idempotencyKey,
      createdAt: Date.now(),
    };
    this.hedge.push(entry);
    this.hedgeIdempotency.set(key, id);
    return entry;
  }

  async getTraderEntriesForUser(partnerUserId: string): Promise<TraderLedgerEntry[]> {
    return this.trader.filter(e => e.partnerUserId === partnerUserId).sort((a, b) => a.seq - b.seq);
  }

  async getTraderEntriesInWindow(w: ReconcileWindow): Promise<TraderLedgerEntry[]> {
    return this.trader.filter(e => e.createdAt >= w.fromTs && e.createdAt < w.toTs).sort((a, b) => a.id - b.id);
  }

  async getHedgeEntriesInWindow(w: ReconcileWindow): Promise<HedgeLedgerEntry[]> {
    return this.hedge.filter(e => e.bucketStartedAt >= w.fromTs && e.bucketStartedAt < w.toTs).sort((a, b) => a.id - b.id);
  }

  async markTraderEntriesReconciled(ids: number[], batchId: string): Promise<void> {
    const idSet = new Set(ids);
    for (const e of this.trader) if (idSet.has(e.id)) e.partnerReconcileBatchId = batchId;
  }
}

export class LedgerService {
  constructor(private store: LedgerStore) {}

  appendTrader(e: AppendTraderArgs): Promise<TraderLedgerEntry> {
    return this.store.appendTrader(e);
  }

  /** Read-only accessor — used by the account screen to render recent entries. */
  getTraderEntriesForUser(partnerUserId: string): Promise<TraderLedgerEntry[]> {
    return this.store.getTraderEntriesForUser(partnerUserId);
  }

  appendHedge(e: AppendHedgeArgs): Promise<HedgeLedgerEntry> {
    return this.store.appendHedge(e);
  }

  async traderBalance(partnerUserId: string): Promise<Decimal> {
    const entries = await this.store.getTraderEntriesForUser(partnerUserId);
    return entries.reduce(
      (acc, e) => acc.plus(new Decimal(e.amountUSD).mul(signOf(e.kind))),
      new Decimal(0),
    );
  }

  async buildPartnerReconcile(window: ReconcileWindow): Promise<{
    rows: PartnerReconcileRow[];
    entryIds: number[];
  }> {
    const entries = await this.store.getTraderEntriesInWindow(window);
    const byUser = new Map<string, { net: Decimal; credits: Decimal; debits: Decimal; count: number }>();
    for (const e of entries) {
      const sign = signOf(e.kind);
      const amt = new Decimal(e.amountUSD);
      let bucket = byUser.get(e.partnerUserId);
      if (!bucket) {
        bucket = { net: new Decimal(0), credits: new Decimal(0), debits: new Decimal(0), count: 0 };
        byUser.set(e.partnerUserId, bucket);
      }
      bucket.net = bucket.net.plus(amt.mul(sign));
      if (sign === 1) bucket.credits = bucket.credits.plus(amt);
      else bucket.debits = bucket.debits.plus(amt);
      bucket.count += 1;
    }
    const rows: PartnerReconcileRow[] = [];
    for (const [partnerUserId, b] of byUser) {
      rows.push({
        partnerUserId,
        netUSD: b.net.toFixed(2),
        totalCreditsUSD: b.credits.toFixed(2),
        totalDebitsUSD: b.debits.toFixed(2),
        entryCount: b.count,
      });
    }
    rows.sort((a, b) => a.partnerUserId.localeCompare(b.partnerUserId));
    return { rows, entryIds: entries.map(e => e.id) };
  }

  exportPartnerReconcileCSV(rows: PartnerReconcileRow[]): string {
    const header = 'partner_user_id,net_usd,total_credits_usd,total_debits_usd,entry_count';
    const body = rows
      .map(r =>
        [r.partnerUserId, r.netUSD, r.totalCreditsUSD, r.totalDebitsUSD, r.entryCount].join(','),
      )
      .join('\n');
    return `${header}\n${body}\n`;
  }

  markReconciled(ids: number[], batchId: string): Promise<void> {
    return this.store.markTraderEntriesReconciled(ids, batchId);
  }
}

export const inMemoryLedgerStore = new InMemoryLedgerStore();
export const ledgerService = new LedgerService(inMemoryLedgerStore);
