/**
 * ✅ ENHANCED SERVICES HOOK
 * Provides easy access to all enhanced services with automatic initialization
 * Safe to use alongside existing hooks without breaking anything
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { useCanister } from '../contexts/CanisterProvider';
import { unifiedBalanceService, BalanceData, BalanceUpdate } from '../services/UnifiedBalanceService';
import { enhancedAdminService, AdminData } from '../services/EnhancedAdminService';
import { enhancedSettlementService, SettlementRecord, SettlementMetrics } from '../services/EnhancedSettlementService';

export interface EnhancedServicesData {
  // Balance data
  userBalance: number;
  platformBalance: number;
  balanceError: string | null;
  balanceLastUpdated: number;
  
  // Admin data
  adminData: AdminData | null;
  adminError: string | null;
  
  // Settlement data
  settlementMetrics: SettlementMetrics | null;
  recentSettlements: SettlementRecord[];
  
  // Service status
  isInitialized: boolean;
  isConnected: boolean;
}

export const useEnhancedServices = () => {
  const { user } = useAuth();
  const { atticusService, treasuryService, isConnected } = useCanister();
  
  const [servicesData, setServicesData] = useState<EnhancedServicesData>({
    userBalance: 0,
    platformBalance: 0,
    balanceError: null,
    balanceLastUpdated: 0,
    adminData: null,
    adminError: null,
    settlementMetrics: null,
    recentSettlements: [],
    isInitialized: false,
    isConnected: false
  });

  // Initialize all enhanced services
  useEffect(() => {
    if (atticusService && treasuryService && user) {
      console.log('🔄 Initializing enhanced services...');
      
      try {
        // Initialize unified balance service
        unifiedBalanceService.initialize({
          atticusService,
          treasuryService,
          user,
          isConnected
        });

        // Initialize admin service
        enhancedAdminService.initialize({
          atticusService,
          treasuryService,
          isConnected
        });

        // Initialize settlement service
        enhancedSettlementService.initialize({
          atticusService,
          isConnected
        });

        setServicesData(prev => ({
          ...prev,
          isInitialized: true,
          isConnected
        }));

        console.log('✅ Enhanced services initialized successfully');
      } catch (error) {
        console.error('❌ Error initializing enhanced services:', error);
        setServicesData(prev => ({
          ...prev,
          balanceError: 'Failed to initialize services'
        }));
      }
    }
  }, [atticusService, treasuryService, user, isConnected]);

  // Listen to balance updates
  useEffect(() => {
    if (!servicesData.isInitialized) return;

    const handleBalanceUpdate = (update: BalanceUpdate) => {
      const balanceData = unifiedBalanceService.getBalanceData();
      setServicesData(prev => ({
        ...prev,
        userBalance: balanceData.userBalance,
        platformBalance: balanceData.platformBalance,
        balanceError: balanceData.error,
        balanceLastUpdated: balanceData.lastUpdated,
        isConnected: balanceData.isConnected
      }));
    };

    unifiedBalanceService.addBalanceListener(handleBalanceUpdate);

    return () => {
      unifiedBalanceService.removeBalanceListener(handleBalanceUpdate);
    };
  }, [servicesData.isInitialized]);

  // Listen to admin data updates
  useEffect(() => {
    if (!servicesData.isInitialized) return;

    const handleAdminUpdate = (data: AdminData) => {
      setServicesData(prev => ({
        ...prev,
        adminData: data,
        adminError: data.error
      }));
    };

    enhancedAdminService.addDataListener(handleAdminUpdate);

    return () => {
      enhancedAdminService.removeDataListener(handleAdminUpdate);
    };
  }, [servicesData.isInitialized]);

  // Listen to settlement updates
  useEffect(() => {
    if (!servicesData.isInitialized) return;

    const handleSettlementUpdate = (record: SettlementRecord) => {
      setServicesData(prev => ({
        ...prev,
        settlementMetrics: enhancedSettlementService.getSettlementMetrics(),
        recentSettlements: enhancedSettlementService.getSettlementHistory(10)
      }));
    };

    enhancedSettlementService.addSettlementListener(handleSettlementUpdate);

    return () => {
      enhancedSettlementService.removeSettlementListener(handleSettlementUpdate);
    };
  }, [servicesData.isInitialized]);

  // Enhanced balance functions
  const refreshUserBalance = useCallback(async (): Promise<boolean> => {
    if (!servicesData.isInitialized) return false;
    return await unifiedBalanceService.refreshUserBalance();
  }, [servicesData.isInitialized]);

  const refreshPlatformBalance = useCallback(async (): Promise<boolean> => {
    if (!servicesData.isInitialized) return false;
    return await unifiedBalanceService.refreshPlatformBalance();
  }, [servicesData.isInitialized]);

  const refreshAllBalances = useCallback(async (): Promise<boolean> => {
    if (!servicesData.isInitialized) return false;
    return await unifiedBalanceService.refreshAllBalances();
  }, [servicesData.isInitialized]);

  // Enhanced admin functions
  const refreshAdminData = useCallback(async (): Promise<boolean> => {
    if (!servicesData.isInitialized) return false;
    return await enhancedAdminService.fetchAllData();
  }, [servicesData.isInitialized]);

  const exportAdminData = useCallback((): string => {
    if (!servicesData.isInitialized) return '';
    return enhancedAdminService.exportToCSV();
  }, [servicesData.isInitialized]);

  // Enhanced settlement functions
  const recordSettlement = useCallback(async (
    positionId: number,
    settlementResult: any,
    backendCanister?: any
  ): Promise<boolean> => {
    if (!servicesData.isInitialized) return false;
    return await enhancedSettlementService.recordSettlement(
      positionId,
      settlementResult,
      backendCanister
    );
  }, [servicesData.isInitialized]);

  const retryFailedSettlements = useCallback(async (): Promise<number> => {
    if (!servicesData.isInitialized) return 0;
    return await enhancedSettlementService.retryFailedSettlements();
  }, [servicesData.isInitialized]);

  // Validation functions
  const validateTradeBalance = useCallback((contractCount: number, btcPrice: number) => {
    if (!servicesData.isInitialized) {
      return { isValid: false, requiredAmount: 0, currentBalance: 0, shortfall: 0 };
    }
    return unifiedBalanceService.validateTradeBalance(contractCount, btcPrice);
  }, [servicesData.isInitialized]);

  const getBalanceStatus = useCallback((requiredBalance: number, btcPrice: number) => {
    if (!servicesData.isInitialized) {
      return { status: 'insufficient' as const, message: 'Services not initialized' };
    }
    return unifiedBalanceService.getBalanceStatus(requiredBalance, btcPrice);
  }, [servicesData.isInitialized]);

  const getBalanceInUSD = useCallback((btcPrice: number): number => {
    if (!servicesData.isInitialized) return 0;
    return unifiedBalanceService.getBalanceInUSD(btcPrice);
  }, [servicesData.isInitialized]);

  return {
    // Data
    ...servicesData,
    
    // Balance functions
    refreshUserBalance,
    refreshPlatformBalance,
    refreshAllBalances,
    validateTradeBalance,
    getBalanceStatus,
    getBalanceInUSD,
    
    // Admin functions
    refreshAdminData,
    exportAdminData,
    
    // Settlement functions
    recordSettlement,
    retryFailedSettlements,
    
    // Service management
    isInitialized: servicesData.isInitialized,
    isConnected: servicesData.isConnected
  };
};
