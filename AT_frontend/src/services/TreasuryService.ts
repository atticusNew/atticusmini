/**
 * ✅ TREASURY SERVICE
 * Handles deposits, withdrawals, and wallet management
 * Connects to Atticus Treasury canister
 */

import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

export interface TreasuryUserData {
  principal: string;
  balance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  createdAt: number;
}

export interface TreasuryTransaction {
  id: string;
  user: string;
  transactionType: 'Deposit' | 'Withdrawal';
  amount: number;
  depositId?: string;
  txHash?: string;
  timestamp: number;
  status: 'Pending' | 'Confirmed' | 'Failed';
}

export interface WithdrawalRequest {
  id: number;
  user: string;
  amount: number;
  toAddress: string;
  status: 'Pending' | 'Approved' | 'Processed' | 'Rejected';
  createdAt: number;
  processedAt?: number;
  txHash?: string;
  reason?: string;
}

export interface PlatformWallet {
  balance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  address: string;
}

export class TreasuryService {
  private agent: HttpAgent;
  private treasuryCanister: any;
  private canisterId: string = '';

  constructor() {
    this.agent = new HttpAgent({ host: 'https://ic0.app' });
  }

  public async initialize(canisterId: string): Promise<void> {
    this.canisterId = canisterId;
    this.treasuryCanister = Actor.createActor(this.idlFactory, {
      agent: this.agent,
      canisterId: this.canisterId,
    });
    console.log(`✅ TreasuryService initialized with canister ID: ${this.canisterId}`);
  }

  private get idlFactory() {
    return ({ IDL }: any) => {
      return IDL.Service({
        // User management
        create_user: IDL.Func([IDL.Principal], [IDL.Variant({ ok: IDL.Record({
          principal: IDL.Principal,
          balance: IDL.Float64,
          total_deposits: IDL.Float64,
          total_withdrawals: IDL.Float64,
          created_at: IDL.Int
        }), err: IDL.Text })], []),
        get_user: IDL.Func([IDL.Principal], [IDL.Variant({ ok: IDL.Record({
          principal: IDL.Principal,
          balance: IDL.Float64,
          total_deposits: IDL.Float64,
          total_withdrawals: IDL.Float64,
          created_at: IDL.Int
        }), err: IDL.Text })], ['query']),
        
        // Wallet generation
        generate_user_wallet: IDL.Func([IDL.Principal], [IDL.Variant({ ok: IDL.Text, err: IDL.Text })], []),
        generate_unique_deposit_address: IDL.Func([IDL.Principal], [IDL.Variant({ ok: IDL.Text, err: IDL.Text })], []),
        get_user_deposit_address: IDL.Func([IDL.Principal], [IDL.Variant({ ok: IDL.Text, err: IDL.Text })], ['query']),
        
        // Deposit/Withdrawal
        deposit_bitcoin: IDL.Func([IDL.Principal, IDL.Nat], [IDL.Variant({ ok: IDL.Text, err: IDL.Text })], []),
        withdraw_bitcoin: IDL.Func([IDL.Principal, IDL.Nat, IDL.Text], [IDL.Variant({ ok: IDL.Text, err: IDL.Text })], []),
        
        // Query functions
        get_platform_wallet: IDL.Func([], [IDL.Record({
          balance: IDL.Float64,
          total_deposits: IDL.Float64,
          total_withdrawals: IDL.Float64,
          address: IDL.Text
        })], ['query']),
        get_user_transactions: IDL.Func([IDL.Principal], [IDL.Vec(IDL.Record({
          id: IDL.Text,
          user: IDL.Principal,
          transaction_type: IDL.Variant({ Deposit: IDL.Null, Withdrawal: IDL.Null }),
          amount: IDL.Float64,
          deposit_id: IDL.Opt(IDL.Text),
          tx_hash: IDL.Opt(IDL.Text),
          timestamp: IDL.Int,
          status: IDL.Variant({ Pending: IDL.Null, Confirmed: IDL.Null, Failed: IDL.Null })
        }))], ['query']),
        get_withdrawal_requests: IDL.Func([IDL.Principal], [IDL.Vec(IDL.Record({
          id: IDL.Nat,
          user: IDL.Principal,
          amount: IDL.Float64,
          to_address: IDL.Text,
          status: IDL.Variant({ Pending: IDL.Null, Approved: IDL.Null, Processed: IDL.Null, Rejected: IDL.Null }),
          created_at: IDL.Int,
          processed_at: IDL.Opt(IDL.Int),
          tx_hash: IDL.Opt(IDL.Text),
          reason: IDL.Opt(IDL.Text)
        }))], ['query']),
        
        // Admin functions
        admin_approve_withdrawal: IDL.Func([IDL.Nat], [IDL.Variant({ ok: IDL.Text, err: IDL.Text })], []),
        admin_reject_withdrawal: IDL.Func([IDL.Nat, IDL.Text], [IDL.Variant({ ok: IDL.Text, err: IDL.Text })], []),
        admin_mark_withdrawal_processed: IDL.Func([IDL.Nat, IDL.Text], [IDL.Variant({ ok: IDL.Text, err: IDL.Text })], [])
      });
    };
  }

