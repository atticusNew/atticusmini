/**
 * ✅ PRODUCTION BALANCE DISPLAY
 * Real-time balance display for live trading platform
 * Integrates with existing balance system without breaking functionality
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useEnhancedServices } from '../hooks/useEnhancedServices';
import { useBalance } from '../contexts/BalanceProvider'; // Existing balance provider

const BalanceContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-right: 0.5rem;
`;

const BalanceDisplay = styled.div<{ $status: 'sufficient' | 'low' | 'insufficient' | 'error' | 'loading' }>`
  padding: 0.15rem 0.3rem;
  background: ${props => {
    switch (props.$status) {
      case 'sufficient': return 'rgba(0, 212, 170, 0.15)';
      case 'low': return 'rgba(255, 193, 7, 0.15)';
      case 'insufficient': return 'rgba(255, 71, 87, 0.15)';
      case 'error': return 'rgba(108, 117, 125, 0.15)';
      case 'loading': return 'rgba(128, 128, 128, 0.15)';
      default: return 'rgba(128, 128, 128, 0.15)';
    }
  }};
  border: 1px solid ${props => {
    switch (props.$status) {
      case 'sufficient': return 'var(--green)';
      case 'low': return '#ffc107';
      case 'insufficient': return 'var(--red)';
      case 'error': return '#6c757d';
      case 'loading': return 'var(--border)';
      default: return 'var(--border)';
    }
  }};
  border-radius: 3px;
  font-size: 0.6rem;
  font-weight: 600;
  color: ${props => {
    switch (props.$status) {
      case 'sufficient': return 'var(--green)';
      case 'low': return '#ffc107';
      case 'insufficient': return 'var(--red)';
      case 'error': return '#6c757d';
      case 'loading': return 'var(--text-dim)';
      default: return 'var(--text-dim)';
    }
  }};
  white-space: nowrap;
  position: relative;
`;

const StatusIndicator = styled.div<{ $status: 'online' | 'offline' | 'error' | 'loading' }>`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${props => {
    switch (props.$status) {
      case 'online': return 'var(--green)';
      case 'offline': return 'var(--red)';
      case 'error': return '#ffc107';
      case 'loading': return 'var(--text-dim)';
      default: return 'var(--text-dim)';
    }
  }};
  margin-right: 4px;
  animation: ${props => props.$status === 'loading' ? 'pulse 1.5s infinite' : 'none'};
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const RefreshButton = styled.button`
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-size: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  
  &:hover {
    background: var(--bg-button);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorTooltip = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  background: var(--red);
  color: white;
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
  font-size: 0.6rem;
  white-space: nowrap;
  z-index: 1001;
  margin-top: 2px;
  max-width: 200px;
`;

const LastUpdated = styled.span`
  font-size: 0.5rem;
  opacity: 0.7;
  margin-left: 0.25rem;
`;

interface ProductionBalanceDisplayProps {
  isDemoMode?: boolean;
  showPlatformBalance?: boolean;
}

export const ProductionBalanceDisplay: React.FC<ProductionBalanceDisplayProps> = ({ 
  isDemoMode = false,
  showPlatformBalance = false
}) => {
  // Use both existing and enhanced services for reliability
  const { userBalance: existingBalance, refreshBalance: existingRefresh } = useBalance();
  const {
    userBalance: enhancedBalance,
    platformBalance,
    balanceError,
    balanceLastUpdated,
    isInitialized,
    isConnected,
    refreshAllBalances,
    getBalanceStatus
  } = useEnhancedServices();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showError, setShowError] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);

  // Use enhanced balance if available, fallback to existing
  const currentBalance = enhancedBalance || existingBalance;
  const isEnhanced = isInitialized && enhancedBalance !== undefined;

  // Handle balance refresh
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    setLastRefreshTime(Date.now());
    
    try {
      if (isEnhanced) {
        await refreshAllBalances();
      } else {
        await existingRefresh();
      }
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh every 30 seconds if enhanced service is available
  useEffect(() => {
    if (!isEnhanced || isDemoMode) return;

    const interval = setInterval(() => {
      refreshAllBalances();
    }, 30000);

    return () => clearInterval(interval);
  }, [isEnhanced, isDemoMode, refreshAllBalances]);

  // Show error tooltip
  useEffect(() => {
    if (balanceError) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [balanceError]);

  // Determine display status
  const getDisplayStatus = (): 'sufficient' | 'low' | 'insufficient' | 'error' | 'loading' => {
    if (isRefreshing) return 'loading';
    if (balanceError) return 'error';
    if (!isConnected && isEnhanced) return 'error';
    
    if (currentBalance > 0.001) return 'sufficient';
    if (currentBalance > 0.0001) return 'low';
    return 'insufficient';
  };

  // Get connection status
  const getConnectionStatus = (): 'online' | 'offline' | 'error' | 'loading' => {
    if (isRefreshing) return 'loading';
    if (balanceError) return 'error';
    if (!isConnected && isEnhanced) return 'offline';
    return isConnected ? 'online' : 'offline';
  };

  // Format balance for display
  const formatBalance = (balance: number): string => {
    if (balance === 0) return '0';
    if (balance < 0.000001) return balance.toFixed(8);
    return balance.toFixed(6);
  };

  // Format last updated time
  const formatLastUpdated = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return new Date(timestamp).toLocaleTimeString();
  };

  if (isDemoMode) {
    return null; // Don't show balance in demo mode
  }

  return (
    <BalanceContainer>
      {/* Main Balance Display */}
      <BalanceDisplay $status={getDisplayStatus()}>
        <StatusIndicator $status={getConnectionStatus()} />
        {formatBalance(currentBalance)} BTC
        {balanceLastUpdated > 0 && isEnhanced && (
          <LastUpdated>
            ({formatLastUpdated(balanceLastUpdated)})
          </LastUpdated>
        )}
        
        {showError && balanceError && (
          <ErrorTooltip>
            {balanceError}
          </ErrorTooltip>
        )}
      </BalanceDisplay>

      {/* Platform Balance (if requested and available) */}
      {showPlatformBalance && platformBalance > 0 && isEnhanced && (
        <BalanceDisplay $status="sufficient">
          Platform: {formatBalance(platformBalance)} BTC
        </BalanceDisplay>
      )}

      {/* Refresh Button */}
      <RefreshButton 
        onClick={handleRefresh} 
        disabled={isRefreshing}
        title={isEnhanced ? "Refresh all balances" : "Refresh balance"}
      >
        {isRefreshing ? '⏳' : '🔄'}
      </RefreshButton>
    </BalanceContainer>
  );
};
