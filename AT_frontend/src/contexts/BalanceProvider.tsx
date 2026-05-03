import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from 'react';
import { Decimal } from 'decimal.js';
import { useAuth } from './AuthProvider';
import { useCanister } from './CanisterProvider';
import { mockPartnerExchangeAdapter } from '../services/partner/MockPartnerExchangeAdapter';
import {
  initialBalanceState,
  nextBalanceState,
  resetBalanceState,
  type BalanceSessionState,
} from './balanceState';

export interface BalanceDelta {
  amount: number;
  at: number;
}

interface BalanceContextType {
  refreshBalance: () => Promise<void>;
  resetPaperBalance: () => Promise<void>;
  userBalance: number;
  sessionStartBalance: number;
  dayPnl: number;
  lastDelta: BalanceDelta | null;
  isLoading: boolean;
  error: string | null;
  validateTradeBalance: (
    contractCount: number,
    btcPrice: number,
  ) => { isValid: boolean; requiredAmount: number; currentBalance: number; shortfall: number };
  hasMinimumBalance: (requiredAmount: number) => boolean;
  getBalanceInUSD: (btcPrice: number) => number;
  getBalanceStatus: (
    requiredBalance: number,
    btcPrice: number,
  ) => { status: 'sufficient' | 'insufficient' | 'low'; message: string };
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export const useBalance = () => {
  const ctx = useContext(BalanceContext);
  if (!ctx) throw new Error('useBalance must be used within a BalanceProvider');
  return ctx;
};

export const BalanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<BalanceSessionState>(initialBalanceState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const { atticusService, isConnected } = useCanister();

  const refreshBalance = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await atticusService.getUser(user.principal);
      const next = data?.balance ?? 0;
      setSession(prev => nextBalanceState(prev, next));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSession(prev => nextBalanceState(prev, 0));
    } finally {
      setIsLoading(false);
    }
  }, [user, atticusService]);

  /**
   * Wipe the demo paper book back to its starting balance. Only meaningful for
   * the mock partner adapter; on a live partner it's a no-op.
   */
  const resetPaperBalance = useCallback(async () => {
    mockPartnerExchangeAdapter.reset();
    setSession(resetBalanceState());
    await refreshBalance();
  }, [refreshBalance]);

  useEffect(() => {
    if (user && isConnected) refreshBalance().catch(() => {});
  }, [user, isConnected, refreshBalance]);

  const userBalance = session.current;
  const sessionStartBalance = session.sessionStart;
  const dayPnl = session.dayPnl;
  const lastDelta = session.lastDelta;

  const validateTradeBalance = useCallback(
    (contractCount: number, btcPrice: number) => {
      const currentBalance = new Decimal(userBalance);
      const premiumUSD = new Decimal(contractCount);
      const shortfall = premiumUSD.minus(currentBalance);
      return {
        isValid: currentBalance.greaterThanOrEqualTo(premiumUSD),
        requiredAmount: premiumUSD.toNumber(),
        currentBalance: currentBalance.toNumber(),
        shortfall: shortfall.greaterThan(0) ? shortfall.toNumber() : 0,
      };
    },
    [userBalance],
  );

  const hasMinimumBalance = useCallback(
    (requiredAmount: number) =>
      new Decimal(userBalance).greaterThanOrEqualTo(new Decimal(requiredAmount)),
    [userBalance],
  );

  const getBalanceInUSD = useCallback(
    (_btcPrice: number) => new Decimal(userBalance).toNumber(),
    [userBalance],
  );

  const getBalanceStatus = useCallback(
    (requiredBalance: number) => {
      const balance = new Decimal(userBalance);
      const required = new Decimal(requiredBalance);
      if (balance.greaterThanOrEqualTo(required))
        return { status: 'sufficient' as const, message: 'Balance sufficient' };
      if (balance.greaterThan(required.mul(0.5)))
        return { status: 'low' as const, message: 'Balance low' };
      return { status: 'insufficient' as const, message: 'Insufficient balance' };
    },
    [userBalance],
  );

  const value = useMemo(
    () => ({
      refreshBalance,
      resetPaperBalance,
      userBalance,
      sessionStartBalance,
      dayPnl,
      lastDelta,
      isLoading,
      error,
      validateTradeBalance,
      hasMinimumBalance,
      getBalanceInUSD,
      getBalanceStatus,
    }),
    [
      refreshBalance,
      resetPaperBalance,
      userBalance,
      sessionStartBalance,
      dayPnl,
      lastDelta,
      isLoading,
      error,
      validateTradeBalance,
      hasMinimumBalance,
      getBalanceInUSD,
      getBalanceStatus,
    ],
  );

  return <BalanceContext.Provider value={value}>{children}</BalanceContext.Provider>;
};
