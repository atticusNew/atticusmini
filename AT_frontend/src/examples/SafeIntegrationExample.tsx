/**
 * ✅ SAFE INTEGRATION EXAMPLE
 * Shows how to safely integrate new enhanced services without breaking existing functionality
 * This is a reference implementation that can be gradually adopted
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { useCanister } from '../contexts/CanisterProvider';
import { useBalance } from '../contexts/BalanceProvider'; // Existing balance provider
import { unifiedBalanceService } from '../services/UnifiedBalanceService';
import { enhancedAdminService } from '../services/EnhancedAdminService';
import { enhancedSettlementService } from '../services/EnhancedSettlementService';

/**
 * ✅ EXAMPLE 1: SAFE SERVICE INITIALIZATION
 * Initialize new services alongside existing ones without breaking anything
 */
export const SafeServiceInitialization: React.FC = () => {
  const { user } = useAuth();
  const { atticusService, treasuryService, isConnected } = useCanister();
  const { userBalance, refreshBalance } = useBalance(); // Existing functionality preserved

  // Initialize new services (safe - doesn't break existing code)
  useEffect(() => {
    if (atticusService && treasuryService && user) {
      console.log('🔄 Initializing enhanced services...');
      
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

      console.log('✅ Enhanced services initialized successfully');
    }
  }, [atticusService, treasuryService, user, isConnected]);

  return (
    <div>
      <h3>Safe Service Initialization</h3>
      <p>Existing balance: {userBalance.toFixed(8)} BTC</p>
      <button onClick={refreshBalance}>Refresh Balance (Existing)</button>
    </div>
  );
};

/**
 * ✅ EXAMPLE 2: ENHANCED BALANCE WITH REAL-TIME UPDATES
 * Use new balance service alongside existing one
 */
export const EnhancedBalanceExample: React.FC = () => {
  const [enhancedBalance, setEnhancedBalance] = useState(0);
  const [platformBalance, setPlatformBalance] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(0);

  // Listen to enhanced balance updates
  useEffect(() => {
    const handleBalanceUpdate = (update: any) => {
      if (update.userBalance !== undefined) {
        setEnhancedBalance(update.userBalance);
      }
      if (update.platformBalance !== undefined) {
        setPlatformBalance(update.platformBalance);
      }
      setLastUpdated(update.timestamp);
    };

    unifiedBalanceService.addBalanceListener(handleBalanceUpdate);

    return () => {
      unifiedBalanceService.removeBalanceListener(handleBalanceUpdate);
    };
  }, []);

  const handleRefreshAll = async () => {
    await unifiedBalanceService.refreshAllBalances();
  };

  return (
    <div>
      <h3>Enhanced Balance with Real-time Updates</h3>
      <p>User Balance: {enhancedBalance.toFixed(8)} BTC</p>
      <p>Platform Balance: {platformBalance.toFixed(8)} BTC</p>
      <p>Last Updated: {new Date(lastUpdated).toLocaleString()}</p>
      <button onClick={handleRefreshAll}>Refresh All Balances</button>
    </div>
  );
};

/**
 * ✅ EXAMPLE 3: ENHANCED ADMIN DATA
 * Use new admin service for simplified data fetching
 */
