/**
 * MockPartnerExchange — in-memory stand-in for the eventual partner exchange
 * (Foxify or similar) that will own KYC + custody and route trade tickets.
 *
 * This is a dev shim. PR #3 will introduce the proper PartnerExchangeAdapter
 * interface and this becomes one implementation of it.
 *
 * No persistence, no network, no on-chain anything.
 */

import { Decimal } from 'decimal.js';

export interface PartnerUser {
  id: string;
  balanceUSD: Decimal;
  createdAt: number;
}

export interface Position {
  id: number;
  userId: string;
  optionType: 'call' | 'put';
  strikePrice: Decimal;
  entryPrice: Decimal;
  expiry: string;
  contracts: number;
  premiumUSD: Decimal;
  status: 'active' | 'settled';
  openedAt: number;
  settledAt?: number;
  outcome?: 'win' | 'loss' | 'tie';
  payoutUSD?: Decimal;
  finalPrice?: Decimal;
}

export interface PlaceTradeArgs {
  userId: string;
  optionType: 'call' | 'put';
  strikeOffset: number;
  expiry: string;
  contracts: number;
  entryPriceCents: number;
  strikePriceCents: number;
}

export interface RecordSettlementArgs {
  positionId: number;
  outcome: 'win' | 'loss' | 'tie';
  payoutCents: number;
  profitCents: number;
  finalPriceCents: number;
}

const STARTING_BALANCE_USD = new Decimal(10_000);

class MockPartnerExchange {
  private users = new Map<string, PartnerUser>();
  private positions = new Map<number, Position>();
  private nextPositionId = 1;

  async ensureUser(userId: string): Promise<PartnerUser> {
    let user = this.users.get(userId);
    if (!user) {
      user = {
        id: userId,
        balanceUSD: STARTING_BALANCE_USD,
        createdAt: Date.now(),
      };
      this.users.set(userId, user);
    }
    return user;
  }

  async getUser(userId: string): Promise<PartnerUser | null> {
    return this.users.get(userId) ?? null;
  }

  async placeTrade(args: PlaceTradeArgs): Promise<{ ok: number } | { err: string }> {
    const user = await this.ensureUser(args.userId);
    const premium = new Decimal(args.contracts);
    if (user.balanceUSD.lessThan(premium)) {
      return { err: 'insufficient balance' };
    }
    user.balanceUSD = user.balanceUSD.minus(premium);
    const id = this.nextPositionId++;
    this.positions.set(id, {
      id,
      userId: args.userId,
      optionType: args.optionType,
      strikePrice: new Decimal(args.strikePriceCents).div(100),
      entryPrice: new Decimal(args.entryPriceCents).div(100),
      expiry: args.expiry,
      contracts: args.contracts,
      premiumUSD: premium,
      status: 'active',
      openedAt: Date.now(),
    });
    return { ok: id };
  }

  async recordSettlement(args: RecordSettlementArgs): Promise<{ ok: null } | { err: string }> {
    const pos = this.positions.get(args.positionId);
    if (!pos) return { err: 'position not found' };
    if (pos.status === 'settled') return { ok: null };
    const user = this.users.get(pos.userId);
    if (!user) return { err: 'user not found' };

    pos.status = 'settled';
    pos.outcome = args.outcome;
    pos.payoutUSD = new Decimal(args.payoutCents).div(100);
    pos.finalPrice = new Decimal(args.finalPriceCents).div(100);
    pos.settledAt = Date.now();

    if (args.outcome !== 'loss') {
      user.balanceUSD = user.balanceUSD.plus(pos.payoutUSD);
    }
    return { ok: null };
  }

  async getUserPositions(userId: string): Promise<Position[]> {
    return Array.from(this.positions.values())
      .filter(p => p.userId === userId)
      .sort((a, b) => b.openedAt - a.openedAt);
  }

  async getAllPositions(): Promise<Position[]> {
    return Array.from(this.positions.values()).sort((a, b) => b.openedAt - a.openedAt);
  }

  async getUserTradeSummary(userId: string): Promise<{ totalTrades: number; wins: number; losses: number }> {
    const positions = await this.getUserPositions(userId);
    return {
      totalTrades: positions.length,
      wins: positions.filter(p => p.outcome === 'win').length,
      losses: positions.filter(p => p.outcome === 'loss').length,
    };
  }
}

export const mockPartnerExchange = new MockPartnerExchange();
