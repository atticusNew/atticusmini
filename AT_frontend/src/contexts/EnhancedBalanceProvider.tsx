/**
 * ✅ ENHANCED BALANCE PROVIDER
 * Integrates with UnifiedBalanceService while preserving existing BalanceProvider functionality
 * Provides real-time updates and better error handling
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Decimal } from 'decimal.js';
import { useAuth } from './AuthProvider';
import { useCanister } from './CanisterProvider';
import { unifiedBalanceService, BalanceData, BalanceUpdate } from '../services/UnifiedBalanceService';

interface EnhancedBalanceContextType {
  userBalance: number;
  platformBalance: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
  isConnected: boolean;
  refreshBalance: () => Promise<void>;
  refreshPlatformBalance: () => Promise<void>;
  refreshAllBalances: () => Promise<void>;
  validateTradeBalance: (contractCount: number, btcPrice: number) => {
    isValid: boolean;
    requiredAmount: number;
    currentBalance: number;
    shortfall: number;
  };
  hasMinimumBalance: (requiredAmount: number) => boolean;
  getBalanceInUSD: (btcPrice: number) => number;
  getBalanceStatus: (requiredBalance: number, btcPrice: number) => {
    status: 'sufficient' | 'insufficient' | 'low';
    message: string;
  };
}

const EnhancedBalanceContext = createContext<EnhancedBalanceContextType | undefined>(undefined);

export const useEnhancedBalance = () => {
  const context = useContext(EnhancedBalanceContext);
  if (!context) {
    throw new Error('useEnhancedBalance must be used within an EnhancedBalanceProvider');
  }
  return context;
};

interface EnhancedBalanceProviderProps {
  children: ReactNode;
}

export const EnhancedBalanceProvider: React.FC<EnhancedBalanceProviderProps> = React.memo(({ children }) => {
  const { user } = useAuth();
  const { atticusService, treasuryService, isConnected } = useCanister();
  
  // Local state for UI updates
  const [balanceData, setBalanceData] = useState<BalanceData>({
    userBalance: 0,
    platformBalance: 0,
    lastUpdated: 0,
    isConnected: false,
    error: null
  });

  // Initialize unified balance service
  useEffect(() => {
    if (atticusService && treasuryService && user) {
      unifiedBalanceService.initialize({
        atticusService,
        treasuryService,
        user,
        isConnected
      });

      // Add balance listener
      const handleBalanceUpdate = (update: BalanceUpdate) => {
        const currentData = unifiedBalanceService.getBalanceData();
        setBalanceData(currentData);
      };

      unifiedBalanceService.addBalanceListener(handleBalanceUpdate);

      // Initial balance fetch
      unifiedBalanceService.refreshAllBalances();

      return () => {
        unifiedBalanceService.removeBalanceListener(handleBalanceUpdate);
      };
    }
  }, [atticusService, treasuryService, user, isConnected]);

  // Update connection status
  useEffect(() => {
    unifiedBalanceService.updateConnectionStatus(isConnected, user);
  }, [isConnected, user]);

  /**
   * ✅ REFRESH USER BALANCE
   * Enhanced version of existing refreshBalance
   */
  const refreshBalance = useCallback(async (): Promise<void> => {
    await unifiedBalanceService.refreshUserBalance();
  }, []);

  /**
   * ✅ REFRESH PLATFORM BALANCE
   * New functionality for platform balance
   */
  const refreshPlatformBalance = useCallback(async (): Promise<void> => {
    await unifiedBalanceService.refreshPlatformBalance();
  }, []);

  /**
   * ✅ REFRESH ALL BALANCES
   * Refresh both user and platform balances
   */
  const refreshAllBalances = useCallback(async (): Promise<void> => {
    await unifiedBalanceService.refreshAllBalances();
  }, []);

  /**
   * ✅ VALIDATE TRADE BALANCE
   * Enhanced version of existing validateTradeBalance
   */
  const validateTradeBalance = useCallback((contractCount: number, btcPrice: number) => {
    return unifiedBalanceService.validateTradeBalance(contractCount, btcPrice);
  }, []);

  /**
   * ✅ CHECK MINIMUM BALANCE
   * Enhanced version of existing hasMinimumBalance
   */
  const hasMinimumBalance = useCallback((requiredAmount: number): boolean => {
    return unifiedBalanceService.hasMinimumBalance(requiredAmount);
  }, []);

  /**
   * ✅ GET BALANCE IN USD
   * Enhanced version of existing getBalanceInUSD
   */
  const getBalanceInUSD = useCallback((btcPrice: number): number => {
    return unifiedBalanceService.getBalanceInUSD(btcPrice);
  }, []);

  /**
   * ✅ GET BALANCE STATUS
   * Enhanced version of existing getBalanceStatus
   */
  const getBalanceStatus = useCallback((requiredBalance: number, btcPrice: number) => {
    return unifiedBalanceService.getBalanceStatus(requiredBalance, btcPrice);
  }, []);

  // Context value
  const contextValue: EnhancedBalanceContextType = {
    userBalance: balanceData.userBalance,
    platformBalance: balanceData.platformBalance,
    isLoading: balanceData.error !== null && balanceData.userBalance === 0,
    error: balanceData.error,
    lastUpdated: balanceData.lastUpdated,
    isConnected: balanceData.isConnected,
    refreshBalance,
    refreshPlatformBalance,
    refreshAllBalances,
    validateTradeBalance,
    hasMinimumBalance,
    getBalanceInUSD,
    getBalanceStatus
  };

  return (
    <EnhancedBalanceContext.Provider value={contextValue}>
      {children}
    </EnhancedBalanceContext.Provider>
  );
});

// ✅ BACKWARD COMPATIBILITY
// Export the same interface as the original BalanceProvider for easy migration
export const useBalance = useEnhancedBalance;
export const BalanceProvider = EnhancedBalanceProvider;
