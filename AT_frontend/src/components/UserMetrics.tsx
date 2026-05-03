import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useCanister } from '../contexts/CanisterProvider';

const Section = styled.div`
  background: var(--bg-panel);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid var(--border);
`;

const SectionTitle = styled.h2`
  color: var(--text);
  margin-bottom: 1rem;
  font-size: 1.25rem;
`;

const UserGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const UserCard = styled.div`
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid var(--border);
`;

const UserHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
`;

const UserPrincipal = styled.div`
  font-family: monospace;
  font-size: 0.9rem;
  color: var(--text);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CopyButton = styled.button`
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: var(--primary-dark);
  }
`;

const UserShortId = styled.div`
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--text-dim);
  background: var(--bg-primary);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
`;

const MetricsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 0.5rem;
`;

const MetricItem = styled.div`
  background: var(--bg-primary);
  padding: 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const MetricLabel = styled.div`
  font-size: 0.8rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MetricValue = styled.div<{ $positive?: boolean; $negative?: boolean }>`
  font-size: 0.9rem;
  font-weight: bold;
  font-family: monospace;
  color: ${props => 
    props.$positive ? '#00ff88' : 
    props.$negative ? '#ff4444' : 
    'var(--text)'
  };
`;

const StatusIndicator = styled.div<{ $status: 'active' | 'error' | 'warning' }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 0.5rem;
  background: ${props => 
    props.$status === 'active' ? '#00ff88' :
    props.$status === 'error' ? '#ff4444' :
    '#ffaa00'
  };
`;

const QuickStats = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(0, 123, 255, 0.1);
  border: 1px solid var(--primary);
  border-radius: 6px;
  font-size: 0.9rem;
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const LoadingText = styled.div`
  text-align: center;
  color: var(--text-dim);
  padding: 2rem;
`;

const ErrorText = styled.div`
  text-align: center;
  color: #ff4444;
  padding: 1rem;
  background: rgba(255, 68, 68, 0.1);
  border-radius: 6px;
  margin-bottom: 1rem;
`;

