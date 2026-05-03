/**
 * ✅ ADMIN ANALYTICS SERVICE
 * Off-chain data processing for comprehensive admin analytics
 * Processes trade data to provide detailed insights without canister changes
 */

import { Principal } from '@dfinity/principal';

// ============================================================================
// TYPES
// ============================================================================

export interface BetDetail {
  tradeId: number;
  userId: string;
  timestamp: number;
  betType: 'Call' | 'Put';
  strikePrice: number;
  strikeOffset: number;
  expiry: string;
  entryPrice: number;
  settlementPrice: number | null;
  priceDelta: number | null;
  outcome: 'win' | 'loss' | 'active';
  premiumPaid: number;
  payoutReceived: number;
  profit: number;
  atticusGainLoss: number; // Positive = platform profit, Negative = platform loss
}

export interface UserTradeSummary {
  userId: string;
  userPrincipal: string;
  totalTrades: number;
  activeTrades: number;
  settledTrades: number;
  
  // Breakdown by type
  callCount: number;
  putCount: number;
  
  // Breakdown by strike offset
  strikeBreakdown: { [key: string]: number };
  
  // Breakdown by expiry
  expiryBreakdown: { [key: string]: number };
  
  // Win/Loss metrics
  totalWins: number;
  totalLosses: number;
  totalWinAmount: number; // BTC
  totalLossAmount: number; // BTC
  netPnl: number; // BTC
  winRate: number; // Percentage 0-100
  
  // Volume
  totalVolume: number; // USD
}

export interface PlatformSummary {
  // Time period
  startDate: number | null;
  endDate: number | null;
  
  // User metrics
  uniqueUsers: number;
  
  // Trade counts
  totalBets: number;
  activeBets: number;
  settledBets: number;
  
  // Breakdown by type
  callCount: number;
  putCount: number;
  
  // Breakdown by strike offset (2.5%, 5%, 10%, 15%)
  strikeBreakdown: { [key: string]: number };
  
  // Breakdown by expiry (5s, 10s, 15s)
  expiryBreakdown: { [key: string]: number };
  
  // Outcomes (from user perspective)
  totalWins: number;
  totalLosses: number;
  
  // Financial metrics
  totalVolume: number; // USD
  atticusNetGainLoss: number; // USD (positive = platform profit)
  platformWinRate: number; // Percentage 0-100
}

export interface Position {
  id: number;
  user: Principal | string;
  option_type?: { Call?: null; Put?: null } | string;
  optionType?: 'call' | 'put'; // AtticusService format
  strike_price?: number;
  strikePrice?: number; // AtticusService format
  entry_price?: number;
  entryPrice?: number; // AtticusService format
  expiry: string;
  size: number;
  entry_premium?: number;
  entryPremium?: number; // AtticusService format
  current_value?: number;
  currentValue?: number; // AtticusService format
  pnl: number;
  status: { Active?: null; Settled?: null } | string;
  opened_at?: bigint | number;
  openedAt?: number; // AtticusService format
  settled_at?: (bigint | number)[] | null;
  settledAt?: number | null; // AtticusService format
  settlement_price?: (number)[] | null;
  settlementPrice?: number | null | undefined; // AtticusService format
}

// ============================================================================
// ADMIN ANALYTICS SERVICE
// ============================================================================

export class AdminAnalyticsService {
  private static instance: AdminAnalyticsService;

  private constructor() {}

