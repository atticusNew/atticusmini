/**
 * ✅ ATTICUS SERVICE - ESSENTIAL FUNCTIONS ONLY
 * Following odin.fun pattern: Only essential trading functions
 * Admin features moved off-chain, wallet generation in treasury canister
 */

import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { pricingEngine } from './OffChainPricingEngine';
import { DemoService } from './DemoService';

// ✅ TYPES - Essential trading only
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
}

export interface TradeSummary {
  totalTrades: number;
  wins: number;
  losses: number;
}

export class AtticusService {
  private agent: HttpAgent;
  private coreCanister: any;
  private isInitialized: boolean = false;

  constructor() {
    this.agent = new HttpAgent({ host: 'https://ic0.app' });
  }

  // ✅ INITIALIZE WITH ATTICUS CORE CANISTER
  public async initialize(canisterId: string): Promise<void> {
    try {
      console.log('🚀 Initializing Atticus Service with canister:', canisterId);
      
      // ✅ ESSENTIAL FUNCTIONS ONLY - No admin, no wallet generation
      const idlFactory = ({ IDL }: any) => {
        return IDL.Service({
          // User management
          create_user: IDL.Func([IDL.Principal], [IDL.Variant({ ok: IDL.Record({
            balance: IDL.Float64,
            total_wins: IDL.Float64,
            total_losses: IDL.Float64,
            net_pnl: IDL.Float64,
            created_at: IDL.Int
          }), err: IDL.Text })], []),
          get_user: IDL.Func([IDL.Principal], [IDL.Variant({ ok: IDL.Record({
            balance: IDL.Float64,
            total_wins: IDL.Float64,
            total_losses: IDL.Float64,
            net_pnl: IDL.Float64,
            created_at: IDL.Int
          }), err: IDL.Text })], ['query']),
          
          // Trading functions
          place_trade_simple: IDL.Func([
            IDL.Principal, IDL.Text, IDL.Nat, IDL.Text, IDL.Nat, IDL.Nat64, IDL.Nat64
          ], [IDL.Variant({ ok: IDL.Nat, err: IDL.Text })], []),
          recordSettlement: IDL.Func([
            IDL.Nat, IDL.Text, IDL.Nat64, IDL.Nat64, IDL.Nat64
          ], [IDL.Variant({ ok: IDL.Null, err: IDL.Text })], []),
          settleTrade: IDL.Func([
            IDL.Nat, IDL.Nat64, IDL.Principal
          ], [IDL.Variant({ ok: IDL.Record({
            outcome: IDL.Text,
            payout: IDL.Float64,
            profit: IDL.Float64
          }), err: IDL.Text })], []),
          
          // Position management
          get_position: IDL.Func([IDL.Nat], [IDL.Variant({ ok: IDL.Record({
            id: IDL.Nat,
            user: IDL.Principal,
            option_type: IDL.Variant({ Call: IDL.Null, Put: IDL.Null }),
            strike_price: IDL.Float64,
            entry_price: IDL.Float64,
            expiry: IDL.Text,
            size: IDL.Float64,
            entry_premium: IDL.Float64,
            current_value: IDL.Float64,
            pnl: IDL.Float64,
            status: IDL.Variant({ Active: IDL.Null, Settled: IDL.Null }),
            opened_at: IDL.Int,
            settled_at: IDL.Opt(IDL.Int),
            settlement_price: IDL.Opt(IDL.Float64)
          }), err: IDL.Text })], ['query']),
          get_user_positions: IDL.Func([IDL.Principal], [IDL.Vec(IDL.Record({
            id: IDL.Nat,
            user: IDL.Principal,
            option_type: IDL.Variant({ Call: IDL.Null, Put: IDL.Null }),
            strike_price: IDL.Float64,
            entry_price: IDL.Float64,
            expiry: IDL.Text,
            size: IDL.Float64,
            entry_premium: IDL.Float64,
            current_value: IDL.Float64,
            pnl: IDL.Float64,
            status: IDL.Variant({ Active: IDL.Null, Settled: IDL.Null }),
            opened_at: IDL.Int,
            settled_at: IDL.Opt(IDL.Int),
            settlement_price: IDL.Opt(IDL.Float64)
          }))], ['query']),
          get_all_positions: IDL.Func([], [IDL.Vec(IDL.Record({
            id: IDL.Nat,
            user: IDL.Principal,
            option_type: IDL.Variant({ Call: IDL.Null, Put: IDL.Null }),
            strike_price: IDL.Float64,
            entry_price: IDL.Float64,
            expiry: IDL.Text,
            size: IDL.Float64,
            entry_premium: IDL.Float64,
            current_value: IDL.Float64,
            pnl: IDL.Float64,
            status: IDL.Variant({ Active: IDL.Null, Settled: IDL.Null }),
            opened_at: IDL.Int,
            settled_at: IDL.Opt(IDL.Int),
            settlement_price: IDL.Opt(IDL.Float64)
          }))], ['query']),
          
          // User trade summary (for frontend history)
          get_user_trade_summary: IDL.Func([IDL.Principal], [IDL.Variant({ 
            ok: IDL.Record({ total_trades: IDL.Nat, wins: IDL.Nat, losses: IDL.Nat }), 
            err: IDL.Text 
          })], ['query']),
          
          // Admin/Query functions
          get_all_users: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Record({
            balance: IDL.Float64,
            total_wins: IDL.Float64,
            total_losses: IDL.Float64,
            net_pnl: IDL.Float64,
            created_at: IDL.Int
          })))], ['query']),
          get_platform_wallet: IDL.Func([], [IDL.Record({
            balance: IDL.Float64,
            total_deposits: IDL.Float64,
            total_withdrawals: IDL.Float64
          })], ['query']),
          get_platform_ledger: IDL.Func([], [IDL.Record({
            total_winning_trades: IDL.Float64,
            total_losing_trades: IDL.Float64,
            net_pnl: IDL.Float64,
            total_trades: IDL.Nat
          })], ['query']),
          get_platform_trading_summary: IDL.Func([], [IDL.Record({
            total_trades: IDL.Nat,
            active_trades: IDL.Nat,
            settled_trades: IDL.Nat
          })], ['query']),
          
          // Admin ledger functions
          admin_credit_user_balance: IDL.Func([IDL.Principal, IDL.Float64], [IDL.Variant({ ok: IDL.Text, err: IDL.Text })], []),
          
          // ✅ BEST ODDS: Trade statistics functions
          get_trade_statistics: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Record({
            expiry: IDL.Text,
            strike_offset: IDL.Float64,
            option_type: IDL.Text,
            total_trades: IDL.Nat,
            wins: IDL.Nat,
            losses: IDL.Nat,
            ties: IDL.Nat,
            win_rate: IDL.Float64,
            last_updated: IDL.Int
          })))], ['query']),
          update_trade_statistics: IDL.Func([IDL.Text, IDL.Float64, IDL.Text, IDL.Text], [], []),
          migrate_trade_statistics_keys: IDL.Func([], [IDL.Text], [])
        });
      };

      this.coreCanister = Actor.createActor(idlFactory, {
        agent: this.agent,
        canisterId: canisterId
      });

      this.isInitialized = true;
      console.log('✅ Atticus Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Atticus Service:', error);
      throw error;
    }
  }

  // ✅ CREATE USER
  public async createUser(principal: string): Promise<UserData> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    try {
      const result = await this.coreCanister.create_user(Principal.fromText(principal));
      if ('ok' in result) {
        return {
          principal,
          balance: Number(result.ok.balance),
          totalWins: Number(result.ok.total_wins),
          totalLosses: Number(result.ok.total_losses),
          netPnl: Number(result.ok.net_pnl),
          createdAt: Number(result.ok.created_at)
        };
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }

  // ✅ GET USER
  public async getUser(principal: string): Promise<UserData> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    try {
      const result = await this.coreCanister.get_user(Principal.fromText(principal));
      if ('ok' in result) {
        return {
          principal,
          balance: Number(result.ok.balance),
          totalWins: Number(result.ok.total_wins),
          totalLosses: Number(result.ok.total_losses),
          netPnl: Number(result.ok.net_pnl),
          createdAt: Number(result.ok.created_at)
        };
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      console.error('❌ Error getting user:', error);
      throw error;
    }
  }

  // ✅ PLACE TRADE (using off-chain pricing)
  public async placeTrade(tradeData: TradeData, isDemoMode: boolean = false): Promise<TradeResult> {
    if (!this.isInitialized && !isDemoMode) throw new Error('Service not initialized');
    
    try {
      // Get current price from off-chain pricing engine
      const currentPrice = pricingEngine.getCurrentPrice();
      if (currentPrice === 0) {
        throw new Error('Price feed not available');
      }

      // Calculate strike price off-chain
      const strikePrice = pricingEngine.calculateStrikePrice(
        currentPrice, 
        tradeData.strikeOffset, 
        tradeData.optionType
      );

      // ✅ DEMO MODE: Use demo service
      if (isDemoMode) {
        console.log('🎮 Demo mode: Using demo service for trade placement');
        const demoService = DemoService.getInstance();
        
        const result = await demoService.place_trade_simple(
          tradeData.userPrincipal,
          tradeData.optionType === 'call' ? 'Call' : 'Put',
          tradeData.strikeOffset,
          tradeData.expiry,
          tradeData.contractCount,
          Math.round(currentPrice * 100), // Convert to cents
          Math.round(strikePrice * 100)   // Convert to cents
        );

        if ('ok' in result) {
          return {
            success: true,
            tradeId: Number(result.ok)
          };
        } else {
          return {
            success: false,
            error: result.err
          };
        }
      }

      // ✅ LIVE MODE: Use real canister
      const result = await this.coreCanister.place_trade_simple(
        Principal.fromText(tradeData.userPrincipal),
        tradeData.optionType === 'call' ? 'Call' : 'Put',
        tradeData.strikeOffset,
        tradeData.expiry,
        tradeData.contractCount,
        Math.round(currentPrice * 100), // Convert to cents
        Math.round(strikePrice * 100)   // Convert to cents
      );

      if ('ok' in result) {
        return {
          success: true,
          tradeId: Number(result.ok)
        };
      } else {
        return {
          success: false,
          error: result.err
        };
      }
    } catch (error) {
      console.error('❌ Error placing trade:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ✅ RECORD SETTLEMENT (using off-chain calculation)
  public async recordSettlement(
    positionId: number,
    settlementResult: SettlementResult
  ): Promise<void> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    try {
      // ✅ FIXED: Convert to numbers for Nat64 compatibility (not BigInt)
      const payoutCents = Math.round(settlementResult.payout * 100);
      const profitCents = Math.max(0, Math.round(settlementResult.profit * 100));
      const finalPriceCents = Math.round(settlementResult.finalPrice * 100);
      
      const result = await this.coreCanister.recordSettlement(
        positionId, // ✅ FIXED: Pass as number
        settlementResult.outcome,
        payoutCents, // ✅ FIXED: Pass as number for Nat64
        profitCents, // ✅ FIXED: Pass as number for Nat64
        finalPriceCents // ✅ FIXED: Pass as number for Nat64
      );
      
      if ('err' in result) {
        throw new Error(result.err);
      }
    } catch (error) {
      console.error('❌ Error recording settlement:', error);
      throw error;
    }
  }

  // ✅ GET POSITION
  public async getPosition(positionId: number): Promise<Position> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    try {
      const result = await this.coreCanister.get_position(BigInt(positionId));
      if ('ok' in result) {
        return {
          id: Number(result.ok.id),
          user: result.ok.user.toString(),
          optionType: result.ok.option_type.Call !== undefined ? 'call' : 'put',
          strikePrice: Number(result.ok.strike_price),
          entryPrice: Number(result.ok.entry_price),
          expiry: result.ok.expiry,
          size: Number(result.ok.size),
          status: result.ok.status.Active ? 'Active' : 'Settled',
          openedAt: Number(result.ok.opened_at) / 1_000_000
        };
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      console.error('❌ Error getting position:', error);
      throw error;
    }
  }

  // ✅ GET USER POSITIONS
  public async getUserPositions(principal: string): Promise<Position[]> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    try {
      const positions = await this.coreCanister.get_user_positions(Principal.fromText(principal));
      return positions.map((pos: any) => ({
        id: Number(pos.id),
        user: pos.user.toString(),
        optionType: pos.option_type.Call !== undefined ? 'call' : 'put',
        strikePrice: Number(pos.strike_price),
        entryPrice: Number(pos.entry_price),
        expiry: pos.expiry,
        size: Number(pos.size),
        status: pos.status.Active ? 'Active' : 'Settled',
        openedAt: Number(pos.opened_at) / 1_000_000
      }));
    } catch (error) {
      console.error('❌ Error getting user positions:', error);
      throw error;
    }
  }

  // ✅ GET USER TRADE SUMMARY (for frontend history menu)
  public async getUserTradeSummary(principal: string): Promise<TradeSummary> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    try {
      const result = await this.coreCanister.get_user_trade_summary(Principal.fromText(principal));
      if ('ok' in result) {
        return {
          totalTrades: Number(result.ok.total_trades),
          wins: Number(result.ok.wins),
          losses: Number(result.ok.losses)
        };
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      console.error('❌ Error getting user trade summary:', error);
      throw error;
    }
  }

  // ✅ GET ALL POSITIONS (for trade history)
  public async getAllPositions(): Promise<Array<Position>> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    try {
      const result = await this.coreCanister.get_all_positions();
      return result.map((pos: any) => ({
        id: Number(pos.id),
        user: pos.user.toString(),
        optionType: pos.option_type.Call !== undefined ? 'call' : 'put',
        strikePrice: Number(pos.strike_price),
        entryPrice: Number(pos.entry_price),
        expiry: pos.expiry,
        size: Number(pos.size),
        entryPremium: Number(pos.entry_premium),
        currentValue: Number(pos.current_value),
        pnl: Number(pos.pnl),
        status: pos.status.Active ? 'active' : 'settled',
        openedAt: Number(pos.opened_at) / 1_000_000,
        settledAt: pos.settled_at ? Number(pos.settled_at[0]) / 1_000_000 : null,
        settlementPrice: pos.settlement_price ? Number(pos.settlement_price[0]) : undefined
      }));
    } catch (error) {
      console.error('❌ Error getting all positions:', error);
      throw error;
    }
  }

  // ✅ GET ALL USERS (Admin function)
  public async getAllUsers(): Promise<Array<{principal: string, balance: number, totalWins: number, totalLosses: number, netPnl: number, createdAt: number}>> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    try {
      const result = await this.coreCanister.get_all_users();
      return result.map(([principal, userData]: [Principal, any]) => ({
        principal: principal.toString(),
        balance: Number(userData.balance),
        totalWins: Number(userData.total_wins),
        totalLosses: Number(userData.total_losses),
        netPnl: Number(userData.net_pnl),
        createdAt: Number(userData.created_at)
      }));
    } catch (error) {
      console.error('❌ Error getting all users:', error);
      throw error;
    }
  }

  // ✅ GET PLATFORM WALLET (Admin function)
  public async getPlatformWallet(): Promise<{balance: number, totalDeposits: number, totalWithdrawals: number}> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    try {
      const result = await this.coreCanister.get_platform_wallet();
      return {
        balance: Number(result.balance),
        totalDeposits: Number(result.total_deposits),
        totalWithdrawals: Number(result.total_withdrawals)
      };
    } catch (error) {
      console.error('❌ Error getting platform wallet:', error);
      throw error;
    }
  }

  // ✅ GET PLATFORM LEDGER (Admin function)
  public async getPlatformLedger(): Promise<{totalWinningTrades: number, totalLosingTrades: number, netPnl: number, totalTrades: number}> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    try {
      const result = await this.coreCanister.get_platform_ledger();
      return {
        totalWinningTrades: Number(result.total_winning_trades),
        totalLosingTrades: Number(result.total_losing_trades),
        netPnl: Number(result.net_pnl),
        totalTrades: Number(result.total_trades)
      };
    } catch (error) {
      console.error('❌ Error getting platform ledger:', error);
      throw error;
    }
  }

  // ✅ GET PLATFORM TRADING SUMMARY (Admin function)
  public async getPlatformTradingSummary(): Promise<{totalTrades: number, activeTrades: number, settledTrades: number}> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    try {
      const result = await this.coreCanister.get_platform_trading_summary();
      return {
        totalTrades: Number(result.total_trades),
        activeTrades: Number(result.active_trades),
        settledTrades: Number(result.settled_trades)
      };
    } catch (error) {
      console.error('❌ Error getting platform trading summary:', error);
      throw error;
    }
  }

  // ✅ ADMIN CREDIT USER BALANCE
  public async adminCreditUserBalance(principalText: string, amountBTC: number): Promise<string> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    try {
      console.log(`💰 Crediting ${amountBTC} BTC to user ${principalText}`);
      const result = await this.coreCanister.admin_credit_user_balance(
        Principal.fromText(principalText),
        amountBTC
      );
      
      if ('ok' in result) {
        return result.ok;
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      console.error('❌ Error crediting user balance:', error);
      throw error;
    }
  }

  // ✅ GET TRADE STATISTICS (Best Odds Predictor)
  public async get_trade_statistics(): Promise<Array<[string, any]>> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    try {
      const result = await this.coreCanister.get_trade_statistics();
      console.log('✅ Fetched trade statistics:', result.length, 'entries');
      return result;
    } catch (error) {
      console.error('❌ Error getting trade statistics:', error);
      throw error;
    }
  }

  // ✅ UPDATE TRADE STATISTICS (Best Odds Predictor - called automatically by backend)
  public async update_trade_statistics(expiry: string, strikeOffset: number, optionType: string, outcome: string): Promise<void> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    try {
      await this.coreCanister.update_trade_statistics(expiry, strikeOffset, optionType, outcome);
      console.log('✅ Updated trade statistics');
    } catch (error) {
      console.error('❌ Error updating trade statistics:', error);
      throw error;
    }
  }

  // ✅ MIGRATE TRADE STATISTICS KEYS (One-time migration from old float format to new format)
  public async migrate_trade_statistics_keys(): Promise<string> {
    if (!this.isInitialized) throw new Error('Service not initialized');
    
    try {
      const result = await this.coreCanister.migrate_trade_statistics_keys();
      console.log('✅ Migration result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error migrating trade statistics keys:', error);
      throw error;
    }
  }

  // ✅ DIAGNOSTIC: Test if trade statistics method is accessible
  public async testTradeStatistics(): Promise<void> {
    console.log('🔍 DIAGNOSTIC: Testing trade statistics connection...');
    console.log('Service initialized:', this.isInitialized);
    console.log('Core canister exists:', !!this.coreCanister);
    console.log('Method exists:', typeof this.coreCanister?.get_trade_statistics);
    
    if (!this.isInitialized) {
      console.error('❌ Service not initialized!');
      return;
    }
    
    try {
      console.log('🔄 Calling get_trade_statistics()...');
      const stats = await this.coreCanister.get_trade_statistics();
      console.log('✅ SUCCESS! Fetched', stats.length, 'statistics');
      console.log('📊 Statistics data:', stats);
      
      // Log each entry
      for (const [key, stat] of stats) {
        console.log(`  - "${key}": ${stat.total_trades} trades, ${(stat.win_rate * 100).toFixed(1)}% win rate`);
      }
    } catch (error) {
      console.error('❌ FAILED to fetch statistics:', error);
      console.error('Error details:', error);
    }
  }
}

// ✅ SINGLETON INSTANCE
export const atticusService = new AtticusService();