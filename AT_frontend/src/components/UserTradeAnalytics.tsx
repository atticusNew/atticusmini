import React, { useState } from 'react';
import styled from 'styled-components';
import { Principal } from '@dfinity/principal';
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

const UserInput = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  align-items: center;
`;

const Input = styled.input`
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text);
  font-size: 0.9rem;
`;

const Button = styled.button`
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;

  &:hover {
    background: var(--primary-dark);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const SummaryCard = styled.div`
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid var(--border);
`;

const SummaryLabel = styled.div`
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 0.5rem;
`;

const SummaryValue = styled.div<{ $positive?: boolean; $negative?: boolean }>`
  font-weight: bold;
  font-size: 1.1rem;
  color: ${props => 
    props.$positive ? '#00ff88' : 
    props.$negative ? '#ff4444' : 
    'var(--text)'
  };
`;

const TradesTable = styled.div`
  background: var(--bg-secondary);
  border-radius: 6px;
  border: 1px solid var(--border);
  overflow: hidden;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--bg-primary);
  font-weight: 600;
  border-bottom: 1px solid var(--border);
  font-size: 0.9rem;
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid var(--border);
  font-size: 0.85rem;

  &:last-child {
    border-bottom: none;
  }
`;

const TableCell = styled.div<{ $positive?: boolean; $negative?: boolean }>`
  color: ${props => 
    props.$positive ? '#00ff88' : 
    props.$negative ? '#ff4444' : 
    'var(--text)'
  };
  font-family: monospace;
  font-size: 0.9rem;
`;

const ExportButton = styled(Button)`
  background: var(--green);
  margin-top: 1rem;
`;

interface UserTradeSummary {
  total_trades: number;
  total_pnl: number;
  win_count: number;
  loss_count: number;
  trades: any[];
}

export const UserTradeAnalytics: React.FC = () => {
  const { tradingCanister } = useCanister();
  const [userPrincipal, setUserPrincipal] = useState('');
  const [tradeSummary, setTradeSummary] = useState<UserTradeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserTrades = async () => {
    if (!userPrincipal.trim() || !tradingCanister) {
      setError('Please enter a user principal');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const principal = Principal.fromText(userPrincipal.trim());
      const summary = await tradingCanister.get_user_trade_summary(principal) as any;
      console.log('🔍 Raw Trade Summary Data:', summary);
      console.log('🔍 Summary Type:', typeof summary);
      console.log('🔍 Summary Keys:', Object.keys(summary || {}));
      console.log('🔍 Trades Array:', summary?.trades);
      
      // ✅ FIX: Convert BigInt values to numbers
      const convertedSummary = {
        ...summary,
        total_trades: Number(summary.total_trades),
        total_pnl: Number(summary.total_pnl),
        win_count: Number(summary.win_count),
        loss_count: Number(summary.loss_count),
        trades: summary.trades.map((trade: any) => {
          // ✅ FIXED: Use robust settlement price parsing (copied from PositionManager.tsx)
          let settlementPrice = null;
          if (trade.settlement_price && Array.isArray(trade.settlement_price) && trade.settlement_price.length > 0) {
            // Candid opt format: [value] (array format)
            settlementPrice = trade.settlement_price[0];
            console.log('📊 Using actual settlement price from array:', settlementPrice);
          } else if (trade.settlement_price && typeof trade.settlement_price === 'object' && 'Some' in trade.settlement_price) {
            // Candid opt format: { Some: value }
            settlementPrice = trade.settlement_price.Some;
            console.log('📊 Using actual settlement price from opt:', settlementPrice);
          } else if (trade.settlement_price !== null && trade.settlement_price !== undefined && typeof trade.settlement_price === 'number') {
            // Direct value format (fallback)
            settlementPrice = trade.settlement_price;
            console.log('📊 Using direct settlement price:', settlementPrice);
          } else {
            console.log('📊 Settlement price not available, will show Pending');
          }

          return {
            ...trade,
            id: Number(trade.id),
            strike_price: Number(trade.strike_price),
            entry_price: Number(trade.entry_price),
            size: Number(trade.size),
            entry_premium: Number(trade.entry_premium),
            current_value: Number(trade.current_value),
            pnl: Number(trade.pnl),
            opened_at: Number(trade.opened_at),
            settled_at: trade.settled_at ? Number(trade.settled_at) : null,
            settlement_price: settlementPrice ? Number(settlementPrice) : null,
            expiry_timestamp: trade.expiry_timestamp ? Number(trade.expiry_timestamp) : null
          };
        })
      };
      
      setTradeSummary(convertedSummary);
    } catch (err) {
      console.error('Failed to fetch user trades:', err);
      setError('Failed to fetch user trade data');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!tradeSummary) return;

    const csvContent = [
      ['Trade ID', 'Type', 'Strike', 'Entry Price', 'Settlement Price', 'Expiry Time', 'Status', 'PnL', 'Opened At'],
      ...tradeSummary.trades.map((trade: any) => [
        trade.id?.toString() || 'N/A',
        trade.option_type ? ('Call' in trade.option_type ? 'Call' : 'Put') : 'Call',
        trade.strike_price?.toString() || '0',
        trade.entry_price?.toString() || '0',
        trade.settlement_price ? `$${Number(trade.settlement_price).toFixed(2)}` : 'No settlement data',
        trade.expiry_timestamp ? `${Math.max(0, Math.ceil((Number(trade.expiry_timestamp) - Number(trade.opened_at)) / 1000000000))}s` : 'ERROR - NO EXPIRY DATA',
        trade.status ? Object.keys(trade.status)[0] || 'Unknown' : 'Unknown',
        trade.pnl?.toString() || '0',
        trade.opened_at ? new Date(Number(trade.opened_at) / 1000000).toISOString() : 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user_trades_${userPrincipal.substring(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Section>
      <SectionTitle>📊 User Trade Analytics</SectionTitle>
      
      <UserInput>
        <Input
          type="text"
          value={userPrincipal}
          onChange={(e) => setUserPrincipal(e.target.value)}
          placeholder="Enter user principal (e.g., h4esp-g4cxg-ql7rh-s4bxa-jnr33-dn6kr-vxvh7-s3ahv-mj5dq-vmf6o-mae)"
        />
        <Button onClick={fetchUserTrades} disabled={loading}>
          {loading ? 'Loading...' : 'Get User Trades'}
        </Button>
      </UserInput>

      {error && (
        <div style={{ color: '#ff4444', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(255, 68, 68, 0.1)', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {tradeSummary && (
        <>
          <SummaryGrid>
            <SummaryCard>
              <SummaryLabel>Total Trades</SummaryLabel>
              <SummaryValue>{tradeSummary.total_trades}</SummaryValue>
            </SummaryCard>
            
            <SummaryCard>
              <SummaryLabel>Total PnL</SummaryLabel>
              <SummaryValue $positive={tradeSummary.total_pnl > 0} $negative={tradeSummary.total_pnl < 0}>
                ${tradeSummary.total_pnl.toFixed(2)} USD
              </SummaryValue>
            </SummaryCard>
            
            <SummaryCard>
              <SummaryLabel>Wins</SummaryLabel>
              <SummaryValue $positive={true}>{tradeSummary.win_count}</SummaryValue>
            </SummaryCard>
            
            <SummaryCard>
              <SummaryLabel>Losses</SummaryLabel>
              <SummaryValue $negative={true}>{tradeSummary.loss_count}</SummaryValue>
            </SummaryCard>
            
            <SummaryCard>
              <SummaryLabel>Win Rate</SummaryLabel>
              <SummaryValue>
                {tradeSummary.total_trades > 0 
                  ? ((tradeSummary.win_count / tradeSummary.total_trades) * 100).toFixed(1) + '%'
                  : '0%'
                }
              </SummaryValue>
            </SummaryCard>
          </SummaryGrid>

          {tradeSummary.trades.length > 0 && (
            <>
              <TradesTable>
                <TableHeader>
                  <div>Trade ID</div>
                  <div>Type</div>
                  <div>Strike</div>
                  <div>Entry Price</div>
                  <div>Settlement Price</div>
                  <div>Expiry Time</div>
                  <div>Status</div>
                  <div>PnL</div>
                </TableHeader>
                {tradeSummary.trades.slice(0, 10).map((trade: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{trade.id?.toString() || 'N/A'}</TableCell>
                    <TableCell>
                      {trade.option_type ? ('Call' in trade.option_type ? 'Call' : 'Put') : 'Call'}
                    </TableCell>
                    <TableCell>{trade.strike_price?.toString() || '0'}</TableCell>
                    <TableCell>{trade.entry_price?.toString() || '0'}</TableCell>
                    <TableCell>
                      {(() => {
                        console.log('🔍 Trade settlement price debug:', {
                          tradeId: trade.id,
                          settlementPrice: trade.settlement_price,
                          type: typeof trade.settlement_price,
                          isNull: trade.settlement_price === null,
                          isUndefined: trade.settlement_price === undefined
                        });
                        
                        if (trade.settlement_price !== null && trade.settlement_price !== undefined) {
                          return `$${Number(trade.settlement_price).toFixed(2)}`;
                        } else {
                          return 'No settlement data';
                        }
                      })()}
                    </TableCell>
                    <TableCell>
                      {trade.expiry_timestamp ? 
                        `${Math.max(0, Math.ceil((Number(trade.expiry_timestamp) - Number(trade.opened_at)) / 1000000000))}s` : 
                        'ERROR - NO EXPIRY DATA'
                      }
                    </TableCell>
                    <TableCell>
                      {trade.status ? Object.keys(trade.status)[0] : 'Unknown'}
                    </TableCell>
                    <TableCell $positive={trade.pnl > 0} $negative={trade.pnl < 0}>
                      ${trade.pnl?.toString() || '0'} USD
                    </TableCell>
                  </TableRow>
                ))}
              </TradesTable>
              
              {tradeSummary.trades.length > 10 && (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-dim)' }}>
                  Showing first 10 of {tradeSummary.trades.length} trades
                </div>
              )}
              
              <ExportButton onClick={exportToCSV}>
                📥 Export to CSV
              </ExportButton>
            </>
          )}
        </>
      )}
    </Section>
  );
};