  // ✅ USER MANAGEMENT
  public async createUser(principal: string): Promise<TreasuryUserData> {
    if (!this.treasuryCanister) throw new Error('Service not initialized');
    
    try {
      const result = await this.treasuryCanister.create_user(Principal.fromText(principal));
      if ('ok' in result) {
        return {
          principal: result.ok.principal.toString(),
          balance: Number(result.ok.balance),
          totalDeposits: Number(result.ok.total_deposits),
          totalWithdrawals: Number(result.ok.total_withdrawals),
          createdAt: Number(result.ok.created_at)
        };
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      console.error('❌ Error creating treasury user:', error);
      throw error;
    }
  }

  public async getUser(principal: string): Promise<TreasuryUserData> {
    if (!this.treasuryCanister) throw new Error('Service not initialized');
    
    try {
      const result = await this.treasuryCanister.get_user(Principal.fromText(principal));
      if ('ok' in result) {
        return {
          principal: result.ok.principal.toString(),
          balance: Number(result.ok.balance),
          totalDeposits: Number(result.ok.total_deposits),
          totalWithdrawals: Number(result.ok.total_withdrawals),
          createdAt: Number(result.ok.created_at)
        };
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      console.error('❌ Error getting treasury user:', error);
      throw error;
    }
  }

  // ✅ WALLET GENERATION
  public async generateUserWallet(principal: string): Promise<string> {
    if (!this.treasuryCanister) throw new Error('Service not initialized');
    
    try {
      const result = await this.treasuryCanister.generate_user_wallet(Principal.fromText(principal));
      if ('ok' in result) {
        return result.ok;
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      console.error('❌ Error generating wallet:', error);
      throw error;
    }
  }

  public async generateDepositAddress(principal: string): Promise<string> {
    if (!this.treasuryCanister) throw new Error('Service not initialized');
    
    try {
      const result = await this.treasuryCanister.generate_unique_deposit_address(Principal.fromText(principal));
      if ('ok' in result) {
        return result.ok;
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      console.error('❌ Error generating deposit address:', error);
      throw error;
    }
  }

  // ✅ DEPOSIT/WITHDRAWAL
  public async depositBitcoin(principal: string, amountSatoshis: number): Promise<string> {
    if (!this.treasuryCanister) throw new Error('Service not initialized');
    
    try {
      const result = await this.treasuryCanister.deposit_bitcoin(
        Principal.fromText(principal), 
        BigInt(amountSatoshis)
      );
      if ('ok' in result) {
        return result.ok;
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      console.error('❌ Error depositing Bitcoin:', error);
      throw error;
    }
  }

  public async withdrawBitcoin(principal: string, amountSatoshis: number, toAddress: string): Promise<string> {
    if (!this.treasuryCanister) throw new Error('Service not initialized');
    
    try {
      const result = await this.treasuryCanister.withdraw_bitcoin(
        Principal.fromText(principal), 
        BigInt(amountSatoshis),
        toAddress
      );
      if ('ok' in result) {
        return result.ok;
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      console.error('❌ Error withdrawing Bitcoin:', error);
      throw error;
    }
  }

  // ✅ QUERY FUNCTIONS
  public async getPlatformWallet(): Promise<PlatformWallet> {
    if (!this.treasuryCanister) throw new Error('Service not initialized');
    
    try {
      const result = await this.treasuryCanister.get_platform_wallet();
      return {
        balance: Number(result.balance),
        totalDeposits: Number(result.total_deposits),
        totalWithdrawals: Number(result.total_withdrawals),
        address: result.address
      };
    } catch (error) {
      console.error('❌ Error getting platform wallet:', error);
      throw error;
    }
  }

  public async getUserTransactions(principal: string): Promise<TreasuryTransaction[]> {
    if (!this.treasuryCanister) throw new Error('Service not initialized');
    
    try {
      const result = await this.treasuryCanister.get_user_transactions(Principal.fromText(principal));
      return result.map((tx: any) => ({
        id: tx.id,
        user: tx.user.toString(),
        transactionType: 'Deposit' in tx.transaction_type ? 'Deposit' : 'Withdrawal',
        amount: Number(tx.amount),
        depositId: tx.deposit_id?.[0],
        txHash: tx.tx_hash?.[0],
        timestamp: Number(tx.timestamp),
        status: Object.keys(tx.status)[0] as 'Pending' | 'Confirmed' | 'Failed'
      }));
    } catch (error) {
      console.error('❌ Error getting user transactions:', error);
      throw error;
    }
  }

  public async getWithdrawalRequests(principal: string): Promise<WithdrawalRequest[]> {
    if (!this.treasuryCanister) throw new Error('Service not initialized');
    
    try {
      const result = await this.treasuryCanister.get_withdrawal_requests(Principal.fromText(principal));
      return result.map((req: any) => ({
        id: Number(req.id),
        user: req.user.toString(),
        amount: Number(req.amount),
        toAddress: req.to_address,
        status: Object.keys(req.status)[0] as 'Pending' | 'Approved' | 'Processed' | 'Rejected',
        createdAt: Number(req.created_at),
        processedAt: req.processed_at?.[0] ? Number(req.processed_at[0]) : undefined,
        txHash: req.tx_hash?.[0],
        reason: req.reason?.[0]
      }));
    } catch (error) {
      console.error('❌ Error getting withdrawal requests:', error);
      throw error;
    }
  }
}
