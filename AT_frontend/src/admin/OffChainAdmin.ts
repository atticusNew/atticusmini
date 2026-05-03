/**
 * ✅ OFF-CHAIN ADMIN SYSTEM
 * Following odin.fun pattern: All admin and analytics logic moved to frontend
 * This eliminates the need for complex backend admin functions and provides instant calculations
 */

import { Principal } from '@dfinity/principal';
import { Actor, HttpAgent } from '@dfinity/agent';

// ✅ TYPES - Admin and analytics data structures
export interface UserMetrics {
  principal: string;
  balance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalWins: number;
  totalLosses: number;
  netPnl: number;
  totalVolume: number;
  winRate: number;
  lastActivity: number;
}

export interface PlatformAnalytics {
  totalVolume: number;
  totalTrades: number;
  totalWinningTrades: number;
  totalLosingTrades: number;
  netPnl: number;
  winRate: number;
  averageTradeSize: number;
  totalUsers: number;
  activeUsers: number;
  platformBalance: number;
}

export interface TradeAnalytics {
  tradeId: number;
  user: string;
  optionType: 'call' | 'put';
  strikePrice: number;
  entryPrice: number;
  finalPrice: number;
  size: number;
  premium: number;
  outcome: 'win' | 'loss';
  payout: number;
  profit: number;
  timestamp: number;
  settlementTime: number;
}

export interface WithdrawalAnalytics {
  requestId: number;
  user: string;
  amount: number;
  toAddress: string;
  status: 'pending' | 'approved' | 'processed' | 'rejected';
  requestedAt: number;
  processedAt: number | null;
  txHash: string | null;
}

export interface AdminAction {
  id: string;
  action: string;
  details: string;
  timestamp: number;
  user: string;
}

export class OffChainAdmin {
  private coreCanister: any;
  private treasuryCanister: any;
  private agent: HttpAgent;
  private adminActions: AdminAction[] = [];

  constructor(coreCanister: any, treasuryCanister: any) {
    this.coreCanister = coreCanister;
    this.treasuryCanister = treasuryCanister;
    this.agent = new HttpAgent({ host: 'https://ic0.app' });
  }

  /**
   * ✅ GET USER METRICS
   * Calculate comprehensive user analytics off-chain
   */
  public async getUserMetrics(): Promise<UserMetrics[]> {
    try {
      const users = await this.coreCanister.get_all_users();
      const trades = await this.coreCanister.get_all_trades();
      
      return users.map(([principal, userData]: [Principal, any]) => {
        const userTrades = trades.filter((trade: any) => 
          trade.user.toString() === principal.toString()
        );
        
        // Calculate metrics off-chain
        const totalVolume = userTrades.reduce((sum: number, trade: any) => sum + Number(trade.size), 0);
        const winningTrades = userTrades.filter((trade: any) => trade.settlement_outcome === 'win');
        const losingTrades = userTrades.filter((trade: any) => trade.settlement_outcome === 'loss');
        
        const totalWins = winningTrades.length;
        const totalLosses = losingTrades.length;
        const netPnl = userTrades.reduce((sum: number, trade: any) => 
          sum + (Number(trade.settlement_profit) || 0), 0
        );
        
        const winRate = totalWins + totalLosses > 0 ? totalWins / (totalWins + totalLosses) : 0;
        const lastActivity = userTrades.length > 0 
          ? Math.max(...userTrades.map((trade: any) => Number(trade.opened_at)))
          : Number(userData.created_at);
        
        return {
          principal: principal.toString(),
          balance: Number(userData.balance),
          totalDeposits: Number(userData.balance), // Simplified for now
          totalWithdrawals: 0, // Would need withdrawal data
          totalWins: totalWins,
          totalLosses: totalLosses,
          netPnl: netPnl,
          totalVolume: totalVolume,
          winRate: winRate,
          lastActivity: lastActivity
        };
      });
    } catch (error) {
      console.error('❌ Error getting user metrics:', error);
      return [];
    }
  }

