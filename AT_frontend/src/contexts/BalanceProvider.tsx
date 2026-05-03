import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { Decimal } from 'decimal.js';
import { Principal } from '@dfinity/principal';
import { useAuth } from './AuthProvider';
import { useCanister } from './CanisterProvider';
// ✅ REMOVED: balanceValidation service - logic moved inline

interface BalanceContextType {
  refreshBalance: () => Promise<void>;
  userBalance: number;
  isLoading: boolean;
  error: string | null;
  validateTradeBalance: (contractCount: number, btcPrice: number) => { isValid: boolean; requiredAmount: number; currentBalance: number; shortfall: number };
  hasMinimumBalance: (requiredAmount: number) => boolean;
  getBalanceInUSD: (btcPrice: number) => number;
  getBalanceStatus: (requiredBalance: number, btcPrice: number) => { status: 'sufficient' | 'insufficient' | 'low'; message: string };
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export const useBalance = () => {
  const context = useContext(BalanceContext);
  if (!context) {
    throw new Error('useBalance must be used within a BalanceProvider');
  }
  return context;
};

interface BalanceProviderProps {
  children: ReactNode;
}

export const BalanceProvider: React.FC<BalanceProviderProps> = React.memo(({ children }) => {
  const [userBalance, setUserBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { atticusService, treasuryService, isConnected } = useCanister();

  const refreshBalance = useCallback(async () => {
    if (!user || !atticusService || !isConnected) {
      console.warn('Cannot refresh balance: missing user, service, or connection');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Refreshing user balance...');
      
      // ✅ ADD: Comprehensive debugging to identify principal issue
      console.log('🔍 User object:', user);
      console.log('🔍 User.principal:', user.principal);
      console.log('🔍 User.principal type:', typeof user.principal);
      console.log('🔍 User.principal constructor:', user.principal?.constructor?.name);
      console.log('🔍 User.principal instanceof Principal:', user.principal instanceof Principal);
      
      // ✅ FIXED: Proper principal extraction and validation
      if (!user || !user.principal) {
        console.error('❌ Invalid user or principal:', user);
        return;
      }

      // Ensure principal is a Principal object
      let userPrincipal: Principal;
      if (user.principal instanceof Principal) {
        userPrincipal = user.principal;
        console.log('✅ Principal is already a Principal object');
      } else if (typeof user.principal === 'string') {
        userPrincipal = Principal.fromText(user.principal);
        console.log('✅ Converted string to Principal:', userPrincipal.toString());
      } else if (user.principal && typeof user.principal === 'object' && user.principal.__principal__) {
        // Handle serialized Principal
        userPrincipal = Principal.fromText(user.principal.__principal__);
        console.log('✅ Extracted from serialized Principal:', userPrincipal.toString());
      } else {
        console.error('❌ Invalid principal format:', user.principal);
        return;
      }

      console.log('🔍 Using principal for backend call:', userPrincipal.toString());
      
      // Get user data from backend with properly extracted principal
      const userData = await atticusService.getUser(userPrincipal.toString());
      console.log('🔍 Raw userData from backend:', userData);
      
      // Handle both array and object responses for backward compatibility
      let balance = 0;
      
      if (userData) {
        if (Array.isArray(userData) && userData.length > 0 && userData[0]) {
          // Handle array response (current backend format)
          balance = userData[0].balance || 0;
          console.log('✅ Balance from array format:', balance);
        } else if (typeof userData === 'object' && userData.balance !== undefined) {
          // Handle object response (alternative format)
          balance = userData.balance || 0;
          console.log('✅ Balance from object format:', balance);
        } else {
          console.warn('⚠️ Unexpected userData format:', userData);
          balance = 0;
        }
      } else {
        console.warn('⚠️ No userData returned from backend');
        balance = 0;
      }
      
      setUserBalance(balance);
      console.log('✅ Balance refreshed successfully:', balance);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('❌ Failed to refresh balance:', errorMessage);
      console.error('❌ Error details:', {
        error: err,
        user: user,
        userPrincipal: user?.principal,
        principalType: typeof user?.principal,
        principalConstructor: user?.principal?.constructor?.name
      });
      setError(errorMessage);
      setUserBalance(0);
    } finally {
      setIsLoading(false);
    }
  }, [user, atticusService, isConnected]);

  // ✅ CRITICAL: Auto-initialize balance when user/canister becomes available
  // ✅ FIXED: Removed refreshBalance from dependencies to prevent infinite re-render
  useEffect(() => {
    if (user && atticusService && isConnected && userBalance === 0) {
      console.log('🔄 Auto-initializing balance on mount...');
      refreshBalance().catch(error => {
        console.warn('⚠️ Auto-balance refresh failed:', error);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.principal, atticusService, isConnected, userBalance]); // ✅ FIXED: Use user.principal for stability

  // ✅ PHASE 4: Auto-refresh balance every 30 seconds when connected
  // ✅ FIXED: Removed refreshBalance from dependencies to prevent infinite re-render
  useEffect(() => {
    if (!user || !atticusService || !isConnected) return;
    
    console.log('🔄 Starting auto-refresh for balance updates...');
    const interval = setInterval(() => {
      refreshBalance().catch(error => {
        console.warn('⚠️ Auto-refresh failed:', error);
      });
    }, 30000); // Every 30 seconds
    
    return () => {
      console.log('🔄 Stopping auto-refresh for balance updates...');
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.principal, atticusService, isConnected]); // ✅ FIXED: Use user.principal for stability

  /**
   * Validate trade balance
   */
  const validateTradeBalance = useCallback((contractCount: number, btcPrice: number) => {
    const currentBalance = new Decimal(userBalance);
    // ✅ FIXED: Use actual premium cost (1 contract = $1, premium = $0.50)
    const premiumUSD = new Decimal(contractCount).mul(0.50); // $0.50 per contract
    const requiredBTC = premiumUSD.div(btcPrice); // Convert to BTC
    const shortfall = requiredBTC.sub(currentBalance);
    
    return {
      isValid: currentBalance.greaterThanOrEqualTo(requiredBTC),
      requiredAmount: requiredBTC.toNumber(),
      currentBalance: currentBalance.toNumber(),
      shortfall: shortfall.greaterThan(0) ? shortfall.toNumber() : 0
    };
  }, [userBalance]);

  /**
   * Check if user has minimum balance
   */
  const hasMinimumBalance = useCallback((requiredAmount: number): boolean => {
    return new Decimal(userBalance).greaterThanOrEqualTo(new Decimal(requiredAmount));
  }, [userBalance]);

  /**
   * Get balance in USD
   */
  const getBalanceInUSD = useCallback((btcPrice: number): number => {
    return new Decimal(userBalance).mul(btcPrice).toNumber();
  }, [userBalance]);

  /**
   * Get balance status for UI
   */
  const getBalanceStatus = useCallback((requiredBalance: number, btcPrice: number) => {
    const currentBalance = new Decimal(userBalance);
    const required = new Decimal(requiredBalance);
    const balanceUSD = currentBalance.mul(btcPrice);
    const requiredUSD = required.mul(btcPrice);
    
    if (currentBalance.greaterThanOrEqualTo(required)) {
      return { status: 'sufficient' as const, message: 'Balance sufficient' };
    } else if (balanceUSD.greaterThan(requiredUSD.mul(0.5))) {
      return { status: 'low' as const, message: 'Balance low' };
    } else {
      return { status: 'insufficient' as const, message: 'Insufficient balance' };
    }
  }, [userBalance]);

  // ✅ FIXED: Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    refreshBalance,
    userBalance,
    isLoading,
    error,
    validateTradeBalance,
    hasMinimumBalance,
    getBalanceInUSD,
    getBalanceStatus
  }), [refreshBalance, userBalance, isLoading, error, validateTradeBalance, hasMinimumBalance, getBalanceInUSD, getBalanceStatus]);
  // ✅ FIXED: Memoized context value to prevent unnecessary re-renders

  return (
    <BalanceContext.Provider value={contextValue}>
      {children}
    </BalanceContext.Provider>
  );
});
