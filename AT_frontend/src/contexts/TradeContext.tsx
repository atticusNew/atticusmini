import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { ActiveTrade } from '../types/trading.types'; // ✅ FIXED: Now properly exported

interface TradeContextType {
  activeTrades: ActiveTrade[];
  addTrade: (trade: Omit<ActiveTrade, 'id' | 'entryTime' | 'expiryTime'>) => void;
  removeTrade: (id: string) => void;
  getTimeRemaining: (expiryTime: number) => number;
}

const TradeContext = createContext<TradeContextType | undefined>(undefined);

export const useTradeContext = () => {
  const context = useContext(TradeContext);
  if (!context) {
    throw new Error('useTradeContext must be used within a TradeProvider');
  }
  return context;
};

interface TradeProviderProps {
  children: ReactNode;
}

export const TradeProvider: React.FC<TradeProviderProps> = React.memo(({ children }) => {
  const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);

  // ✅ FIXED: Memoize addTrade function
  const addTrade = useCallback((tradeData: Omit<ActiveTrade, 'id' | 'entryTime' | 'expiryTime'>) => {
    const now = Date.now();
    // ✅ FIXED: Access expiry property directly (not with bracket notation unless needed)
    const expirySeconds = parseInt(tradeData.expiry.replace('s', ''));
    const expiryTime = now + (expirySeconds * 1000);

    const newTrade: ActiveTrade = {
      ...tradeData,
      id: `trade_${now}_${Math.random().toString(36).substr(2, 9)}`,
      entryTime: now,
      expiryTime: expiryTime,
    };

    setActiveTrades(prev => [...prev, newTrade]);

    // Auto-remove trade after expiry
    setTimeout(() => {
      setActiveTrades(prev => prev.filter(trade => trade.id !== newTrade.id));
    }, expirySeconds * 1000);
  }, []);

  // ✅ FIXED: Memoize removeTrade function
  const removeTrade = useCallback((id: string) => {
    setActiveTrades(prev => prev.filter(trade => trade.id !== id));
  }, []);

  // ✅ FIXED: Memoize getTimeRemaining function
  const getTimeRemaining = useCallback((expiryTime: number): number => {
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((expiryTime - now) / 1000));
    return remaining;
  }, []);

  // ✅ FIXED: Memoize context value
  const contextValue = useMemo(() => ({
    activeTrades,
    addTrade,
    removeTrade,
    getTimeRemaining,
  }), [activeTrades, addTrade, removeTrade, getTimeRemaining]);

  return (
    <TradeContext.Provider value={contextValue}>
      {children}
    </TradeContext.Provider>
  );
});