  /**
   * ✅ GET PLATFORM ANALYTICS
   * Calculate comprehensive platform analytics off-chain
   */
  public async getPlatformAnalytics(): Promise<PlatformAnalytics> {
    try {
      const trades = await this.coreCanister.get_all_trades();
      const users = await this.coreCanister.get_all_users();
      const platformState = await this.coreCanister.get_platform_state();
      const treasuryState = await this.treasuryCanister.get_treasury_state();
      
      // Calculate all metrics off-chain
      const totalVolume = trades.reduce((sum: number, trade: any) => sum + Number(trade.size), 0);
      const totalTrades = trades.length;
      
      const winningTrades = trades.filter((trade: any) => trade.settlement_outcome === 'win');
      const losingTrades = trades.filter((trade: any) => trade.settlement_outcome === 'loss');
      
      const totalWinningTrades = winningTrades.length;
      const totalLosingTrades = losingTrades.length;
      
      const totalWinningAmount = winningTrades.reduce((sum: number, trade: any) => 
        sum + (Number(trade.settlement_payout) || 0), 0
      );
      const totalLosingAmount = losingTrades.reduce((sum: number, trade: any) => 
        sum + (Number(trade.settlement_payout) || 0), 0
      );
      
      const netPnl = totalWinningAmount - totalLosingAmount;
      const winRate = totalTrades > 0 ? totalWinningTrades / totalTrades : 0;
      const averageTradeSize = totalTrades > 0 ? totalVolume / totalTrades : 0;
      
      // Calculate active users (users with trades in last 24 hours)
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const activeUsers = users.filter(([principal, userData]: [Principal, any]) => {
        const userTrades = trades.filter((trade: any) => 
          trade.user.toString() === principal.toString()
        );
        return userTrades.some((trade: any) => Number(trade.opened_at) > oneDayAgo);
      }).length;
      
      return {
        totalVolume,
        totalTrades,
        totalWinningTrades,
        totalLosingTrades,
        netPnl,
        winRate,
        averageTradeSize,
        totalUsers: users.length,
        activeUsers,
        platformBalance: Number(treasuryState.platform_balance)
      };
    } catch (error) {
      console.error('❌ Error getting platform analytics:', error);
      return {
        totalVolume: 0,
        totalTrades: 0,
        totalWinningTrades: 0,
        totalLosingTrades: 0,
        netPnl: 0,
        winRate: 0,
        averageTradeSize: 0,
        totalUsers: 0,
        activeUsers: 0,
        platformBalance: 0
      };
    }
  }

  /**
   * ✅ GET TRADE ANALYTICS
   * Get detailed trade analytics for admin review
   */
  public async getTradeAnalytics(): Promise<TradeAnalytics[]> {
    try {
      const trades = await this.coreCanister.get_all_trades();
      
      return trades.map((trade: any) => ({
        tradeId: Number(trade.id),
        user: trade.user.toString(),
        optionType: trade.option_type.Call ? 'call' : 'put',
        strikePrice: Number(trade.strike_price),
        entryPrice: Number(trade.entry_price),
        finalPrice: Number(trade.settlement_price) || 0,
        size: Number(trade.size),
        premium: Number(trade.premium),
        outcome: trade.settlement_outcome || 'pending',
        payout: Number(trade.settlement_payout) || 0,
        profit: Number(trade.settlement_profit) || 0,
        timestamp: Number(trade.opened_at),
        settlementTime: Number(trade.settled_at) || 0
      }));
    } catch (error) {
      console.error('❌ Error getting trade analytics:', error);
      return [];
    }
  }

