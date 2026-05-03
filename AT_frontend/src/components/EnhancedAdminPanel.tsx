/**
 * ✅ ENHANCED ADMIN PANEL
 * Simplified admin console using new services while preserving existing functionality
 * Provides real-time updates and better error handling
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useCanister } from '../contexts/CanisterProvider';
import { Principal } from '@dfinity/principal';
import { enhancedAdminService, AdminData, PlatformMetrics, UserMetrics } from '../services/EnhancedAdminService';

const AdminContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  background: var(--bg-primary);
  color: var(--text);
`;

const Title = styled.h1`
  color: var(--text);
  margin-bottom: 2rem;
  text-align: center;
`;

const StatusCard = styled.div`
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const StatusItem = styled.div`
  text-align: center;
`;

const StatusLabel = styled.div`
  font-size: 0.9rem;
  color: var(--text-dim);
  margin-bottom: 0.5rem;
`;

const StatusValue = styled.div<{ $status?: 'online' | 'offline' | 'success' | 'error' }>`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${props => {
    switch (props.$status) {
      case 'online':
      case 'success':
        return 'var(--green)';
      case 'offline':
      case 'error':
        return 'var(--red)';
      default:
        return 'var(--text)';
    }
  }};
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
`;

const MetricsCard = styled.div`
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.5rem;
`;

const CardTitle = styled.h3`
  color: var(--text);
  margin-bottom: 1rem;
  font-size: 1.1rem;
`;

const MetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
  
  &:last-child {
    border-bottom: none;
  }
`;

const MetricLabel = styled.span`
  color: var(--text-dim);
  font-size: 0.9rem;
`;

const MetricValue = styled.span<{ $positive?: boolean; $negative?: boolean }>`
  font-weight: 600;
  color: ${props => 
    props.$positive ? 'var(--green)' : 
    props.$negative ? 'var(--red)' : 
    'var(--text)'
  };
`;

const Button = styled.button`
  background: var(--accent);
  color: var(--bg-primary);
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  margin: 0.5rem;
  
  &:hover {
    background: #e6c435;
  }
  
  &:disabled {
    background: var(--text-dim);
    cursor: not-allowed;
  }
`;

const ExportButton = styled(Button)`
  background: var(--green);
  color: white;
  
  &:hover {
    background: #00c4aa;
  }
`;

const LoadingText = styled.div`
  color: var(--text-dim);
  text-align: center;
  padding: 2rem;
`;

const ErrorText = styled.div`
  color: var(--red);
  text-align: center;
  padding: 1rem;
  background: rgba(255, 71, 87, 0.1);
  border-radius: 4px;
  margin: 1rem 0;
`;

const UserTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: var(--bg-panel);
  border-radius: 8px;
  overflow: hidden;
`;

const TableHeader = styled.th`
  background: var(--accent);
  color: var(--bg-primary);
  padding: 1rem;
  text-align: left;
  font-weight: 600;
`;

const TableCell = styled.td`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  color: var(--text);
`;

const TableRow = styled.tr`
  &:hover {
    background: var(--bg-button);
  }
`;

export const EnhancedAdminPanel: React.FC<{ onLogout?: () => Promise<void> }> = ({ onLogout }) => {
  const { isConnected, atticusService, treasuryService } = useCanister();
  const [adminData, setAdminData] = useState<AdminData>({
    platformMetrics: null,
    userMetrics: [],
    isLoading: false,
    error: null,
    lastUpdated: 0
  });

  // Initialize admin service
  useEffect(() => {
    if (atticusService && treasuryService) {
      enhancedAdminService.initialize({
        atticusService,
        treasuryService,
        isConnected
      });

      // Add data listener
      const handleDataUpdate = (data: AdminData) => {
        setAdminData(data);
      };

      enhancedAdminService.addDataListener(handleDataUpdate);

      // Initial data fetch
      enhancedAdminService.fetchAllData();

      return () => {
        enhancedAdminService.removeDataListener(handleDataUpdate);
      };
    }
  }, [atticusService, treasuryService, isConnected]);

  // Update connection status
  useEffect(() => {
    enhancedAdminService.updateConnectionStatus(isConnected);
  }, [isConnected]);

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

  const formatNumber = (value: number, decimals: number = 2): string => {
    return value.toFixed(decimals);
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <AdminContainer>
      <Title>🏦 Enhanced Admin Panel</Title>
      
      {/* Status Overview */}
      <StatusCard>
        <StatusItem>
          <StatusLabel>Connection Status</StatusLabel>
          <StatusValue $status={isConnected ? 'online' : 'offline'}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </StatusValue>
        </StatusItem>
        
        <StatusItem>
          <StatusLabel>Data Status</StatusLabel>
          <StatusValue $status={adminData.error ? 'error' : 'success'}>
            {adminData.error ? '❌ Error' : '✅ Ready'}
          </StatusValue>
        </StatusItem>
        
        <StatusItem>
          <StatusLabel>Last Updated</StatusLabel>
          <StatusValue>
            {adminData.lastUpdated ? formatTimestamp(adminData.lastUpdated) : 'Never'}
          </StatusValue>
        </StatusItem>
        
        <StatusItem>
          <StatusLabel>Total Users</StatusLabel>
          <StatusValue>
            {adminData.userMetrics.length}
          </StatusValue>
        </StatusItem>
      </StatusCard>

      {/* Action Buttons */}
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <Button onClick={handleRefresh} disabled={adminData.isLoading}>
          {adminData.isLoading ? '🔄 Loading...' : '🔄 Refresh Data'}
        </Button>
        <ExportButton onClick={handleExport} disabled={!adminData.platformMetrics}>
          📥 Export CSV
        </ExportButton>
      </div>

      {/* Error Display */}
      {adminData.error && (
        <ErrorText>{adminData.error}</ErrorText>
      )}

      {/* Loading State */}
      {adminData.isLoading && !adminData.platformMetrics && (
        <LoadingText>Loading admin data...</LoadingText>
      )}

      {/* Platform Metrics */}
      {adminData.platformMetrics && (
        <MetricsGrid>
          {/* Wallet Metrics */}
          <MetricsCard>
            <CardTitle>💰 Platform Wallet</CardTitle>
            <MetricRow>
              <MetricLabel>Balance (BTC)</MetricLabel>
              <MetricValue>{formatNumber(adminData.platformMetrics.wallet.balance, 8)}</MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>Total Deposits (BTC)</MetricLabel>
              <MetricValue>{formatNumber(adminData.platformMetrics.wallet.totalDeposits, 8)}</MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>Total Withdrawals (BTC)</MetricLabel>
              <MetricValue>{formatNumber(adminData.platformMetrics.wallet.totalWithdrawals, 8)}</MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>Blockchain Balance (BTC)</MetricLabel>
              <MetricValue>
                {adminData.platformMetrics.blockchainBalance 
                  ? formatNumber(adminData.platformMetrics.blockchainBalance, 8)
                  : 'N/A'
                }
              </MetricValue>
            </MetricRow>
          </MetricsCard>

          {/* Ledger Metrics */}
          <MetricsCard>
            <CardTitle>📊 Trading Ledger</CardTitle>
            <MetricRow>
              <MetricLabel>Winning Trades (USD)</MetricLabel>
              <MetricValue $positive={adminData.platformMetrics.ledger.totalWinningTrades > 0}>
                ${formatNumber(adminData.platformMetrics.ledger.totalWinningTrades)}
              </MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>Losing Trades (USD)</MetricLabel>
              <MetricValue $negative={adminData.platformMetrics.ledger.totalLosingTrades > 0}>
                ${formatNumber(adminData.platformMetrics.ledger.totalLosingTrades)}
              </MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>Net PnL (USD)</MetricLabel>
              <MetricValue 
                $positive={adminData.platformMetrics.ledger.netPnl > 0}
                $negative={adminData.platformMetrics.ledger.netPnl < 0}
              >
                ${formatNumber(adminData.platformMetrics.ledger.netPnl)}
              </MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>Total Trades</MetricLabel>
              <MetricValue>{adminData.platformMetrics.ledger.totalTrades}</MetricValue>
            </MetricRow>
          </MetricsCard>

          {/* Trading Summary */}
          <MetricsCard>
            <CardTitle>📈 Trading Summary</CardTitle>
            <MetricRow>
              <MetricLabel>Total Volume (USD)</MetricLabel>
              <MetricValue>${formatNumber(adminData.platformMetrics.tradingSummary.totalVolume)}</MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>Total PnL (USD)</MetricLabel>
              <MetricValue 
                $positive={adminData.platformMetrics.tradingSummary.totalPnL > 0}
                $negative={adminData.platformMetrics.tradingSummary.totalPnL < 0}
              >
                ${formatNumber(adminData.platformMetrics.tradingSummary.totalPnL)}
              </MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>Total Trades</MetricLabel>
              <MetricValue>{adminData.platformMetrics.tradingSummary.totalTrades}</MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>Win Rate</MetricLabel>
              <MetricValue $positive={adminData.platformMetrics.tradingSummary.winRate > 0.5}>
                {formatPercentage(adminData.platformMetrics.tradingSummary.winRate)}
              </MetricValue>
            </MetricRow>
          </MetricsCard>
        </MetricsGrid>
      )}

      {/* User Metrics Table */}
      {adminData.userMetrics.length > 0 && (
        <MetricsCard>
          <CardTitle>👥 User Metrics ({adminData.userMetrics.length} users)</CardTitle>
          <UserTable>
            <thead>
              <tr>
                <TableHeader>Principal</TableHeader>
                <TableHeader>Balance (BTC)</TableHeader>
                <TableHeader>Total Wins (BTC)</TableHeader>
                <TableHeader>Total Losses (BTC)</TableHeader>
                <TableHeader>Net PnL (BTC)</TableHeader>
                <TableHeader>Deposits (BTC)</TableHeader>
                <TableHeader>Withdrawals (BTC)</TableHeader>
              </tr>
            </thead>
            <tbody>
              {adminData.userMetrics.map((user, index) => (
                <TableRow key={index}>
                  <TableCell>{user.principal.substring(0, 8)}...{user.principal.substring(user.principal.length - 8)}</TableCell>
                  <TableCell>{formatNumber(user.balance, 8)}</TableCell>
                  <TableCell $positive={user.totalWins > 0}>{formatNumber(user.totalWins, 8)}</TableCell>
                  <TableCell $negative={user.totalLosses > 0}>{formatNumber(user.totalLosses, 8)}</TableCell>
                  <TableCell 
                    $positive={user.netPnl > 0}
                    $negative={user.netPnl < 0}
                  >
                    {formatNumber(user.netPnl, 8)}
                  </TableCell>
                  <TableCell>{formatNumber(user.totalDeposits, 8)}</TableCell>
                  <TableCell>{formatNumber(user.totalWithdrawals, 8)}</TableCell>
                </TableRow>
              ))}
            </tbody>
          </UserTable>
        </MetricsCard>
      )}
    </AdminContainer>
  );
};
