/**
 * AtticusService — thin facade over the partner exchange adapter.
 *
 * Historically this wrapped an ICP canister. After PR #2 it is a synchronous
 * shim around MockPartnerExchange so the rest of the app keeps compiling
 * while we land the partner adapter (PR #3).
 *
 * Public surface intentionally unchanged from the legacy file: the few call
 * sites that import from here (TradingPanel, OptionsTradeForm, history views)
 * still work without modification.
 */

import { mockPartnerExchange, Position as PartnerPosition } from './MockPartnerExchange';

export interface TradeData {
  optionType: 'call' | 'put';
  strikeOffset: number;
  expiry: string;
  contractCount: number;
  userPrincipal: string;
}

export interface TradeResult {
  success: boolean;
  tradeId?: number;
  error?: string;
}

export interface SettlementResult {
  outcome: 'win' | 'loss' | 'tie';
  payout: number;
  profit: number;
  finalPrice: number;
}

export interface UserData {
  principal: string;
  balance: number;
  totalWins: number;
  totalLosses: number;
  netPnl: number;
  createdAt: number;
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

const toLegacyPosition = (p: PartnerPosition): Position => ({
  id: p.id,
  user: p.userId,
  optionType: p.optionType,
  strikePrice: p.strikePrice.toNumber(),
  entryPrice: p.entryPrice.toNumber(),
  expiry: p.expiry,
  size: p.contracts,
  entryPremium: p.premiumUSD.toNumber(),
  currentValue: p.payoutUSD?.toNumber() ?? 0,
  pnl: p.outcome === 'win'
    ? (p.payoutUSD?.toNumber() ?? 0) - p.premiumUSD.toNumber()
    : p.outcome === 'loss'
      ? -p.premiumUSD.toNumber()
      : 0,
  status: p.status === 'active' ? 'Active' : 'Settled',
  openedAt: p.openedAt,
  settledAt: p.settledAt ?? null,
  settlementPrice: p.finalPrice?.toNumber(),
});

export class AtticusService {
  private isInitialized = false;

  async initialize(_canisterIdIgnored?: string): Promise<void> {
    this.isInitialized = true;
  }

  async createUser(userId: string): Promise<UserData> {
    const u = await mockPartnerExchange.ensureUser(userId);
    return {
      principal: u.id,
      balance: u.balanceUSD.toNumber(),
      totalWins: 0,
      totalLosses: 0,
      netPnl: 0,
      createdAt: u.createdAt,
    };
  }

  async getUser(userId: string): Promise<UserData> {
    const u = (await mockPartnerExchange.getUser(userId)) ?? (await mockPartnerExchange.ensureUser(userId));
    const summary = await mockPartnerExchange.getUserTradeSummary(userId);
    return {
      principal: u.id,
      balance: u.balanceUSD.toNumber(),
      totalWins: summary.wins,
      totalLosses: summary.losses,
      netPnl: 0,
      createdAt: u.createdAt,
    };
  }

  async placeTrade(tradeData: TradeData): Promise<TradeResult> {
    return { success: false, error: 'Use pricingEngine.placeTrade — direct AtticusService.placeTrade is deprecated.' };
  }

  async recordSettlement(positionId: number, settlementResult: SettlementResult): Promise<void> {
    const result = await mockPartnerExchange.recordSettlement({
      positionId,
      outcome: settlementResult.outcome,
      payoutCents: Math.round(settlementResult.payout * 100),
      profitCents: Math.max(0, Math.round(settlementResult.profit * 100)),
      finalPriceCents: Math.round(settlementResult.finalPrice * 100),
    });
    if ('err' in result) throw new Error(result.err);
  }

  async getUserPositions(userId: string): Promise<Position[]> {
    return (await mockPartnerExchange.getUserPositions(userId)).map(toLegacyPosition);
  }

  async getAllPositions(): Promise<Position[]> {
    return (await mockPartnerExchange.getAllPositions()).map(toLegacyPosition);
  }

  async getUserTradeSummary(userId: string): Promise<TradeSummary> {
    return mockPartnerExchange.getUserTradeSummary(userId);
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

export const atticusService = new AtticusService();