  /**
   * ✅ GET WITHDRAWAL ANALYTICS
   * Get withdrawal request analytics
   */
  public async getWithdrawalAnalytics(): Promise<WithdrawalAnalytics[]> {
    try {
      const withdrawalRequests = await this.treasuryCanister.get_withdrawal_requests();
      
      return withdrawalRequests.map((request: any) => ({
        requestId: Number(request.id),
        user: request.user.toString(),
        amount: Number(request.amount),
        toAddress: request.to_address,
        status: request.status.Pending ? 'pending' : 
                request.status.Approved ? 'approved' :
                request.status.Processed ? 'processed' : 'rejected',
        requestedAt: Number(request.requested_at),
        processedAt: request.processed_at ? Number(request.processed_at) : null,
        txHash: request.tx_hash || null
      }));
    } catch (error) {
      console.error('❌ Error getting withdrawal analytics:', error);
      return [];
    }
  }

  /**
   * ✅ APPROVE WITHDRAWAL
   * Approve a withdrawal request
   */
  public async approveWithdrawal(requestId: number): Promise<boolean> {
    try {
      const result = await this.treasuryCanister.approve_withdrawal(BigInt(requestId));
      return 'ok' in result;
    } catch (error) {
      console.error('❌ Error approving withdrawal:', error);
      return false;
    }
  }

  /**
   * ✅ REJECT WITHDRAWAL
   * Reject a withdrawal request
   */
  public async rejectWithdrawal(requestId: number): Promise<boolean> {
    try {
      const result = await this.treasuryCanister.reject_withdrawal(BigInt(requestId));
      return 'ok' in result;
    } catch (error) {
      console.error('❌ Error rejecting withdrawal:', error);
      return false;
    }
  }

  /**
   * ✅ PROCESS WITHDRAWAL
   * Process a withdrawal with transaction hash
   */
  public async processWithdrawal(requestId: number, txHash: string): Promise<boolean> {
    try {
      const result = await this.treasuryCanister.process_withdrawal(BigInt(requestId), txHash);
      return 'ok' in result;
    } catch (error) {
      console.error('❌ Error processing withdrawal:', error);
      return false;
    }
  }

  /**
   * ✅ LOG ADMIN ACTION
   * Log admin actions for audit trail
   */
  public logAdminAction(action: string, details: string, user: string): void {
    const adminAction: AdminAction = {
      id: Date.now().toString(),
      action,
      details,
      timestamp: Date.now(),
      user
    };
    
    this.adminActions.push(adminAction);
    console.log(`📝 Admin action logged: ${action} - ${details}`);
  }

  /**
   * ✅ GET ADMIN ACTIONS
   * Get admin action history
   */
  public getAdminActions(): AdminAction[] {
    return this.adminActions;
  }

  /**
   * ✅ EXPORT DATA
   * Export analytics data for external analysis
   */
  public async exportData(): Promise<{
    userMetrics: UserMetrics[];
    platformAnalytics: PlatformAnalytics;
    tradeAnalytics: TradeAnalytics[];
    withdrawalAnalytics: WithdrawalAnalytics[];
    adminActions: AdminAction[];
  }> {
    const userMetrics = await this.getUserMetrics();
    const platformAnalytics = await this.getPlatformAnalytics();
    const tradeAnalytics = await this.getTradeAnalytics();
    const withdrawalAnalytics = await this.getWithdrawalAnalytics();
    const adminActions = this.getAdminActions();
    
    return {
      userMetrics,
      platformAnalytics,
      tradeAnalytics,
      withdrawalAnalytics,
      adminActions
    };
  }

  /**
   * ✅ GET REAL-TIME STATS
   * Get real-time platform statistics
   */
  public async getRealTimeStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalTrades: number;
    totalVolume: number;
    netPnl: number;
    platformBalance: number;
  }> {
    const platformAnalytics = await this.getPlatformAnalytics();
    
    return {
      totalUsers: platformAnalytics.totalUsers,
      activeUsers: platformAnalytics.activeUsers,
      totalTrades: platformAnalytics.totalTrades,
      totalVolume: platformAnalytics.totalVolume,
      netPnl: platformAnalytics.netPnl,
      platformBalance: platformAnalytics.platformBalance
    };
  }
}

// ✅ SINGLETON INSTANCE
export const offChainAdmin = new OffChainAdmin(null as any, null as any);