export const EnhancedAdminExample: React.FC = () => {
  const [adminData, setAdminData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Listen to admin data updates
  useEffect(() => {
    const handleDataUpdate = (data: any) => {
      setAdminData(data);
      setIsLoading(data.isLoading);
    };

    enhancedAdminService.addDataListener(handleDataUpdate);

    // Initial data fetch
    enhancedAdminService.fetchAllData();

    return () => {
      enhancedAdminService.removeDataListener(handleDataUpdate);
    };
  }, []);

  const handleRefresh = async () => {
    await enhancedAdminService.fetchAllData();
  };

  const handleExport = () => {
    const csvData = enhancedAdminService.exportToCSV();
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin_data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div>Loading admin data...</div>;
  }

  return (
    <div>
      <h3>Enhanced Admin Data</h3>
      {adminData?.platformMetrics && (
        <div>
          <p>Platform Balance: {adminData.platformMetrics.wallet.balance.toFixed(8)} BTC</p>
          <p>Total Users: {adminData.userMetrics.length}</p>
          <p>Last Updated: {new Date(adminData.lastUpdated).toLocaleString()}</p>
        </div>
      )}
      <button onClick={handleRefresh}>Refresh Data</button>
      <button onClick={handleExport}>Export CSV</button>
    </div>
  );
};

/**
 * ✅ EXAMPLE 4: ENHANCED SETTLEMENT RECORDING
 * Use new settlement service for better settlement handling
 */
export const EnhancedSettlementExample: React.FC = () => {
  const [settlementMetrics, setSettlementMetrics] = useState<any>(null);

  // Listen to settlement events
  useEffect(() => {
    const handleSettlementEvent = (record: any) => {
      console.log('Settlement recorded:', record);
      setSettlementMetrics(enhancedSettlementService.getSettlementMetrics());
    };

    enhancedSettlementService.addSettlementListener(handleSettlementEvent);

    return () => {
      enhancedSettlementService.removeSettlementListener(handleSettlementEvent);
    };
  }, []);

  const handleRetryFailed = async () => {
    const retryCount = await enhancedSettlementService.retryFailedSettlements();
    console.log(`Retried ${retryCount} failed settlements`);
  };

  return (
    <div>
      <h3>Enhanced Settlement Service</h3>
      {settlementMetrics && (
        <div>
          <p>Total Settlements: {settlementMetrics.totalSettlements}</p>
          <p>Success Rate: {(settlementMetrics.successRate * 100).toFixed(1)}%</p>
          <p>Failed Settlements: {settlementMetrics.failedSettlements}</p>
        </div>
      )}
      <button onClick={handleRetryFailed}>Retry Failed Settlements</button>
    </div>
  );
};

/**
 * ✅ EXAMPLE 5: GRADUAL MIGRATION STRATEGY
 * Shows how to gradually adopt new services
 */
export const GradualMigrationExample: React.FC = () => {
  const [migrationPhase, setMigrationPhase] = useState<'existing' | 'testing' | 'enhanced'>('existing');
  const { userBalance, refreshBalance } = useBalance(); // Existing functionality
  const [enhancedBalance, setEnhancedBalance] = useState(0);

  // Phase 1: Use existing services (current state)
  if (migrationPhase === 'existing') {
    return (
      <div>
        <h3>Phase 1: Existing Services</h3>
        <p>Balance: {userBalance.toFixed(8)} BTC</p>
        <button onClick={refreshBalance}>Refresh Balance</button>
        <button onClick={() => setMigrationPhase('testing')}>
          Move to Testing Phase
        </button>
      </div>
    );
  }

  // Phase 2: Test new services alongside existing ones
  if (migrationPhase === 'testing') {
    return (
      <div>
        <h3>Phase 2: Testing New Services</h3>
        <p>Existing Balance: {userBalance.toFixed(8)} BTC</p>
        <p>Enhanced Balance: {enhancedBalance.toFixed(8)} BTC</p>
        <button onClick={refreshBalance}>Refresh (Existing)</button>
        <button onClick={() => setMigrationPhase('enhanced')}>
          Move to Enhanced Phase
        </button>
      </div>
    );
  }

  // Phase 3: Use enhanced services
  return (
    <div>
      <h3>Phase 3: Enhanced Services</h3>
      <p>Enhanced Balance: {enhancedBalance.toFixed(8)} BTC</p>
      <button onClick={() => unifiedBalanceService.refreshUserBalance()}>
        Refresh (Enhanced)
      </button>
      <button onClick={() => setMigrationPhase('existing')}>
        Rollback to Existing
      </button>
    </div>
  );
};

/**
 * ✅ MAIN INTEGRATION COMPONENT
 * Shows how to integrate all new services safely
 */
export const SafeIntegrationExample: React.FC = () => {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🚀 Safe Integration Example</h1>
      <p>This example shows how to safely integrate new enhanced services without breaking existing functionality.</p>
      
      <div style={{ marginBottom: '2rem' }}>
        <SafeServiceInitialization />
      </div>
      
      <div style={{ marginBottom: '2rem' }}>
        <EnhancedBalanceExample />
      </div>
      
      <div style={{ marginBottom: '2rem' }}>
        <EnhancedAdminExample />
      </div>
      
      <div style={{ marginBottom: '2rem' }}>
        <EnhancedSettlementExample />
      </div>
      
      <div style={{ marginBottom: '2rem' }}>
        <GradualMigrationExample />
      </div>
    </div>
  );
};

export default SafeIntegrationExample;
