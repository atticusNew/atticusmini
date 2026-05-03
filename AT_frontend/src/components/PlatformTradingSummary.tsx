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

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const SummaryCard = styled.div`
  background: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  text-align: center;
`;

const SummaryLabel = styled.div`
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 0.5rem;
`;

const SummaryValue = styled.div<{ $positive?: boolean; $negative?: boolean; $large?: boolean }>`
  font-weight: bold;
  font-size: ${props => props.$large ? '1.5rem' : '1.1rem'};
  color: ${props => 
    props.$positive ? '#00ff88' : 
    props.$negative ? '#ff4444' : 
    'var(--text)'
  };
  margin-bottom: 0.25rem;
`;

const SummarySubtext = styled.div`
  font-size: 0.8rem;
  opacity: 0.7;
`;

const Button = styled.button`
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  margin-right: 1rem;

  &:hover {
    background: var(--primary-dark);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ExportButton = styled(Button)`
  background: var(--green);
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

interface PlatformTradingSummary {
  total_volume: number;
  total_pnl: number;
  total_trades: number;
  win_rate: number;
}

export const PlatformTradingSummary: React.FC = () => {
  const { tradingCanister } = useCanister();
  const [summary, setSummary] = useState<PlatformTradingSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlatformSummary = async () => {
    if (!tradingCanister) {
      setError('Trading canister not available');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const platformSummary = await tradingCanister.get_platform_trading_summary() as any;
      
      // ✅ FIX: Convert BigInt values to numbers
      const convertedSummary = {
        total_volume: Number(platformSummary.total_volume),
        total_pnl: Number(platformSummary.total_pnl),
        total_trades: Number(platformSummary.total_trades),
        win_rate: Number(platformSummary.win_rate)
      };
      
      setSummary(convertedSummary);
    } catch (err) {
      console.error('Failed to fetch platform summary:', err);
      setError('Failed to fetch platform trading data');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!summary) return;

    const csvContent = [
      ['Metric', 'Value'],
      ['Total Volume (USD)', summary.total_volume.toString()],
      ['Total PnL (USD)', summary.total_pnl.toString()],
      ['Total Trades', summary.total_trades.toString()],
      ['Win Rate (%)', (summary.win_rate * 100).toFixed(2)],
      ['Generated At', new Date().toISOString()]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platform_trading_summary_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchPlatformSummary();
  }, [tradingCanister]);

  if (loading) {
    return (
      <Section>
        <SectionTitle>📈 Platform Trading Summary</SectionTitle>
        <LoadingText>Loading platform trading data...</LoadingText>
      </Section>
    );
  }

  return (
    <Section>
      <SectionTitle>📈 Platform Trading Summary</SectionTitle>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <Button onClick={fetchPlatformSummary} disabled={loading}>
          🔄 Refresh Data
        </Button>
        {summary && (
          <ExportButton onClick={exportToCSV}>
            📥 Export CSV
          </ExportButton>
        )}
      </div>

      {error && (
        <ErrorText>{error}</ErrorText>
      )}

      {summary && (
        <SummaryGrid>
          <SummaryCard>
            <SummaryLabel>Total Trading Volume</SummaryLabel>
            <SummaryValue $large={true}>
              ${summary.total_volume.toFixed(2)} USD
            </SummaryValue>
            <SummarySubtext>All time volume</SummarySubtext>
          </SummaryCard>
          
          <SummaryCard>
            <SummaryLabel>Platform PnL</SummaryLabel>
            <SummaryValue 
              $large={true}
              $positive={summary.total_pnl > 0} 
              $negative={summary.total_pnl < 0}
            >
              {summary.total_pnl > 0 ? '+' : ''}${summary.total_pnl.toFixed(2)} USD
            </SummaryValue>
            <SummarySubtext>
              {summary.total_pnl > 0 ? 'Profit' : summary.total_pnl < 0 ? 'Loss' : 'Break Even'}
            </SummarySubtext>
          </SummaryCard>
          
          <SummaryCard>
            <SummaryLabel>Total Trades</SummaryLabel>
            <SummaryValue $large={true}>
              {summary.total_trades}
            </SummaryValue>
            <SummarySubtext>All time trades</SummarySubtext>
          </SummaryCard>
          
          <SummaryCard>
            <SummaryLabel>Win Rate</SummaryLabel>
            <SummaryValue $large={true} $positive={summary.win_rate > 0.5}>
              {(summary.win_rate * 100).toFixed(1)}%
            </SummaryValue>
            <SummarySubtext>
              {summary.win_rate > 0.5 ? 'Above 50%' : 'Below 50%'}
            </SummarySubtext>
          </SummaryCard>
        </SummaryGrid>
      )}

    </Section>
  );
};