const RefreshButton = styled.button`
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  margin-bottom: 1rem;

  &:hover {
    background: var(--primary-dark);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface UserData {
  principal: string;
  fullPrincipal: string; // ✅ ADD: Store full principal for copying
  balance: number;
  deposits: number;
  withdrawals: number;
  wins: number; // ✅ NEW: Credits from winning trades
  losses: number; // ✅ NEW: Debits from losing trades
  netPnl: number; // ✅ NEW: Wins - Losses (trading performance)
}

export const UserMetrics: React.FC = () => {
  const { tradingCanister } = useCanister();
  const [userData, setUserData] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedPrincipal, setCopiedPrincipal] = useState<string | null>(null);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPrincipal(text);
      setTimeout(() => setCopiedPrincipal(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Dynamic user detection - no more hardcoded principals

  const fetchUserMetrics = async () => {
    if (!tradingCanister) {
      setError('Trading canister not available');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // ✅ NEW: Get all users dynamically from backend
      const allUsers = await tradingCanister.get_all_users() as any;
      const userMetrics: UserData[] = [];
      
      for (const [principal, userData] of allUsers) {
        const principalText = principal.toString();
        const shortPrincipal = principalText.substring(0, 8) + '...' + principalText.substring(principalText.length - 8);
        
        console.log('🔍 User Data Debug:', {
          principal: principalText,
          balance: userData.balance,
          total_deposits: userData.total_deposits,
          total_withdrawals: userData.total_withdrawals,
          total_wins: userData.total_wins,
          total_losses: userData.total_losses,
          net_pnl: userData.net_pnl
        });
        
        userMetrics.push({
          principal: shortPrincipal,
          fullPrincipal: principalText, // ✅ ADD: Store full principal
          balance: Number(userData.balance),
          deposits: Number(userData.total_deposits) || 0,
          withdrawals: Number(userData.total_withdrawals) || 0,
          wins: Number(userData.total_wins) || 0, // ✅ NEW: Trading wins
          losses: Number(userData.total_losses) || 0, // ✅ NEW: Trading losses
          netPnl: Number(userData.net_pnl) || 0 // ✅ NEW: Net PnL
        });
      }
      
      setUserData(userMetrics);
    } catch (err) {
      console.error('Failed to fetch user metrics:', err);
      setError('Failed to fetch user metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserMetrics();
  }, [tradingCanister]);

  if (loading) {
    return (
      <Section>
        <SectionTitle>📊 Live User Metrics</SectionTitle>
        <LoadingText>Loading user metrics...</LoadingText>
      </Section>
    );
  }

  return (
    <Section>
      <SectionTitle>📊 Live User Metrics</SectionTitle>
      
      <RefreshButton onClick={fetchUserMetrics} disabled={loading}>
        🔄 Refresh User Data
      </RefreshButton>

      {error && (
        <ErrorText>{error}</ErrorText>
      )}

      {userData.length > 0 && (
        <UserGrid>
          {userData.map((user, index) => (
            <UserCard key={index}>
              <UserHeader>
                <UserPrincipal>
                  <StatusIndicator $status={user.balance > 0 ? 'active' : 'error'} />
                  👤 User {index + 1}: {user.principal}
                  <CopyButton 
                    onClick={() => copyToClipboard(user.fullPrincipal)}
                    title="Copy full principal"
                  >
                    {copiedPrincipal === user.fullPrincipal ? '✓' : '📋'}
                  </CopyButton>
                </UserPrincipal>
                <UserShortId>Live User</UserShortId>
              </UserHeader>
              
              <MetricsRow>
                <MetricItem>
                  <MetricLabel>Balance</MetricLabel>
                  <MetricValue $positive={user.balance > 0}>
                    {user.balance > 0 ? `${user.balance.toFixed(8)} BTC` : 'ERROR - NO DATA'}
                  </MetricValue>
                </MetricItem>
                
                <MetricItem>
                  <MetricLabel>Deposits</MetricLabel>
                  <MetricValue $positive={user.deposits > 0}>
                    {user.deposits > 0 ? `${user.deposits.toFixed(8)} BTC` : 'ERROR - NOT TRACKED'}
                  </MetricValue>
                </MetricItem>
              </MetricsRow>
              
              <MetricsRow>
                <MetricItem>
                  <MetricLabel>Withdrawals</MetricLabel>
                  <MetricValue $negative={user.withdrawals > 0}>
                    {user.withdrawals.toFixed(8)} BTC
                  </MetricValue>
                </MetricItem>
                
                <MetricItem>
                  <MetricLabel>Wins</MetricLabel>
                  <MetricValue $positive={user.wins > 0}>
                    {user.wins.toFixed(8)} BTC
                  </MetricValue>
                </MetricItem>
              </MetricsRow>
              
              <MetricsRow>
                <MetricItem>
                  <MetricLabel>Losses</MetricLabel>
                  <MetricValue $negative={user.losses > 0}>
                    {user.losses.toFixed(8)} BTC
                  </MetricValue>
                </MetricItem>
                
                <MetricItem>
                  <MetricLabel>Net PnL</MetricLabel>
                  <MetricValue $positive={user.netPnl > 0} $negative={user.netPnl < 0}>
                    {user.netPnl.toFixed(8)} BTC
                  </MetricValue>
                </MetricItem>
              </MetricsRow>
            </UserCard>
          ))}
        </UserGrid>
      )}

      {userData.length > 0 && (
        <QuickStats>
          <StatItem>
            <StatusIndicator $status="active" />
            <strong>Live Users:</strong> {userData.length}
          </StatItem>
          <StatItem>
            <strong>Total Balance:</strong> {userData.reduce((sum, user) => sum + user.balance, 0).toFixed(8)} BTC
          </StatItem>
          <StatItem>
            <strong>Total Deposits:</strong> {userData.reduce((sum, user) => sum + user.deposits, 0).toFixed(8)} BTC
          </StatItem>
          <StatItem>
            <strong>Total Withdrawals:</strong> {userData.reduce((sum, user) => sum + user.withdrawals, 0).toFixed(8)} BTC
          </StatItem>
        </QuickStats>
      )}
    </Section>
  );
};
