import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { atticusService } from '../services/AtticusService';
import { pricingEngine } from '../services/OffChainPricingEngine';

/**
 * CanisterProvider — legacy name retained so existing imports keep working.
 * After PR #2 it no longer talks to ICP; it just exposes the pricing engine
 * and the (mocked) trading service. PR #3 replaces this with a partner-exchange
 * provider that wires the chosen adapter (Foxify, mock, etc.).
 */
interface CanisterContextType {
  isConnected: boolean;
  atticusService: typeof atticusService;
  pricingEngine: typeof pricingEngine;
  tradingCanister: typeof atticusService;
  treasuryService: null;
  agent: null;
  principal: null;
  backend: typeof atticusService;
}

const CanisterContext = createContext<CanisterContextType | undefined>(undefined);

export const useCanister = () => {
  const ctx = useContext(CanisterContext);
  if (!ctx) throw new Error('useCanister must be used within a CanisterProvider');
  return ctx;
};

export const CanisterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    atticusService.initialize().then(() => setIsConnected(true));
  }, []);

  const value: CanisterContextType = {
    isConnected,
    atticusService,
    pricingEngine,
    tradingCanister: atticusService,
    treasuryService: null,
    agent: null,
    principal: null,
    backend: atticusService,
  };

  return <CanisterContext.Provider value={value}>{children}</CanisterContext.Provider>;
};
