import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { atticusService } from '../services/AtticusService';
import { pricingEngine } from '../services/OffChainPricingEngine';
import { TreasuryService } from '../services/TreasuryService';

// ✅ SIMPLE ARCHITECTURE - No Intercanister Calls
interface CanisterContextType {
  isConnected: boolean;
  atticusService: typeof atticusService; // ✅ User signup/authentication only
  treasuryService: TreasuryService; // ✅ Wallet generation only
  pricingEngine: typeof pricingEngine; // ✅ All trading logic off-chain
  tradingCanister: any; // ✅ BACKWARD COMPATIBILITY: Points to atticusService
  agent: HttpAgent | null;
  principal: Principal | null;
}

const CanisterContext = createContext<CanisterContextType | undefined>(undefined);

export const useCanister = () => {
  const context = useContext(CanisterContext);
  if (!context) {
    throw new Error('useCanister must be used within a CanisterProvider');
  }
  return context;
};

export const CanisterProvider: React.FC<{ children: ReactNode }> = React.memo(({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [agent, setAgent] = useState<HttpAgent | null>(null);
  const [principal] = useState<Principal | null>(null);
  const [treasuryService] = useState(() => new TreasuryService());

  useEffect(() => {
    const initializeAtticusService = async () => {
      try {
        console.log('🚀 Initializing Atticus Service (Single Canister Architecture)...');
        
        const httpAgent = new HttpAgent({
          host: 'https://ic0.app'
        });

        // ✅ ATTICUS CORE CANISTER ID (Your Mainnet Canister)
        const ATTICUS_CORE_CANISTER_ID = process.env.ATTICUS_CORE_CANISTER_ID || 'rraue-iqaaa-aaaam-qd4mq-cai';
        
        // ✅ ATTICUS TREASURY CANISTER ID (New Treasury Canister)
        const ATTICUS_TREASURY_CANISTER_ID = process.env.ATTICUS_TREASURY_CANISTER_ID || 'rwbsq-fiaaa-aaaam-qd4ma-cai';

        // ✅ INITIALIZE ATTICUS SERVICE (Single Canister)
        await atticusService.initialize(ATTICUS_CORE_CANISTER_ID);
        
        // ✅ INITIALIZE TREASURY SERVICE (Treasury Canister)
        await treasuryService.initialize(ATTICUS_TREASURY_CANISTER_ID);

        // ✅ PRICING ENGINE INITIALIZED (Off-Chain)
        console.log('✅ Off-chain pricing engine initialized');

        setAgent(httpAgent);
        setIsConnected(true);

        // ✅ DIAGNOSTIC: Expose services for browser console testing
        if (typeof window !== 'undefined') {
          (window as any).atticusService = atticusService;
          (window as any).treasuryService = treasuryService;
          (window as any).pricingEngine = pricingEngine;
          console.log('🔧 Services exposed to window for testing:');
          console.log('  - window.atticusService.testTradeStatistics()');
          console.log('  - window.atticusService.get_trade_statistics()');
        }

        console.log('✅ Atticus Service initialized successfully (Single Canister Architecture)!');

      } catch (error) {
        console.error('❌ Failed to initialize Atticus Service:', error);
        setIsConnected(false);
      }
    };

    initializeAtticusService();
  }, []);

  const contextValue: CanisterContextType = {
    isConnected,
    atticusService, // ✅ User signup/authentication only
    treasuryService, // ✅ Wallet generation only
    pricingEngine, // ✅ All trading logic off-chain
    tradingCanister: atticusService, // ✅ BACKWARD COMPATIBILITY: Points to atticusService
    agent,
    principal
  };

  // ✅ DEBUG: Log context value
  console.log('🔍 CanisterProvider context value:', {
    isConnected,
    hasAtticusService: !!atticusService,
    hasTreasuryService: !!treasuryService,
    hasPricingEngine: !!pricingEngine
  });

  return (
    <CanisterContext.Provider value={contextValue}>
      {children}
    </CanisterContext.Provider>
  );
});