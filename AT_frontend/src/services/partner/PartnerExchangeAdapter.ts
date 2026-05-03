/**
 * PartnerExchangeAdapter
 *
 * The contract between Atticus mobile and the white-label partner that holds
 * KYC + custody (e.g. Foxify). All trade entry, balance lookups, and ticket
 * lifecycle operations go through this interface.
 *
 * Atticus is responsible for:
 *   - pricing, sell-back valuation, settlement math
 *   - the internal trade ledger and reconcile feed
 *   - the hedging engine (private; the partner does not see hedges)
 *
 * The partner is responsible for:
 *   - KYC, AML, geo-eligibility (we surface their decision)
 *   - holding user balances and routing deposits/withdrawals
 *   - issuing the session token used by `getSession`
 *
 * Implementations:
 *   - MockPartnerExchange (in-memory, dev only)
 *   - FoxifyPartnerExchange (TBD, lands when API spec arrives)
 */

import type { Decimal } from 'decimal.js';

export type OptionType = 'call' | 'put';
export type TicketStatus = 'active' | 'settled' | 'cancelled';
export type SettlementOutcome = 'win' | 'loss' | 'tie';

export interface PartnerSession {
  partnerUserId: string;
  displayName?: string;
  countryCode?: string;
  isLive: boolean;
}

export interface PartnerBalance {
  userId: string;
  availableUSD: Decimal;
  reservedUSD: Decimal;
  asOf: number;
}

export interface PlaceTicketArgs {
  userId: string;
  optionType: OptionType;
  strikeOffsetUSD: number;
  tenor: string;
  contracts: number;
  entryPriceUSD: Decimal;
  strikePriceUSD: Decimal;
  premiumUSD: Decimal;
  idempotencyKey: string;
}

export interface PartnerTicket {
  id: number;
  userId: string;
  optionType: OptionType;
  strikePriceUSD: Decimal;
  entryPriceUSD: Decimal;
  tenor: string;
  contracts: number;
  premiumUSD: Decimal;
  status: TicketStatus;
  openedAt: number;
  settledAt?: number;
  outcome?: SettlementOutcome;
  payoutUSD?: Decimal;
  finalPriceUSD?: Decimal;
}

export interface SettleTicketArgs {
  ticketId: number;
  outcome: SettlementOutcome;
  payoutUSD: Decimal;
  profitUSD: Decimal;
  finalPriceUSD: Decimal;
  idempotencyKey: string;
}

export interface CancelTicketArgs {
  ticketId: number;
  reason: 'user_sellback' | 'admin_void';
  refundUSD: Decimal;
  idempotencyKey: string;
}

export type AdapterResult<T> = { ok: T } | { err: string };

export interface PartnerExchangeAdapter {
  readonly name: string;
  getSession(): Promise<PartnerSession | null>;
  getBalance(userId: string): Promise<PartnerBalance>;
  placeTicket(args: PlaceTicketArgs): Promise<AdapterResult<PartnerTicket>>;
  settleTicket(args: SettleTicketArgs): Promise<AdapterResult<PartnerTicket>>;
  cancelTicket(args: CancelTicketArgs): Promise<AdapterResult<PartnerTicket>>;
  getTicket(ticketId: number): Promise<PartnerTicket | null>;
  getUserTickets(userId: string): Promise<PartnerTicket[]>;
}
