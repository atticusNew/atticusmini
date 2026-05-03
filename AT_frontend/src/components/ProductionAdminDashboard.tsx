/**
 * ✅ PRODUCTION ADMIN DASHBOARD
 * Real admin interface for live platform management
 * Uses actual data from your live canisters
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useCanister } from '../contexts/CanisterProvider';
import { useEnhancedServices } from '../hooks/useEnhancedServices';

const DashboardContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  background: var(--bg-primary);
  color: var(--text);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
`;

const Title = styled.h1`
  color: var(--text);
  margin: 0;
`;

const StatusBadge = styled.div<{ $status: 'online' | 'offline' | 'error' }>`
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  background: ${props => {
    switch (props.$status) {
      case 'online': return 'rgba(0, 212, 170, 0.1)';
      case 'offline': return 'rgba(255, 71, 87, 0.1)';
      case 'error': return 'rgba(255, 193, 7, 0.1)';
      default: return 'rgba(128, 128, 128, 0.1)';
    }
  }};
  border: 1px solid ${props => {
    switch (props.$status) {
      case 'online': return 'var(--green)';
      case 'offline': return 'var(--red)';
      case 'error': return '#ffc107';
      default: return 'var(--border)';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'online': return 'var(--green)';
      case 'offline': return 'var(--red)';
      case 'error': return '#ffc107';
      default: return 'var(--text-dim)';
    }
  }};
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const MetricCard = styled.div`
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.5rem;
`;

const CardTitle = styled.h3`
  color: var(--text);
  margin: 0 0 1rem 0;
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

const ActionBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: var(--bg-panel);
  border-radius: 8px;
  border: 1px solid var(--border);
`;

const Button = styled.button`
  background: var(--accent);
  color: var(--bg-primary);
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  
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

const LoadingText = styled.div`
  text-align: center;
  color: var(--text-dim);
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

export const ProductionAdminDashboard: React.FC = () => {
  const { isConnected, atticusService, treasuryService } = useCanister();
  const {
    adminData,
    isInitialized,
    refreshAdminData,
    exportAdminData
  } = useEnhancedServices();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Auto-refresh data when component mounts
  useEffect(() => {
    if (isInitialized) {
      refreshAdminData();
    }
  }, [isInitialized, refreshAdminData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAdminData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExport = () => {
    const csvData = exportAdminData();
    if (csvData) {
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `platform_data_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    }
  };

  const getConnectionStatus = (): 'online' | 'offline' | 'error' => {
    if (!isConnected) return 'offline';
    if (adminData?.error) return 'error';
    return 'online';
  };

  const formatNumber = (value: number, decimals: number = 2): string => {
    return value.toFixed(decimals);
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  if (!isInitialized) {
    return (
      <DashboardContainer>
        <LoadingText>Initializing admin dashboard...</LoadingText>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <Header>
        <Title>🏦 Platform Administration</Title>
        <StatusBadge $status={getConnectionStatus()}>
          {getConnectionStatus() === 'online' ? '🟢 Online' : 
           getConnectionStatus() === 'error' ? '⚠️ Error' : '🔴 Offline'}
        </StatusBadge>
      </Header>

      <ActionBar>
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? '🔄 Refreshing...' : '🔄 Refresh Data'}
        </Button>
        <ExportButton onClick={handleExport} disabled={!adminData?.platformMetrics}>
          📥 Export Data
        </ExportButton>
        {exportSuccess && (
          <span style={{ color: 'var(--green)', alignSelf: 'center' }}>
            ✅ Data exported successfully
          </span>
        )}
      </ActionBar>

      {adminData?.error && (
        <ErrorText>{adminData.error}</ErrorText>
      )}

      {adminData?.platformMetrics && (
        <MetricsGrid>
          {/* Platform Wallet */}
          <MetricCard>
            <CardTitle>💰 Platform Wallet</CardTitle>
            <MetricRow>
              <MetricLabel>Current Balance</MetricLabel>
              <MetricValue>{formatNumber(adminData.platformMetrics.wallet.balance, 8)} BTC</MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>Total Deposits</MetricLabel>
              <MetricValue>{formatNumber(adminData.platformMetrics.wallet.totalDeposits, 8)} BTC</MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>Total Withdrawals</MetricLabel>
              <MetricValue>{formatNumber(adminData.platformMetrics.wallet.totalWithdrawals, 8)} BTC</MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>Blockchain Balance</MetricLabel>
              <MetricValue>
                {adminData.platformMetrics.blockchainBalance 
                  ? `${formatNumber(adminData.platformMetrics.blockchainBalance, 8)} BTC`
                  : 'N/A'
                }
              </MetricValue>
            </MetricRow>
          </MetricCard>

          {/* Trading Ledger */}
          <MetricCard>
            <CardTitle>📊 Trading Ledger</CardTitle>
            <MetricRow>
              <MetricLabel>Winning Trades</MetricLabel>
              <MetricValue $positive={adminData.platformMetrics.ledger.totalWinningTrades > 0}>
                ${formatNumber(adminData.platformMetrics.ledger.totalWinningTrades)}
              </MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>Losing Trades</MetricLabel>
              <MetricValue $negative={adminData.platformMetrics.ledger.totalLosingTrades > 0}>
                ${formatNumber(adminData.platformMetrics.ledger.totalLosingTrades)}
              </MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>Net PnL</MetricLabel>
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
          </MetricCard>

          {/* Trading Summary */}
          <MetricCard>
            <CardTitle>📈 Trading Summary</CardTitle>
            <MetricRow>
              <MetricLabel>Total Volume</MetricLabel>
              <MetricValue>${formatNumber(adminData.platformMetrics.tradingSummary.totalVolume)}</MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>Total PnL</MetricLabel>
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
                {(adminData.platformMetrics.tradingSummary.winRate * 100).toFixed(1)}%
              </MetricValue>
            </MetricRow>
          </MetricCard>
        </MetricsGrid>
      )}

      {/* User Metrics Table */}
      {adminData?.userMetrics && adminData.userMetrics.length > 0 && (
        <MetricCard>
          <CardTitle>👥 Active Users ({adminData.userMetrics.length})</CardTitle>
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
                  <TableCell>
                    {user.principal.substring(0, 8)}...{user.principal.substring(user.principal.length - 8)}
                  </TableCell>
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
        </MetricCard>
      )}

      {/* Last Updated */}
      {adminData?.lastUpdated && (
        <div style={{ 
          textAlign: 'center', 
          color: 'var(--text-dim)', 
          fontSize: '0.9rem',
          marginTop: '2rem'
        }}>
          Last updated: {formatTimestamp(adminData.lastUpdated)}
        </div>
      )}
    </DashboardContainer>
  );
};