  public static getInstance(): AdminAnalyticsService {
    if (!AdminAnalyticsService.instance) {
      AdminAnalyticsService.instance = new AdminAnalyticsService();
    }
    return AdminAnalyticsService.instance;
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  private normalizePosition(pos: any): Position {
    // Support both snake_case (canister) and camelCase (service) formats
    return {
      id: Number(pos.id),
      user: pos.user,
      option_type: pos.option_type || undefined,
      optionType: pos.optionType || undefined,
      strike_price: Number(pos.strike_price || pos.strikePrice || 0),
      strikePrice: Number(pos.strikePrice || pos.strike_price || 0),
      entry_price: Number(pos.entry_price || pos.entryPrice || 0),
      entryPrice: Number(pos.entryPrice || pos.entry_price || 0),
      expiry: pos.expiry,
      size: Number(pos.size),
      entry_premium: Number(pos.entry_premium || pos.entryPremium || 0),
      entryPremium: Number(pos.entryPremium || pos.entry_premium || 0),
      current_value: Number(pos.current_value || pos.currentValue || 0),
      currentValue: Number(pos.currentValue || pos.current_value || 0),
      pnl: Number(pos.pnl) || 0,
      status: pos.status,
      opened_at: pos.opened_at || undefined,
      openedAt: pos.openedAt || undefined,
      settled_at: pos.settled_at || undefined,
      settledAt: pos.settledAt || undefined,
      settlement_price: pos.settlement_price || undefined,
      settlementPrice: pos.settlementPrice !== undefined ? pos.settlementPrice : undefined
    };
  }

  private getOptionType(pos: Position): 'Call' | 'Put' {
    // Try optionType first (AtticusService format)
    if (pos.optionType) {
      return pos.optionType === 'call' ? 'Call' : 'Put';
    }
    // Try option_type (canister format)
    const option_type = pos.option_type;
    if (typeof option_type === 'object') {
      return option_type.Call !== undefined ? 'Call' : 'Put';
    }
    if (typeof option_type === 'string') {
      return option_type === 'Call' || option_type === 'call' ? 'Call' : 'Put';
    }
    return 'Call'; // Default
  }

  private getStatus(status: any): 'Active' | 'Settled' {
    if (typeof status === 'object') {
      return status.Active !== undefined ? 'Active' : 'Settled';
    }
    return status === 'Active' ? 'Active' : 'Settled';
  }

  private getUserPrincipal(user: any): string {
    if (typeof user === 'string') return user;
    if (user.toText) return user.toText();
    return String(user);
  }

  private getTimestamp(pos: Position): number {
    // Try openedAt first (AtticusService format - already in milliseconds)
    if (pos.openedAt !== undefined) {
      return Number(pos.openedAt);
    }
    // Try opened_at (canister format - in nanoseconds)
    if (pos.opened_at !== undefined) {
      const time = pos.opened_at;
      if (typeof time === 'bigint') {
        return Number(time) / 1_000_000; // Convert nanoseconds to milliseconds
      }
      return Number(time);
    }
    return Date.now();
  }

  private getSettlementPrice(pos: Position): number | null {
    // Try settlementPrice first (AtticusService format)
    if (pos.settlementPrice !== undefined && pos.settlementPrice !== null) {
      return Number(pos.settlementPrice);
    }
    // Try settlement_price (canister format)
    const settlement_price = pos.settlement_price;
    if (!settlement_price) return null;
    if (Array.isArray(settlement_price)) {
      return settlement_price.length > 0 ? Number(settlement_price[0]) : null;
    }
    return Number(settlement_price);
  }

  private getSettledAt(pos: Position): number | null {
    // Try settledAt first (AtticusService format - already in milliseconds or null)
    if (pos.settledAt !== undefined) {
      return pos.settledAt !== null ? Number(pos.settledAt) : null;
    }
    // Try settled_at (canister format)
    const settled_at = pos.settled_at;
    if (!settled_at) return null;
    if (Array.isArray(settled_at)) {
      if (settled_at.length === 0) return null;
      const time = settled_at[0];
      if (typeof time === 'bigint') {
        return Number(time) / 1_000_000;
      }
      return Number(time);
    }
    if (typeof settled_at === 'bigint') {
      return Number(settled_at) / 1_000_000;
    }
    return Number(settled_at);
  }

  private calculateStrikeOffset(strikePrice: number, entryPrice: number): number {
    // Return actual dollar difference
    return Math.abs(strikePrice - entryPrice);
  }
  
  private getStrikeOffsetBucket(dollarDiff: number): string {
    // Match standard strike offsets: $2.50, $5.00, $10.00, $15.00
    // Round to nearest standard offset with tolerance
    if (Math.abs(dollarDiff - 2.50) < 1.25) return '$2.50';
    if (Math.abs(dollarDiff - 5.00) < 2.50) return '$5.00';
    if (Math.abs(dollarDiff - 10.00) < 2.50) return '$10.00';
    if (Math.abs(dollarDiff - 15.00) < 5.00) return '$15.00';
    return 'Other';
  }

  private determineOutcome(pos: Position): 'win' | 'loss' | 'active' {
    const status = this.getStatus(pos.status);
    if (status === 'Active') return 'active';
    
    // If settled, check PnL
    if (pos.pnl > 0) return 'win';
    return 'loss';
  }

  // ============================================================================
  // BET DETAILS MAPPING
  // ============================================================================

  public mapToBetDetails(positions: any[]): BetDetail[] {
    return positions.map(pos => {
      const normalized = this.normalizePosition(pos);
      const optionType = this.getOptionType(normalized);
      const status = this.getStatus(normalized.status);
      const settlementPrice = this.getSettlementPrice(normalized);
      const outcome = this.determineOutcome(normalized);
      const timestamp = this.getTimestamp(normalized);
      
      // Get values with fallbacks for both formats
      const strikePrice = normalized.strikePrice || normalized.strike_price || 0;
      const entryPrice = normalized.entryPrice || normalized.entry_price || 0;
      const entryPremium = normalized.entryPremium || normalized.entry_premium || 0;
      const currentValue = normalized.currentValue || normalized.current_value || 0;
      
      // Calculate strike offset
      const strikeOffset = this.calculateStrikeOffset(strikePrice, entryPrice);
      
      // Calculate price delta
      const priceDelta = settlementPrice !== null 
        ? settlementPrice - entryPrice 
        : null;
      
      // Calculate financials
      const premiumPaid = entryPremium;
      const payoutReceived = outcome === 'win' ? currentValue : 0;
      const profit = normalized.pnl;
      
      // Platform perspective: profit the premium, lose the payout
      const atticusGainLoss = outcome === 'win' 
        ? -payoutReceived      // Platform LOSES the full payout amount
        : premiumPaid;         // Platform GAINS the full premium amount

      return {
        tradeId: normalized.id,
        userId: this.getUserPrincipal(normalized.user),
        timestamp,
        betType: optionType,
        strikePrice,
        strikeOffset,
        expiry: normalized.expiry,
        entryPrice,
        settlementPrice,
        priceDelta,
        outcome,
        premiumPaid,
        payoutReceived,
        profit,
        atticusGainLoss
      };
    });
  }

  // ============================================================================
  // USER SUMMARIES
  // ============================================================================

  public calculateUserSummaries(positions: any[]): UserTradeSummary[] {
    const betDetails = this.mapToBetDetails(positions);
    const userMap = new Map<string, BetDetail[]>();
    
    // Group bets by user
    betDetails.forEach(bet => {
      if (!userMap.has(bet.userId)) {
        userMap.set(bet.userId, []);
      }
      userMap.get(bet.userId)!.push(bet);
    });
    
    // Calculate summary for each user
    const summaries: UserTradeSummary[] = [];
    
    userMap.forEach((bets, userId) => {
      const totalTrades = bets.length;
      const activeTrades = bets.filter(b => b.outcome === 'active').length;
      const settledTrades = totalTrades - activeTrades;
      
      // Type breakdown
      const callCount = bets.filter(b => b.betType === 'Call').length;
      const putCount = bets.filter(b => b.betType === 'Put').length;
      
      // Strike breakdown
      const strikeBreakdown: { [key: string]: number } = {};
      bets.forEach(b => {
        const key = this.getStrikeOffsetBucket(b.strikeOffset);
        strikeBreakdown[key] = (strikeBreakdown[key] || 0) + 1;
      });
      
      // Expiry breakdown
      const expiryBreakdown: { [key: string]: number } = {};
      bets.forEach(b => {
        expiryBreakdown[b.expiry] = (expiryBreakdown[b.expiry] || 0) + 1;
      });
      
      // Win/Loss metrics
      const settledBets = bets.filter(b => b.outcome !== 'active');
      const wins = settledBets.filter(b => b.outcome === 'win');
      const losses = settledBets.filter(b => b.outcome === 'loss');
      
      const totalWins = wins.length;
      const totalLosses = losses.length;
      
      // Calculate win/loss amounts in BTC (approximate using entry price)
      const totalWinAmount = wins.reduce((sum, b) => {
        return sum + (b.payoutReceived / b.entryPrice);
      }, 0);
      
      const totalLossAmount = losses.reduce((sum, b) => {
        return sum + (b.premiumPaid / b.entryPrice);
      }, 0);
      
      const netPnl = bets.reduce((sum, b) => {
        if (b.outcome === 'active') return sum;
        const betPnlBTC = (b.profit / (b.settlementPrice || b.entryPrice));
        return sum + betPnlBTC;
      }, 0);
      
      const winRate = settledTrades > 0 ? (totalWins / settledTrades) * 100 : 0;
      
      // Total volume (USD)
      const totalVolume = bets.reduce((sum, b) => sum + b.premiumPaid, 0);
      
      summaries.push({
        userId: userId.substring(0, 12) + '...',
        userPrincipal: userId,
        totalTrades,
        activeTrades,
        settledTrades,
        callCount,
        putCount,
        strikeBreakdown,
        expiryBreakdown,
        totalWins,
        totalLosses,
        totalWinAmount,
        totalLossAmount,
        netPnl,
        winRate,
        totalVolume
      });
    });
    
    return summaries.sort((a, b) => b.totalTrades - a.totalTrades);
  }

  // ============================================================================
  // PLATFORM SUMMARY
  // ============================================================================

  public calculatePlatformSummary(
    positions: any[], 
    startDate?: number, 
    endDate?: number
  ): PlatformSummary {
    let betDetails = this.mapToBetDetails(positions);
    
    // Filter by date range if provided
    if (startDate) {
      betDetails = betDetails.filter(b => b.timestamp >= startDate);
    }
    if (endDate) {
      betDetails = betDetails.filter(b => b.timestamp <= endDate);
    }
    
    // Unique users
    const uniqueUsers = new Set(betDetails.map(b => b.userId)).size;
    
    // Trade counts
    const totalBets = betDetails.length;
    const activeBets = betDetails.filter(b => b.outcome === 'active').length;
    const settledBets = totalBets - activeBets;
    
    // Type breakdown
    const callCount = betDetails.filter(b => b.betType === 'Call').length;
    const putCount = betDetails.filter(b => b.betType === 'Put').length;
    
    // Strike breakdown
    const strikeBreakdown: { [key: string]: number } = {};
    betDetails.forEach(b => {
      const key = this.getStrikeOffsetBucket(b.strikeOffset);
      strikeBreakdown[key] = (strikeBreakdown[key] || 0) + 1;
    });
    
    // Expiry breakdown
    const expiryBreakdown: { [key: string]: number } = {};
    betDetails.forEach(b => {
      expiryBreakdown[b.expiry] = (expiryBreakdown[b.expiry] || 0) + 1;
    });
    
    // Outcomes (from user perspective)
    const settledBets_arr = betDetails.filter(b => b.outcome !== 'active');
    const totalWins = settledBets_arr.filter(b => b.outcome === 'win').length;
    const totalLosses = settledBets_arr.filter(b => b.outcome === 'loss').length;
    
    // Financial metrics
    const totalVolume = betDetails.reduce((sum, b) => sum + b.premiumPaid, 0);
    const atticusNetGainLoss = betDetails
      .filter(b => b.outcome !== 'active')
      .reduce((sum, b) => sum + b.atticusGainLoss, 0);
    
    // Platform win rate (when users lose, platform wins)
    const platformWinRate = settledBets > 0 ? (totalLosses / settledBets) * 100 : 0;
    
    return {
      startDate: startDate || null,
      endDate: endDate || null,
      uniqueUsers,
      totalBets,
      activeBets,
      settledBets,
      callCount,
      putCount,
      strikeBreakdown,
      expiryBreakdown,
      totalWins,
      totalLosses,
      totalVolume,
      atticusNetGainLoss,
      platformWinRate
    };
  }

  // ============================================================================
  // FILTERING
  // ============================================================================

  public filterByDateRange(
    betDetails: BetDetail[], 
    startDate?: number, 
    endDate?: number
  ): BetDetail[] {
    let filtered = [...betDetails];
    
    if (startDate) {
      filtered = filtered.filter(b => b.timestamp >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(b => b.timestamp <= endDate);
    }
    
    return filtered;
  }

  public filterByUser(betDetails: BetDetail[], userId: string): BetDetail[] {
    return betDetails.filter(b => b.userId === userId || b.userId.includes(userId));
  }

  // ============================================================================
  // CSV EXPORT
  // ============================================================================

  public exportBetDetailsToCSV(betDetails: BetDetail[]): string {
    const headers = [
      'Trade ID',
      'User ID',
      'Timestamp',
      'Date/Time',
      'Bet Type',
      'Strike Price',
      'Strike Offset',
      'Expiry',
      'Entry Price',
      'Settlement Price',
      'Price Delta',
      'Outcome',
      'Premium Paid (USD)',
      'Payout Received (USD)',
      'User Profit (USD)',
      'Atticus Gain/Loss (USD)'
    ];
    
    const rows = betDetails.map(bet => [
      bet.tradeId,
      bet.userId,
      bet.timestamp,
      new Date(bet.timestamp).toISOString(),
      bet.betType,
      bet.strikePrice.toFixed(2),
      `$${bet.strikeOffset.toFixed(2)}`,
      bet.expiry,
      bet.entryPrice.toFixed(2),
      bet.settlementPrice?.toFixed(2) || 'N/A',
      bet.priceDelta?.toFixed(2) || 'N/A',
      bet.outcome,
      bet.premiumPaid.toFixed(2),
      bet.payoutReceived.toFixed(2),
      bet.profit.toFixed(2),
      bet.atticusGainLoss.toFixed(2)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return csvContent;
  }

  public exportUserSummariesToCSV(summaries: UserTradeSummary[]): string {
    const headers = [
      'User Principal',
      'Total Trades',
      'Active Trades',
      'Settled Trades',
      'Call Count',
      'Put Count',
      'Total Wins',
      'Total Losses',
      'Win Rate (%)',
      'Total Win Amount (BTC)',
      'Total Loss Amount (BTC)',
      'Net PnL (BTC)',
      'Total Volume (USD)'
    ];
    
    const rows = summaries.map(user => [
      user.userPrincipal,
      user.totalTrades,
      user.activeTrades,
      user.settledTrades,
      user.callCount,
      user.putCount,
      user.totalWins,
      user.totalLosses,
      user.winRate.toFixed(2),
      user.totalWinAmount.toFixed(8),
      user.totalLossAmount.toFixed(8),
      user.netPnl.toFixed(8),
      user.totalVolume.toFixed(2)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return csvContent;
  }

  public exportPlatformSummaryToCSV(summary: PlatformSummary): string {
    const data = [
      ['Platform Summary', ''],
      ['Start Date', summary.startDate ? new Date(summary.startDate).toISOString() : 'All Time'],
      ['End Date', summary.endDate ? new Date(summary.endDate).toISOString() : 'All Time'],
      ['', ''],
      ['User Metrics', ''],
      ['Unique Users', summary.uniqueUsers],
      ['', ''],
      ['Trade Counts', ''],
      ['Total Bets', summary.totalBets],
      ['Active Bets', summary.activeBets],
      ['Settled Bets', summary.settledBets],
      ['', ''],
      ['Type Breakdown', ''],
      ['Call Bets', summary.callCount],
      ['Put Bets', summary.putCount],
      ['', ''],
      ['Strike Offset Breakdown', ''],
      ...Object.entries(summary.strikeBreakdown).map(([key, value]) => [key, value]),
      ['', ''],
      ['Expiry Breakdown', ''],
      ...Object.entries(summary.expiryBreakdown).map(([key, value]) => [key, value]),
      ['', ''],
      ['Outcomes', ''],
      ['Total User Wins', summary.totalWins],
      ['Total User Losses', summary.totalLosses],
      ['', ''],
      ['Financial Metrics', ''],
      ['Total Volume (USD)', summary.totalVolume.toFixed(2)],
      ['Atticus Net Gain/Loss (USD)', summary.atticusNetGainLoss.toFixed(2)],
      ['Platform Win Rate (%)', summary.platformWinRate.toFixed(2)]
    ];
    
    return data.map(row => row.join(',')).join('\n');
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const adminAnalyticsService = AdminAnalyticsService.getInstance();

