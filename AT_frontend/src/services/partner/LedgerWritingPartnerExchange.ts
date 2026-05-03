/**
 * LedgerWritingPartnerExchange — decorator that wraps any PartnerExchangeAdapter
 * and writes a corresponding trader ledger entry on every successful mutation.
 *
 * Atticus owns the ledger; the partner does not. This is what lets us reconcile
 * with them on a fixed cadence (T+1 daily by default) without depending on
 * their API for the ledger of record.
 */

import { Decimal } from 'decimal.js';
import type {
  PartnerExchangeAdapter,
  PartnerSession,
  PartnerBalance,
  PartnerTicket,
  PlaceTicketArgs,
  SettleTicketArgs,
  CancelTicketArgs,
  AdapterResult,
} from './PartnerExchangeAdapter';
import { LedgerService } from '../ledger/LedgerService';

export class LedgerWritingPartnerExchange implements PartnerExchangeAdapter {
  readonly name: string;

  constructor(
    private readonly inner: PartnerExchangeAdapter,
    private readonly ledger: LedgerService,
  ) {
    this.name = `${inner.name}+ledger`;
  }

  getSession(): Promise<PartnerSession | null> {
    return this.inner.getSession();
  }

  getBalance(userId: string): Promise<PartnerBalance> {
    return this.inner.getBalance(userId);
  }

  async placeTicket(args: PlaceTicketArgs): Promise<AdapterResult<PartnerTicket>> {
    const r = await this.inner.placeTicket(args);
    if ('ok' in r) {
      await this.ledger.appendTrader({
        partnerUserId: args.userId,
        kind: 'premium_debit',
        amountUSD: args.premiumUSD,
        ticketId: r.ok.id,
        idempotencyKey: args.idempotencyKey,
      });
    }
    return r;
  }

  async settleTicket(args: SettleTicketArgs): Promise<AdapterResult<PartnerTicket>> {
    const r = await this.inner.settleTicket(args);
    if ('ok' in r) {
      const ticket = r.ok;
      if (args.outcome === 'win' && args.payoutUSD.greaterThan(0)) {
        await this.ledger.appendTrader({
          partnerUserId: ticket.userId,
          kind: 'payout_credit',
          amountUSD: args.payoutUSD,
          ticketId: ticket.id,
          idempotencyKey: args.idempotencyKey,
        });
      } else if (args.outcome === 'tie' && args.payoutUSD.greaterThan(0)) {
        await this.ledger.appendTrader({
          partnerUserId: ticket.userId,
          kind: 'tie_refund_credit',
          amountUSD: args.payoutUSD,
          ticketId: ticket.id,
          idempotencyKey: args.idempotencyKey,
        });
      }
    }
    return r;
  }

  async cancelTicket(args: CancelTicketArgs): Promise<AdapterResult<PartnerTicket>> {
    const r = await this.inner.cancelTicket(args);
    if ('ok' in r) {
      await this.ledger.appendTrader({
        partnerUserId: r.ok.userId,
        kind: 'sellback_refund_credit',
        amountUSD: args.refundUSD,
        ticketId: r.ok.id,
        idempotencyKey: args.idempotencyKey,
      });
    }
    return r;
  }

  getTicket(ticketId: number): Promise<PartnerTicket | null> {
    return this.inner.getTicket(ticketId);
  }

  getUserTickets(userId: string): Promise<PartnerTicket[]> {
    return this.inner.getUserTickets(userId);
  }
}

// Suppress unused-import warning for Decimal — it's part of the public surface.
const _ensureDecimalType: typeof Decimal = Decimal;
void _ensureDecimalType;
