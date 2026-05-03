/**
 * AtticusService — legacy facade kept for backwards-compatible imports.
 *
 * After PR #3 the canonical surface is `PartnerExchangeAdapter` accessed via
 * `getPartnerExchange()`. This file routes the few legacy method names that
 * existing components still import (`getUser`, `getAllPositions`,
 * `getUserTradeSummary`, `recordSettlement`) into the adapter.
 *
 * New code should import from `services/partner` directly.
 */

import { Decimal } from 'decimal.js';
import { getPartnerExchange } from './partner';
import type { PartnerTicket } from './partner';

export interface UserData {
  principal: string;
  balance: number;
  totalWins: number;
  totalLosses: number;
  netPnl: number;
  createdAt: number;
}

export interface SettlementResult {
  outcome: 'win' | 'loss' | 'tie';
  payout: number;
  profit: number;
  finalPrice: number;
}

export interface Position {
  id: number;
  user: string;
  optionType: 'call' | 'put';
  strikePrice: number;
  entryPrice: number;
  expiry: string;
  size: number;
  status: 'Active' | 'Settled';
  openedAt: number;
  entryPremium?: number;
  currentValue?: number;
  pnl?: number;
  settledAt?: number | null;
  settlementPrice?: number;
}

export interface TradeSummary {
  totalTrades: number;
  wins: number;
  losses: number;
}

const toLegacyPosition = (t: PartnerTicket): Position => ({
  id: t.id,
  user: t.userId,
  optionType: t.optionType,
  strikePrice: t.strikePriceUSD.toNumber(),
  entryPrice: t.entryPriceUSD.toNumber(),
  expiry: t.tenor,
  size: t.contracts,
  entryPremium: t.premiumUSD.toNumber(),
  currentValue: t.payoutUSD?.toNumber() ?? 0,
  pnl: t.outcome === 'win'
    ? (t.payoutUSD?.toNumber() ?? 0) - t.premiumUSD.toNumber()
    : t.outcome === 'loss'
      ? -t.premiumUSD.toNumber()
      : 0,
  status: t.status === 'active' ? 'Active' : 'Settled',
  openedAt: t.openedAt,
  settledAt: t.settledAt ?? null,
  settlementPrice: t.finalPriceUSD?.toNumber(),
});

let settlementSequence = 0;

export class AtticusService {
  async initialize(_canisterIdIgnored?: string): Promise<void> {}

  async getUser(userId: string): Promise<UserData> {
    const partner = getPartnerExchange();
    const balance = await partner.getBalance(userId);
    const tickets = await partner.getUserTickets(userId);
    return {
      principal: userId,
      balance: balance.availableUSD.toNumber(),
      totalWins: tickets.filter(t => t.outcome === 'win').length,
      totalLosses: tickets.filter(t => t.outcome === 'loss').length,
      netPnl: 0,
      createdAt: balance.asOf,
    };
  }

  async recordSettlement(positionId: number, settlement: SettlementResult): Promise<void> {
    const partner = getPartnerExchange();
    settlementSequence += 1;
    const result = await partner.settleTicket({
      ticketId: positionId,
      outcome: settlement.outcome,
      payoutUSD: new Decimal(settlement.payout),
      profitUSD: new Decimal(Math.max(0, settlement.profit)),
      finalPriceUSD: new Decimal(settlement.finalPrice),
      idempotencyKey: `settle:${positionId}:${settlementSequence}`,
    });
    if ('err' in result) throw new Error(result.err);
  }

  async getUserPositions(userId: string): Promise<Position[]> {
    const tickets = await getPartnerExchange().getUserTickets(userId);
    return tickets.map(toLegacyPosition);
  }

  async getAllPositions(): Promise<Position[]> {
    return [];
  }

  async getUserTradeSummary(userId: string): Promise<TradeSummary> {
    const tickets = await getPartnerExchange().getUserTickets(userId);
    return {
      totalTrades: tickets.length,
      wins: tickets.filter(t => t.outcome === 'win').length,
      losses: tickets.filter(t => t.outcome === 'loss').length,
    };
  }
}

export const atticusService = new AtticusService();
