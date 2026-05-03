import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { pricingEngine, PriceData } from '../services/OffChainPricingEngine';

export interface SynchronizedPriceState {
  current: number;
  timestamp: number;
  isValid: boolean;
  change: {
    amount: number;
    percentage: number;
  };
  source: string;
  volume?: number;
  high?: number;
  low?: number;
}

interface WebSocketContextType {
  priceState: SynchronizedPriceState;
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [priceState, setPriceState] = useState<SynchronizedPriceState>({
    current: 0,
    timestamp: Date.now(),
    isValid: false,
    change: { amount: 0, percentage: 0 },
    source: 'connecting'
  });

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ SIMPLIFIED: Use OffChainPricingEngine as single source of truth
  useEffect(() => {
    const handlePriceUpdate = (priceData: PriceData) => {
      setPriceState({
        current: priceData.current,
        timestamp: priceData.timestamp,
        isValid: priceData.isValid,
        change: priceData.change,
        source: priceData.source,
        volume: priceData.volume,
        high: priceData.high,
        low: priceData.low
      });
      setIsConnected(true);
      setError(null);
    };

    // Subscribe to price updates from OffChainPricingEngine
    pricingEngine.addPriceListener(handlePriceUpdate);
    
    // Check connection status
    setIsConnected(pricingEngine.isPriceFeedConnected());

    return () => {
      pricingEngine.removePriceListener(handlePriceUpdate);
    };
  }, []);

  const reconnect = useCallback(() => {
    // OffChainPricingEngine handles reconnection automatically
    console.log('🔄 Reconnection requested - OffChainPricingEngine will handle');
  }, []);

  const contextValue: WebSocketContextType = {
    priceState,
    isConnected,
    error,
    reconnect
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

/**
 * Hook to use WebSocket context
 */
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};