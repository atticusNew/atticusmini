import React, { useState, useEffect } from 'react';
import { useCanister } from '../contexts/CanisterProvider';
import styled from 'styled-components';

const Section = styled.div`
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h3`
  color: #fff;
  margin: 0 0 1rem 0;
  font-size: 1.2rem;
  font-weight: 600;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`;

const MetricItem = styled.div`
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 1rem;
  text-align: center;
`;

const MetricLabel = styled.div`
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
`;

const MetricValue = styled.div<{ $positive?: boolean; $negative?: boolean }>`
  color: ${props => 
    props.$positive ? '#4ade80' : 
    props.$negative ? '#f87171' : 
    '#fff'
  };
  font-size: 1.1rem;
  font-weight: 600;
`;

const LoadingText = styled.div`
  color: #888;
  text-align: center;
  padding: 2rem;
`;

const ErrorText = styled.div`
  color: #f87171;
  text-align: center;
  padding: 2rem;
`;

const RefreshButton = styled.button`
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  
  &:hover {
    background: #2563eb;
  }
  
  &:disabled {
    background: #6b7280;
    cursor: not-allowed;
  }
`;

interface PlatformLedgerData {
  total_winning_trades: number;
  total_losing_trades: number;
  net_pnl: number;
  total_trades: number;
}

export const PlatformLedger: React.FC = () => {
  const { tradingCanister } = useCanister();
  const [ledgerData, setLedgerData] = useState<PlatformLedgerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlatformLedger = async () => {
    if (!tradingCanister) {
      setError('Trading canister not available');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const ledger = await tradingCanister.get_platform_ledger() as any;
      console.log('🔍 Platform Ledger Raw Data:', ledger);
      console.log('🔍 Platform Ledger Type:', typeof ledger);
      console.log('🔍 Platform Ledger Keys:', Object.keys(ledger || {}));
      
      setLedgerData({
        total_winning_trades: Number(ledger.total_winning_trades),
        total_losing_trades: Number(ledger.total_losing_trades),
        net_pnl: Number(ledger.net_pnl),
        total_trades: Number(ledger.total_trades)
      });
    } catch (err) {
      console.error('Failed to fetch platform ledger:', err);
      setError('Failed to fetch platform ledger data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformLedger();
  }, [tradingCanister]);

  if (loading) {
    return (
      <Section>
        <SectionTitle>📊 Platform Ledger (Trading PnL)</SectionTitle>
        <LoadingText>Loading platform ledger...</LoadingText>
      </Section>
    );
  }

  return (
    <Section>
      <SectionTitle>📊 Platform Ledger (Trading PnL)</SectionTitle>
      
      <RefreshButton onClick={fetchPlatformLedger} disabled={loading}>
        🔄 Refresh Ledger Data
      </RefreshButton>

      {error && (
        <ErrorText>{error}</ErrorText>
      )}

      {ledgerData && (
        <MetricsGrid>
          <MetricItem>
            <MetricLabel>Winning Trades</MetricLabel>
            <MetricValue $positive={ledgerData.total_winning_trades > 0}>
              ${ledgerData.total_winning_trades.toFixed(2)} USD
            </MetricValue>
          </MetricItem>
          
          <MetricItem>
            <MetricLabel>Losing Trades</MetricLabel>
            <MetricValue $negative={ledgerData.total_losing_trades > 0}>
              ${ledgerData.total_losing_trades.toFixed(2)} USD
            </MetricValue>
          </MetricItem>
          
          <MetricItem>
            <MetricLabel>Net PnL</MetricLabel>
            <MetricValue 
              $positive={ledgerData.net_pnl > 0} 
              $negative={ledgerData.net_pnl < 0}
            >
              ${ledgerData.net_pnl.toFixed(2)} USD
            </MetricValue>
          </MetricItem>
          
          <MetricItem>
            <MetricLabel>Total Trades</MetricLabel>
            <MetricValue>
              {ledgerData.total_trades}
            </MetricValue>
          </MetricItem>
        </MetricsGrid>
      )}
    </Section>
  );
};
