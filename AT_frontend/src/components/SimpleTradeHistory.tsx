import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Principal } from '@dfinity/principal';
import { useCanister } from '../contexts/CanisterProvider';
import { useUnifiedAuth } from '../hooks/useUnifiedAuth';
import { atticusService } from '../services/AtticusService';

// ✅ SIMPLE TRADE HISTORY - Clean and straightforward
interface SimpleTrade {
  id: string;
  type: 'call' | 'put';
  strike: number;
  entryPrice: number;
  expiry: string;
  size: number;
  entryPremium: number;
  pnl: number;
  openedAt: number;
  settledAt: number | null;
  settlementPrice: number | undefined;
  status: string;
}

const Container = styled.div`
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  margin: 1rem 0;
`;

const Title = styled.h3`
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.2rem;
`;

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const RefreshButton = styled.button`
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    background: #0056b3;
  }
  
  &:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid #ffffff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const TradeItem = styled.div`
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TradeInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const TradeType = styled.span<{ type: 'call' | 'put' }>`
  font-weight: bold;
  color: ${props => props.type === 'call' ? '#28a745' : '#dc3545'};
`;

const TradeDetails = styled.div`
  font-size: 0.9rem;
  color: #666;
`;

const PnL = styled.span<{ positive: boolean }>`
  font-weight: bold;
  color: ${props => props.positive ? '#28a745' : '#dc3545'};
`;

const Status = styled.span<{ status: string }>`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  background: ${props => 
    props.status === 'Settled' ? '#d4edda' : 
    props.status === 'Active' ? '#fff3cd' : '#f8d7da'
  };
  color: ${props => 
    props.status === 'Settled' ? '#155724' : 
    props.status === 'Active' ? '#856404' : '#721c24'
  };
`;

const LoadingText = styled.div`
  text-align: center;
  color: #666;
  padding: 2rem;
`;

const ErrorText = styled.div`
  text-align: center;
  color: #dc3545;
  padding: 2rem;
`;

export const SimpleTradeHistory: React.FC = () => {
  const { isConnected } = useCanister();
  const { user } = useUnifiedAuth();
  const [trades, setTrades] = useState<SimpleTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTradeHistory = useCallback(async () => {
    if (!isConnected || !user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      
      // ✅ SIMPLE: Extract principal from user
      const userPrincipal = typeof user === 'string'
        ? Principal.fromText(user)
        : user?.principal || Principal.anonymous();

      console.log('📊 SimpleTradeHistory: Fetching trades for user:', userPrincipal.toString());
      
      // ✅ SIMPLE: Get all positions from atticus core canister
      const allPositions = await atticusService.getAllPositions();
      console.log('📊 SimpleTradeHistory: Total positions:', allPositions.length);
      
      if (allPositions && allPositions.length > 0) {
        // ✅ SIMPLE: Filter for this user only
        const userPositions = allPositions.filter((pos: any) => {
          return pos.user?.toString() === userPrincipal.toString();
        });
        
        console.log('📊 SimpleTradeHistory: User positions:', userPositions.length);
        
        // ✅ SIMPLE: Map to simple format and sort by most recent
        const mappedTrades = userPositions
          .map((pos: any) => {
            console.log('🔍 Trade history debug for position', pos.id, ':', {
              settlementPrice: pos.settlementPrice,
              entryPrice: pos.entryPrice,
              strikePrice: pos.strikePrice,
              status: pos.status
            });
            
            return {
              id: pos.id?.toString() || 'N/A',
              type: pos.optionType || 'call',
              strike: pos.strikePrice || 0,
              entryPrice: pos.entryPrice || 0,
              expiry: pos.expiry || 'N/A',
              size: pos.size || 1,
              entryPremium: pos.entryPremium || 0,
              pnl: pos.pnl || 0,
              openedAt: Number(pos.openedAt) / 1000000 || 0,
              settledAt: pos.settledAt ? Number(pos.settledAt) / 1000000 : null,
              settlementPrice: pos.settlementPrice || undefined,
              status: pos.status || 'Unknown'
            };
          })
          .sort((a: SimpleTrade, b: SimpleTrade) => b.openedAt - a.openedAt); // Most recent first
        
        setTrades(mappedTrades);
        console.log('✅ SimpleTradeHistory: Loaded', mappedTrades.length, 'trades');
      } else {
        setTrades([]);
        console.log('📊 SimpleTradeHistory: No positions found');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('❌ SimpleTradeHistory: Failed to fetch trades:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch trade history');
      setTrades([]);
      setLoading(false);
    }
  }, [isConnected, user]);

  useEffect(() => {
    fetchTradeHistory();
  }, [isConnected, user]); // ✅ FIXED: Use actual dependencies instead of function reference

  // ✅ AUTO-REFRESH: Add 30-second polling for trade history updates
  useEffect(() => {
    if (!user || !isConnected) return;
    
    console.log('🔄 Starting auto-refresh for trade history...');
    const interval = setInterval(() => {
      fetchTradeHistory().catch(error => {
        console.warn('⚠️ Auto-refresh trade history failed:', error);
      });
    }, 30000); // Every 30 seconds
    
    return () => {
      console.log('🔄 Stopping auto-refresh for trade history...');
      clearInterval(interval);
    };
  }, [user, isConnected, fetchTradeHistory]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  if (loading && trades.length === 0) {
    return (
      <Container>
        <HeaderContainer>
          <Title>Trade History</Title>
          <RefreshButton disabled>
            <LoadingSpinner />
            Loading...
          </RefreshButton>
        </HeaderContainer>
        <LoadingText>Loading trades...</LoadingText>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <HeaderContainer>
          <Title>Trade History</Title>
          <RefreshButton onClick={fetchTradeHistory}>
            🔄 Refresh
          </RefreshButton>
        </HeaderContainer>
        <ErrorText>Error: {error}</ErrorText>
      </Container>
    );
  }

  if (trades.length === 0) {
    return (
      <Container>
        <HeaderContainer>
          <Title>Trade History</Title>
          <RefreshButton onClick={fetchTradeHistory}>
            🔄 Refresh
          </RefreshButton>
        </HeaderContainer>
        <LoadingText>No trades found</LoadingText>
      </Container>
    );
  }

  return (
    <Container>
      <HeaderContainer>
        <Title>Trade History ({trades.length} trades)</Title>
        <RefreshButton onClick={fetchTradeHistory} disabled={loading}>
          {loading ? <LoadingSpinner /> : '🔄'}
          {loading ? 'Refreshing...' : 'Refresh'}
        </RefreshButton>
      </HeaderContainer>
      {trades.map((trade) => (
        <TradeItem key={trade.id}>
          <TradeInfo>
            <TradeType type={trade.type}>
              {trade.type.toUpperCase()} ${trade.strike.toFixed(2)}
            </TradeType>
            <TradeDetails>
              Settlement: {trade.entryPrice > 0 ? formatPrice(trade.entryPrice) : 'Pending'} | 
              Size: {trade.size} | 
              Expiry: {trade.expiry} | 
              Opened: {formatDate(trade.openedAt)}
            </TradeDetails>
            {trade.settlementPrice && (
              <TradeDetails>
                Settled at: {formatPrice(trade.settlementPrice)}
              </TradeDetails>
            )}
          </TradeInfo>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            <PnL positive={trade.pnl > 0}>
              {trade.pnl > 0 ? '+' : ''}{formatPrice(trade.pnl)}
            </PnL>
            <Status status={trade.status}>
              {trade.status}
            </Status>
          </div>
        </TradeItem>
      ))}
    </Container>
  );
};
