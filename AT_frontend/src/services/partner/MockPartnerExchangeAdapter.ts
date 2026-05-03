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

const STARTING_BALANCE_USD = new Decimal(10_000);

const DEMO_SESSION: PartnerSession = {
  partnerUserId: 'demo-user',
  displayName: 'Demo Trader',
  countryCode: 'US',
  isLive: false,
};

interface InternalUser {
  id: string;
  available: Decimal;
  reserved: Decimal;
  createdAt: number;
}

export class MockPartnerExchangeAdapter implements PartnerExchangeAdapter {
  readonly name = 'mock';

  private users = new Map<string, InternalUser>();
  private tickets = new Map<number, PartnerTicket>();
  private nextTicketId = 1;
  private idempotency = new Map<string, number>();

  async getSession(): Promise<PartnerSession | null> {
    await this.ensureUser(DEMO_SESSION.partnerUserId);
    return DEMO_SESSION;
  }

  async getBalance(userId: string): Promise<PartnerBalance> {
    const u = await this.ensureUser(userId);
    return {
      userId,
      availableUSD: u.available,
      reservedUSD: u.reserved,
      asOf: Date.now(),
    };
  }

  async placeTicket(args: PlaceTicketArgs): Promise<AdapterResult<PartnerTicket>> {
    const existing = this.idempotency.get(args.idempotencyKey);
    if (existing !== undefined) {
      const t = this.tickets.get(existing);
      return t ? { ok: t } : { err: 'idempotency record dangling' };
    }

    const u = await this.ensureUser(args.userId);
    if (u.available.lessThan(args.premiumUSD)) {
      return { err: 'insufficient balance' };
    }
    u.available = u.available.minus(args.premiumUSD);
    u.reserved = u.reserved.plus(args.premiumUSD);

    const id = this.nextTicketId++;
    const ticket: PartnerTicket = {
      id,
      userId: args.userId,
      optionType: args.optionType,
      strikePriceUSD: args.strikePriceUSD,
      entryPriceUSD: args.entryPriceUSD,
      tenor: args.tenor,
      contracts: args.contracts,
      premiumUSD: args.premiumUSD,
      status: 'active',
      openedAt: Date.now(),
    };
    this.tickets.set(id, ticket);
    this.idempotency.set(args.idempotencyKey, id);
    return { ok: ticket };
  }

  async settleTicket(args: SettleTicketArgs): Promise<AdapterResult<PartnerTicket>> {
    const ticket = this.tickets.get(args.ticketId);
    if (!ticket) return { err: 'ticket not found' };
    const seenKey = `${args.idempotencyKey}|settle`;
    const seen = this.idempotency.get(seenKey);
    if (seen === ticket.id && ticket.status === 'settled') {
      return { ok: ticket };
    }
    if (ticket.status === 'settled') {
      return { ok: ticket };
    }

    const u = this.users.get(ticket.userId);
    if (!u) return { err: 'user not found' };

    u.reserved = u.reserved.minus(ticket.premiumUSD);
    if (u.reserved.lessThan(0)) u.reserved = new Decimal(0);
    if (args.outcome !== 'loss') {
      u.available = u.available.plus(args.payoutUSD);
    }

    ticket.status = 'settled';
    ticket.outcome = args.outcome;
    ticket.payoutUSD = args.payoutUSD;
    ticket.finalPriceUSD = args.finalPriceUSD;
    ticket.settledAt = Date.now();
    this.idempotency.set(seenKey, ticket.id);
    return { ok: ticket };
  }

  async cancelTicket(args: CancelTicketArgs): Promise<AdapterResult<PartnerTicket>> {
    const ticket = this.tickets.get(args.ticketId);
    if (!ticket) return { err: 'ticket not found' };
    const seenKey = `${args.idempotencyKey}|cancel`;
    const seen = this.idempotency.get(seenKey);
    if (seen === ticket.id) return { ok: ticket };
    if (ticket.status !== 'active') return { err: 'ticket not active' };

    const u = this.users.get(ticket.userId);
    if (!u) return { err: 'user not found' };

    u.reserved = u.reserved.minus(ticket.premiumUSD);
    if (u.reserved.lessThan(0)) u.reserved = new Decimal(0);
    u.available = u.available.plus(args.refundUSD);

    ticket.status = 'cancelled';
    ticket.settledAt = Date.now();
    ticket.payoutUSD = args.refundUSD;
    this.idempotency.set(seenKey, ticket.id);
    return { ok: ticket };
  }

  async getTicket(ticketId: number): Promise<PartnerTicket | null> {
    return this.tickets.get(ticketId) ?? null;
  }

  async getUserTickets(userId: string): Promise<PartnerTicket[]> {
    return Array.from(this.tickets.values())
      .filter(t => t.userId === userId)
      .sort((a, b) => b.openedAt - a.openedAt);
  }

  private async ensureUser(userId: string): Promise<InternalUser> {
    let u = this.users.get(userId);
    if (!u) {
      u = {
        id: userId,
        available: STARTING_BALANCE_USD,
        reserved: new Decimal(0),
        createdAt: Date.now(),
      };
      this.users.set(userId, u);
    }
    return u;
  }
}

export const mockPartnerExchangeAdapter = new MockPartnerExchangeAdapter();
