import { useState, useCallback } from 'react';
import { Decimal } from 'decimal.js';
import { useCanister } from '../contexts/CanisterProvider';
import { useAuth } from '../contexts/AuthProvider';
import { useBalance } from '../contexts/BalanceProvider';

export interface PlatformWalletInfo {
  depositAddress: string;
  platformBalance: Decimal;
  lockedBalance: Decimal;
  totalDeposits: Decimal;
  totalWithdrawals: Decimal;
  isConnected: boolean;
}

export interface WithdrawalRequest {
  toAddress: string;
  amount: Decimal;
}

export const useWallet = () => {
  const [walletInfo, setWalletInfo] = useState<PlatformWalletInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { tradingCanister } = useCanister(); // ✅ FIXED: Now available
  const { userBalance, refreshBalance } = useBalance(); // ✅ PHASE 3: Use centralized balance

  // ✅ INITIALIZE PLATFORM WALLET
  const initializeWallet = useCallback(async (icpPrincipal: string) => {
    if (!tradingCanister || !user) {
      throw new Error('Canister or user not available');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🏦 Initializing platform wallet for:', icpPrincipal);
      
      // Generate user's deposit address
      const walletResult = await tradingCanister.generate_user_wallet(user) as any;
      
      if (!walletResult || 'err' in walletResult) {
        throw new Error(`Wallet generation failed: ${walletResult?.err || 'Unknown error'}`);
      }

      const depositAddress = walletResult.ok;

      // ✅ PHASE 3: Balance is now managed by BalanceProvider - no local balance needed

      // ✅ PHASE 3: Use centralized balance instead of local balance
      const walletInfo: PlatformWalletInfo = {
        depositAddress,
        platformBalance: new Decimal(userBalance), // Use centralized balance
        lockedBalance: new Decimal(0),
        totalDeposits: new Decimal(0),
        totalWithdrawals: new Decimal(0),
        isConnected: true
      };

      setWalletInfo(walletInfo);
      console.log('✅ Platform wallet initialized successfully:', walletInfo);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize platform wallet';
      setError(errorMessage);
      console.error('❌ Platform wallet initialization failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, tradingCanister]);

  // ✅ PROCESS WITHDRAWAL FROM PLATFORM
  const processWithdrawal = useCallback(async (request: WithdrawalRequest) => {
    if (!tradingCanister || !user || !walletInfo) {
      throw new Error('Platform wallet not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('💸 Processing platform withdrawal:', request);

      // ✅ PHASE 3: Check sufficient balance using centralized balance
      if (request.amount.gt(userBalance)) {
        throw new Error('Insufficient platform balance');
      }

      // Convert to satoshis for backend
      const amountSatoshis = request.amount.mul(100000000).toNumber();

      const result = await (tradingCanister as any).withdraw_bitcoin?.(
        user,
        amountSatoshis,
        request.toAddress
      );

      if (!result || 'err' in result) {
        throw new Error(`Withdrawal failed: ${result?.err || 'Unknown error'}`);
      }

      console.log('✅ Platform withdrawal successful:', result.ok);

      // ✅ PHASE 3: Refresh centralized balance after withdrawal
      await refreshBalance();

      return {
        txHash: result.ok,
        status: 'success',
        message: 'Withdrawal processed from liquidity pool'
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Withdrawal failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, tradingCanister, walletInfo]);

  // ✅ PHASE 3: Removed local refreshBalance - using centralized BalanceProvider

  // ✅ SIMULATE DEPOSIT FOR TESTING
  const simulateDeposit = useCallback(async (amount: Decimal) => {
    if (!tradingCanister || !user) {
      throw new Error('Platform wallet not initialized');
    }

    try {
      console.log('💰 Simulating deposit to platform:', amount.toString());
      
      const amountSatoshis = amount.mul(100000000).toNumber();
      const txid = `deposit_${Date.now()}`;

      const result = await (tradingCanister as any).deposit_bitcoin?.(user, amountSatoshis);

      if (!result || 'err' in result) {
        throw new Error(`Deposit failed: ${result?.err || 'Unknown error'}`);
      }

      console.log('✅ Deposit processed:', result.ok);
      // ✅ PHASE 3: Refresh centralized balance after deposit
      await refreshBalance();

      return {
        txHash: txid,
        status: 'success',
        message: 'Deposit credited to platform balance'
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Deposit failed';
      setError(errorMessage);
      throw err;
    }
  }, [user, tradingCanister, refreshBalance]);

  // ✅ GENERATE DEPOSIT ADDRESS
  const generateDepositAddress = useCallback(async (): Promise<string> => {
    if (!tradingCanister || !user) {
      throw new Error('Trading canister or user not available');
    }

    try {
      console.log('🔑 Generating deposit address for user:', user.toString());
      
      // Generate a unique deposit address for this user
      // This would typically call a backend function that generates a new Bitcoin address
      const timestamp = Date.now();
      const userHash = user.toString().substring(0, 8);
      const depositAddress = `bc1q${userHash}${timestamp.toString(36)}`;
      
      console.log('✅ Generated deposit address:', depositAddress);
      
      return depositAddress;
    } catch (error) {
      console.error('❌ Failed to generate deposit address:', error);
      throw error;
    }
  }, [tradingCanister, user]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setWalletInfo(null);
    setError(null);
    console.log('🔌 Platform wallet disconnected');
  }, []);

  // ✅ PHASE 3: Auto-refresh is now handled by BalanceProvider

  return {
    walletInfo,
    isLoading,
    error,
    initializeWallet,
    processWithdrawal,
    refreshBalance, // ✅ PHASE 3: Now uses centralized BalanceProvider
    simulateDeposit,
    generateDepositAddress,
    disconnectWallet,
    // Legacy compatibility
    isConnected: walletInfo?.isConnected ?? false,
    sendTransaction: processWithdrawal, // Alias for compatibility
    transactions: [] // Empty for now, could be implemented later
  };
};
