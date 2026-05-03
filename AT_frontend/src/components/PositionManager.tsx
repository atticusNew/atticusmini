import React, { useState } from 'react';
import styled from 'styled-components';
import { useCanister } from '../contexts/CanisterProvider';
import { Position } from '../types/trading.types';
import { Principal } from '@dfinity/principal';
// import { useAuth } from '../hooks/useAuth'; // ✅ REMOVED: Using useUnifiedAuth
import { useUnifiedAuth } from '../hooks/useUnifiedAuth';

// ... keep all your existing styled components ...

const PositionContainer = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const LiveBadge = styled.span`
  background: rgba(0, 212, 170, 0.1);
  color: var(--green);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
`;

const PositionCard = styled.div`
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: all 0.2s ease;
  &:hover {
    border-color: var(--accent);
    box-shadow: 0 4px 12px var(--shadow);
  }
`;

const PositionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const OptionType = styled.span<{ type: 'call' | 'put' }>`
  padding: 0.25rem 0.75rem;
  background: ${props => props.type === 'call' ? 'var(--green)' : 'var(--red)'};
  color: var(--bg-primary);
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
`;

const StrikePrice = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
`;

const PositionDetails = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  
  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1rem;
  }
`;

const DetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const DetailLabel = styled.span`
  font-size: 0.75rem;
  color: var(--text-dim);
`;

const DetailValue = styled.span<{ positive?: boolean }>`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props =>
    props.positive === undefined ? 'var(--text)' :
    props.positive ? 'var(--green)' : 'var(--red)'
  };
`;

const PnLDisplay = styled.div<{ positive: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: ${props => props.positive ? 'var(--green)' : 'var(--red)'};
  grid-column: span 2;
  padding: 0.5rem;
  background: ${props => props.positive ? 'rgba(0, 212, 170, 0.1)' : 'rgba(255, 71, 87, 0.1)'};
  border-radius: 4px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: var(--text-dim);
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top: 2px solid var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  padding: 1rem;
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid var(--red);
  border-radius: 4px;
  color: var(--red);
  font-size: 0.875rem;
`;

const RefreshButton = styled.button`
  padding: 0.5rem 1rem;
  background: var(--accent);
  color: var(--bg-primary);
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    background: var(--green);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// ✅ FIXED: Type definition matching actual main.mo backend structure
interface BackendPosition {
  id: number;
  user: any; // Principal object from backend
  option_type: { Call: null } | { Put: null };
  strike_price: number;
  entry_price: number;
  expiry: string;
  expiry_timestamp: number;
  size: number;
  entry_premium: number;
  current_value: number;
  pnl: number;
  status: { 'Active': null } | { 'Settled': null } | { 'Expired': null };
  opened_at: bigint;
  settled_at?: bigint;
  settlement_price?: number[]; // ✅ FIXED: Motoko optional Float format ([] or [value])
}

interface TradeHistoryProps {
  refreshTrigger?: number; // ✅ ADDED: Trigger to refresh trade history
}

export const TradeHistory: React.FC<TradeHistoryProps> = ({ refreshTrigger }) => {
  const { getUserPositions, isConnected, atticusService } = useCanister();
  const { user } = useUnifiedAuth();
  const [tradeHistory, setTradeHistory] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = React.useCallback(async () => {
    if (!isConnected || !user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      
      // ✅ FIXED: Extract principal from user object
      const userPrincipal = typeof user === 'string'
        ? Principal.fromText(user)
        : user?.principal || Principal.anonymous();

      console.log('📊 Fetching trade history for user:', userPrincipal.toString());
      console.log('📊 Current timestamp:', new Date().toISOString());
      
      // ✅ TEST: Try alternative atticusService method if available
      try {
        console.log('📊 Testing alternative atticusService method: get_active_positions');
        const activePositions = await atticusService.getUserPositions(userPrincipal.toString());
        console.log('📊 Active positions result:', activePositions);
        console.log('📊 Active positions count:', activePositions.length);
        
        // ✅ LOGGING: Check status of active positions
        if (activePositions.length > 0) {
          console.log('📊 Active positions status analysis:', activePositions.map((p: any) => ({
            id: p.id,
            status: p.status,
            statusKeys: Object.keys(p.status || {}),
            statusString: JSON.stringify(p.status),
            settledAt: p.settled_at
          })));
        } else {
          console.log('📊 No active positions found - all positions should be settled');
        }
      } catch (altErr) {
        console.log('📊 Alternative method not available or failed:', altErr);
      }
      
      // ✅ DIRECT: Call get_trade_history only - no fallback
      console.log('📊 Fetching trade history using get_trade_history function - CACHE BUST V2');
      console.log('📊 AtticusService object keys:', Object.keys(atticusService));
      console.log('📊 AtticusService has getAllPositions:', 'getAllPositions' in atticusService);
      console.log('📊 AtticusService getAllPositions type:', typeof atticusService.getAllPositions);
      console.log('📊 AtticusService object type:', typeof atticusService);
      console.log('📊 AtticusService object constructor:', atticusService?.constructor?.name);
      console.log('📊 AtticusService object prototype:', Object.getPrototypeOf(atticusService));
      
      // ✅ DIRECT CALL: Try calling the function directly
      console.log('📊 Trying direct function call...');
      
      // Check if getAllPositions is available
      if (typeof atticusService.getAllPositions === 'function') {
        console.log('📊 getAllPositions function found!');
        const allPositions = await atticusService.getAllPositions();
        console.log('📊 All positions from getAllPositions:', allPositions);
        console.log('📊 All positions count:', allPositions.length);
        
        // Process the positions
        if (allPositions && allPositions.length > 0) {
          console.log('📊 First position fields:', Object.keys(allPositions[0]));
          console.log('📊 First position settlement_price field:', allPositions[0].settlement_price);
          console.log('📊 First position has settlement_price?', 'settlement_price' in allPositions[0]);
        }
        
        // Continue with the rest of the processing...
        const normalizedPositions: Position[] = allPositions.map((position: BackendPosition) => {
        // ✅ FIXED: Extract option_type from variant format
        const optionType = 'Call' in position.option_type ? 'call' : 'put';

        // ✅ FIXED: settlement_price is ?Float (optional Float) - handle opt wrapper from Candid
        let settlementPrice = null;
        if (position.settlement_price && Array.isArray(position.settlement_price) && position.settlement_price.length > 0) {
          // Candid opt format: [value] (array format)
          settlementPrice = position.settlement_price[0];
          console.log('📊 Using actual settlement price from array:', settlementPrice);
        } else if (position.settlement_price && typeof position.settlement_price === 'object' && 'Some' in position.settlement_price) {
          // Candid opt format: { Some: value }
          settlementPrice = position.settlement_price.Some;
          console.log('📊 Using actual settlement price from opt:', settlementPrice);
        } else if (position.settlement_price !== null && position.settlement_price !== undefined && typeof position.settlement_price === 'number') {
          // Direct value format (fallback)
          settlementPrice = position.settlement_price;
          console.log('📊 Using direct settlement price:', settlementPrice);
        } else {
          console.log('📊 Settlement price not available, will show Pending');
        }

        // ✅ DEBUGGING: Log settlement price parsing
        console.log('📊 Settlement price parsing for position', position.id, ':', {
          rawSettlementPrice: position.settlement_price,
          settlementPriceType: typeof position.settlement_price,
          settlementPriceLength: position.settlement_price?.length,
          settlementPriceArray: position.settlement_price,
          settlementPriceKeys: position.settlement_price ? Object.keys(position.settlement_price) : 'no keys',
          settlementPriceStringified: JSON.stringify(position.settlement_price),
          parsedSettlementPrice: settlementPrice
        });

        const mappedPosition: Position = {
          id: position.id.toString(),
          user: position.user.toString(),
          type: optionType,
          strike: position.strike_price,
          expiry: position.expiry,
          size: position.size,
          entryPremium: position.entry_premium,
          currentValue: position.current_value,
          pnl: position.pnl,
          // ✅ FIXED: Convert nanoseconds to milliseconds (handle BigInt)
          openedAt: Number(position.opened_at) / 1000000,
        };

        // ✅ FIXED: Add optional properties only if they exist
        if (position.entry_price !== undefined) {
          (mappedPosition as any).entryPrice = position.entry_price;
        }
        
        if (position.settled_at !== undefined) {
          (mappedPosition as any).settledAt = Number(position.settled_at) / 1000000;
        }
        
        // ✅ DEBUG: Log settlement price data
        console.log('📊 Settlement price debug for position', position.id, ':', {
          rawSettlementPrice: position.settlement_price,
          entryPrice: position.entry_price,
          type: typeof position.settlement_price,
          isArray: Array.isArray(position.settlement_price),
          isOptional: position.settlement_price !== null && position.settlement_price !== undefined,
          willUseFallback: position.settlement_price === null || position.settlement_price === undefined
        });
        
        (mappedPosition as any).settlementPrice = settlementPrice;

        return mappedPosition;
      });

      // ✅ FIXED: Sort by opened_at descending (most recent first)
      const sortedPositions = normalizedPositions.sort((a, b) => b.openedAt - a.openedAt);
      
      console.log('📊 Normalized positions:', normalizedPositions);
      console.log('📊 Sorted positions:', sortedPositions);
      
      setTradeHistory(sortedPositions);
      console.log('✅ Loaded', sortedPositions.length, 'trade history entries (most recent first)');
      
      } else {
        // Fallback to get_all_positions if get_trade_history is not available
        console.log('📊 get_trade_history not available, falling back to get_all_positions');
        
        // ✅ DEBUG: Check ALL positions before user filtering
        const allPositionsRaw = await atticusService.getAllPositions();
        console.log('📊 ALL positions (before user filtering):', allPositionsRaw.length);
        console.log('📊 ALL position IDs (before filtering):', allPositionsRaw.map((p: any) => p.id));
        console.log('📊 ALL position users (before filtering):', allPositionsRaw.map((p: any) => p.user.toString()));
        
        // ✅ AUTO-SETTLEMENT: Check for expired positions and settle them
        const currentTime = Date.now();
        console.log('🔄 Auto-settlement check for user:', userPrincipal.toString());
        console.log('🔄 Current time:', new Date(currentTime));
        
        for (const position of allPositionsRaw) {
          console.log('🔄 Checking position:', position.id, 'user:', position.user.toString(), 'status:', position.status);
          
          if (position.user.toString() === userPrincipal.toString() && position.status.Active !== undefined) {
            const openedAt = Number(position.opened_at) / 1000000; // Convert nanoseconds to milliseconds
            const expirySeconds = parseInt(position.expiry.replace('s', ''));
            const expiryTime = openedAt + (expirySeconds * 1000);
            
            console.log('🔄 Position details:', {
              id: position.id,
              openedAt: new Date(openedAt),
              expirySeconds,
              expiryTime: new Date(expiryTime),
              isExpired: currentTime > expiryTime
            });
            
            // If position is expired, settle it immediately
            if (currentTime > expiryTime) {
              console.log('🔄 Auto-settling expired position:', position.id, 'expired at:', new Date(expiryTime));
              try {
                // ✅ FIXED: Use off-chain settlement instead of old settleTrade
                const { pricingEngine } = await import('../services/OffChainPricingEngine');
                
                // Get current price from off-chain pricing engine
                const currentPrice = pricingEngine.getCurrentPrice();
                if (currentPrice === 0) {
                  console.warn('⚠️ Price feed not available for settlement');
                  return;
                }
                
                // Calculate settlement off-chain
                const strikeOffset = position.strike_offset || 0;
                const expiry = position.expiry || '5s';
                const optionType = position.option_type?.Call !== undefined ? 'call' : 'put';
                const entryPrice = position.entry_price || currentPrice;
                
                const settlementResult = pricingEngine.calculateSettlement(
                  optionType,
                  strikeOffset,
                  expiry,
                  currentPrice,
                  entryPrice,
                  position.size || 1 // ✅ FIXED: Pass contract count (size)
                );
                
                // Record settlement to backend
                await pricingEngine.recordSettlement(
                  Number(position.id),
                  settlementResult,
                  atticusService,
                  position.user?.toString() // Pass user principal
                );
                
                console.log('✅ Off-chain auto-settlement result:', settlementResult);
              } catch (error) {
                console.error('❌ Off-chain auto-settlement failed:', error);
              }
            }
          }
        }
        
        // ✅ DIRECT: Use getUserPositions function directly
        console.log('📊 Calling getUserPositions directly...');
        const allPositions = await getUserPositions(userPrincipal);
        console.log('📊 getUserPositions returned:', allPositions.length, 'positions');
        console.log('📊 All position IDs:', allPositions.map(p => p.id));
        console.log('📊 All position users:', allPositions.map(p => p.user.toString()));
        console.log('📊 Current user principal:', userPrincipal.toString());
        console.log('📊 Current user object:', user);
        console.log('📊 User principal from user object:', user?.principal?.toString());
        
        // ✅ DEBUG: Check what status values we actually have
        console.log('📊 All position statuses:', allPositions.length > 0 ? allPositions.map(p => ({ id: p.id, status: p.status })) : 'No positions found');
        
        // ✅ SAFETY CHECK: Only log detailed info if we have positions
        if (allPositions.length > 0) {
          console.log('📊 First position full structure:', allPositions[0]);
          console.log('📊 All position keys:', allPositions.map(p => Object.keys(p)));
          console.log('📊 First position detailed:', allPositions[0]);
          console.log('📊 First position field by field:');
          console.log('  id:', allPositions[0].id);
          console.log('  pnl:', allPositions[0].pnl);
          console.log('  status:', allPositions[0].status);
          console.log('  option_type:', allPositions[0].option_type);
          console.log('  strike_price:', allPositions[0].strike_price);
          console.log('  opened_at:', allPositions[0].opened_at);
          console.log('  size:', allPositions[0].size);
          console.log('  user:', allPositions[0].user);
          console.log('  expiry_timestamp:', allPositions[0].expiry_timestamp);
          console.log('  expiry:', allPositions[0].expiry);
          console.log('  current_value:', allPositions[0].current_value);
          console.log('  entry_premium:', allPositions[0].entry_premium);
          console.log('  entry_price:', allPositions[0].entry_price);
          console.log('  settled_at:', allPositions[0].settled_at);
        } else {
          console.log('📊 No positions found for current user after auto-settlement');
        }
        
        // ✅ FIXED: Filter for settled positions using variant type
        const settledPositions = allPositions.filter(p => 'Settled' in p.status);
        console.log('📊 Settled positions count:', settledPositions.length);
        
        // ✅ DEBUG: Check all position statuses after settlement
        console.log('📊 All position statuses after settlement:', allPositions.length > 0 ? allPositions.map(p => ({
          id: p.id,
          status: p.status,
          hasSettledAt: p.settled_at && p.settled_at.length > 0
        })) : 'No positions to check');
        
        // ✅ FALLBACK: If no settled positions, show all positions for now
        if (settledPositions.length === 0) {
          console.log('📊 No settled positions found, showing all positions as trade history');
          
          // ✅ FILTER: Remove old active positions that should have been settled
          const currentTime = Date.now();
          const filteredPositions = allPositions.filter((backendPos: any) => {
            const openedAt = Number(backendPos.opened_at) / 1000000; // Convert to milliseconds
            const expirySeconds = parseInt(backendPos.expiry || '0');
            const expiryTime = openedAt + (expirySeconds * 1000);
            
            // If position is expired (more than 1 minute past expiry), don't show it
            const isExpired = currentTime > expiryTime; // Settle immediately when expired
            if (isExpired) {
              console.log('📊 Filtering out expired position:', backendPos.id, 'expired at:', new Date(expiryTime));
              return false;
            }
            return true;
          });
          
          console.log('📊 Filtered positions count:', filteredPositions.length, 'out of', allPositions.length);
          
          // ✅ MAP: Convert backend fields to frontend interface
          const mappedPositions = filteredPositions.map((backendPos: any) => ({
            id: backendPos.id?.toString() || 'N/A',
            user: backendPos.user?.toString() || 'N/A',
            type: backendPos.option_type ? ('Call' in backendPos.option_type ? 'call' : 'put') : 'call',
            strike: backendPos.strike_price || 0,
            expiry: backendPos.expiry || 'N/A',
            size: backendPos.size || 1, // Default to 1 contract if size is 0
            entryPremium: backendPos.entry_premium || 0,
            currentValue: backendPos.current_value || 0,
            pnl: backendPos.pnl || 0,
            openedAt: Number(backendPos.opened_at) / 1000000 || 0, // Convert nanoseconds to milliseconds
            settledAt: backendPos.settled_at ? Number(backendPos.settled_at) : null,
            entryPrice: backendPos.entry_price || 0,
            settlementPrice: undefined // Will be filled later if available
          }));
          
          setTradeHistory(mappedPositions as unknown as Position[]);
          console.log('✅ Loaded', mappedPositions.length, 'all positions as trade history');
          return;
        }
        
        // ✅ MAP: Convert backend fields to frontend interface for settled positions
        const mappedSettledPositions = settledPositions.map((backendPos: any) => ({
          id: backendPos.id?.toString() || 'N/A',
          user: backendPos.user?.toString() || 'N/A',
            type: backendPos.option_type ? ('Call' in backendPos.option_type ? 'call' : 'put') : 'call',
          strike: backendPos.strike_price || 0,
          expiry: backendPos.expiry || 'N/A',
          size: backendPos.size || 1, // Default to 1 contract if size is 0
          entryPremium: backendPos.entry_premium || 0,
          currentValue: backendPos.current_value || 0,
          pnl: backendPos.pnl || 0,
          openedAt: Number(backendPos.opened_at) / 1000000 || 0, // Convert nanoseconds to milliseconds
          settledAt: backendPos.settled_at ? Number(backendPos.settled_at) : null,
          entryPrice: backendPos.entry_price || 0,
          settlementPrice: undefined // Will be filled later if available
        }));
        
        setTradeHistory(mappedSettledPositions as unknown as Position[]);
        console.log('✅ Loaded', mappedSettledPositions.length, 'settled positions as trade history');
      }
      
    } catch (err) {
      console.error('❌ Failed to fetch positions:', err);
      setError('Failed to load positions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [getUserPositions, isConnected, user]);

  // ✅ FIXED: Remove fetchPositions from dependencies to prevent infinite re-render
  // fetchPositions is recreated when user changes, causing the useEffect to run infinitely
  // Instead, directly depend on the actual state that matters
  React.useEffect(() => {
    fetchPositions();
  }, [isConnected, user]); // ✅ FIXED: Use actual dependencies instead of function reference

  // ✅ ADDED: Refresh trade history when trigger changes
  React.useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      console.log('🔄 Refreshing trade history due to trigger:', refreshTrigger);
      // Call fetchPositions directly to avoid dependency issues
      const refreshData = async () => {
        if (!isConnected || !user) {
          setLoading(false);
          return;
        }

        try {
          setError(null);
          setLoading(true);
          
          const userPrincipal = typeof user === 'string'
            ? Principal.fromText(user)
            : user || Principal.anonymous();

          console.log('📊 Refreshing trade history for user:', user.toString());
          
          const allPositions = await atticusService.getAllPositions();
          console.log('📊 Refreshed positions from atticusService:', allPositions);
          
          const userPositions = allPositions.filter((position: BackendPosition) => {
            const userMatch = position.user.toString() === userPrincipal.toString();
            const statusMatch = 'Settled' in position.status || 'Expired' in position.status;
            return userMatch && statusMatch;
          });
          
          const normalizedPositions: Position[] = userPositions.map((position: BackendPosition) => {
            const optionType = 'Call' in position.option_type ? 'call' : 'put';
            return {
              id: position.id.toString(),
              user: position.user.toString(),
              type: optionType,
              strike: position.strike_price,
              expiry: position.expiry,
              size: position.size,
              entryPremium: position.entry_premium,
              currentValue: position.current_value,
              pnl: position.pnl,
              openedAt: Number(position.opened_at) / 1000000,
              entryPrice: position.entry_price,
              settledAt: position.settled_at ? Number(position.settled_at) / 1000000 : undefined,
              settlementPrice: position.settlement_price && position.settlement_price.length > 0 ? position.settlement_price[0] : undefined
            };
          });

          const sortedPositions = normalizedPositions.sort((a, b) => b.openedAt - a.openedAt);
          setTradeHistory(sortedPositions);
          console.log('✅ Refreshed', sortedPositions.length, 'trade history entries');
          
        } catch (err) {
          console.error('❌ Failed to refresh positions:', err);
          setError('Failed to refresh positions. Please try again.');
        } finally {
          setLoading(false);
        }
      };
      
      refreshData();
    }
  }, [refreshTrigger, isConnected, user, atticusService]);

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const formatCurrency = (value: number): string => `$${value.toFixed(4)}`;
  
  // ✅ FIXED: Display contract count directly (size now stores contract count)
  const formatContractsFromSize = (size: number): string => {
    // Size now directly stores the contract count (1, 2, 3, etc.)
    const contractCount = Math.round(size);
    return `${contractCount} contract${contractCount !== 1 ? 's' : ''}`;
  };
  
  // Settlement price calculation removed - now using actual settlement price from backend

  if (loading) {
    return (
      <PositionContainer>
        <SectionTitle>📊 Trade History</SectionTitle>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <LoadingSpinner /> Loading trade history...
        </div>
      </PositionContainer>
    );
  }

  if (error) {
    return (
      <PositionContainer>
        <SectionTitle>📊 Trade History</SectionTitle>
        <ErrorMessage>{error}</ErrorMessage>
        <RefreshButton onClick={fetchPositions}>🔄 Retry</RefreshButton>
      </PositionContainer>
    );
  }

  if (tradeHistory.length === 0) {
    return (
      <PositionContainer>
        <SectionTitle>
          📊 Trade History
          <LiveBadge>COMPLETED</LiveBadge>
        </SectionTitle>
        <EmptyState>
          <div>No trade history</div>
          <p>Complete some trades to see your history here</p>
        </EmptyState>
        <RefreshButton onClick={fetchPositions}>🔄 Refresh</RefreshButton>
      </PositionContainer>
    );
  }

  return (
    <PositionContainer>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SectionTitle>
          📊 Trade History ({tradeHistory.length})
          <LiveBadge>COMPLETED</LiveBadge>
        </SectionTitle>
        <RefreshButton onClick={fetchPositions} disabled={loading}>
          {loading ? <LoadingSpinner /> : '🔄 Refresh'}
        </RefreshButton>
      </div>

      {tradeHistory.map((position) => (
        <PositionCard key={position.id}>
          <PositionHeader>
            <OptionType type={position.type || 'unknown'}>
              {(position.type || 'unknown').toUpperCase()}
            </OptionType>
            <StrikePrice>${(position.strike || 0).toLocaleString()}</StrikePrice>
          </PositionHeader>

          <PositionDetails>
            <DetailItem>
              <DetailLabel>Trade ID</DetailLabel>
              <DetailValue>#{position.id || 'N/A'}</DetailValue>
            </DetailItem>

            <DetailItem>
              <DetailLabel>Start Time</DetailLabel>
              <DetailValue>{formatTimestamp(position.openedAt || 0)}</DetailValue>
            </DetailItem>

            <DetailItem>
              <DetailLabel>End Time</DetailLabel>
              <DetailValue>
                {(() => {
                  if (position.settledAt) {
                    return formatTimestamp(position.settledAt);
                  } else {
                    // For active positions, show expiry time
                    const expiryTime = (position.openedAt || 0) + (parseInt(position.expiry || '0') * 1000);
                    return formatTimestamp(expiryTime);
                  }
                })()}
              </DetailValue>
            </DetailItem>


            <DetailItem>
              <DetailLabel>Contracts</DetailLabel>
              <DetailValue>{formatContractsFromSize(position.size || 0)}</DetailValue>
            </DetailItem>

            <DetailItem>
              <DetailLabel>Strike Range</DetailLabel>
              <DetailValue>
                {(() => {
                  // ✅ FIXED: Calculate original strike range amount from strike price and entry price
                  if (position.entryPrice && position.entryPrice > 0) {
                    const strikeRange = Math.abs(position.strike - position.entryPrice);
                    // Round to nearest 0.25 to match the delta options (2.50, 5.00, 10.00, 15.00)
                    const roundedStrikeRange = Math.round(strikeRange * 4) / 4;
                    
                    // ✅ VALIDATION: Check if it's a valid strike range
                    const validStrikeRanges = [2.50, 5.00, 10.00, 15.00];
                    const isValidStrikeRange = validStrikeRanges.includes(roundedStrikeRange);

                    if (isValidStrikeRange) {
                      return `$${roundedStrikeRange.toFixed(2)}`;
                    } else {
                      // ✅ IMPROVED: For legacy data, show the actual difference
                      return <span style={{color: '#ffa500', fontWeight: 'bold'}}>${strikeRange.toFixed(2)}</span>;
                    }
                  }
                  // ✅ FALLBACK: Show strike price if no entry price available
                  return `$${(position.strike || 0).toLocaleString()}`;
                })()}
              </DetailValue>
            </DetailItem>

            <DetailItem>
              <DetailLabel>Expiry</DetailLabel>
              <DetailValue>{position.expiry || 'N/A'}</DetailValue>
            </DetailItem>


            <DetailItem>
              <DetailLabel>Settlement Price</DetailLabel>
              <DetailValue>
                {(() => {
                  // ✅ FIXED: Check for settlement price in backend data
                  if (position.settledAt && Array.isArray(position.settledAt) && position.settledAt.length > 0) {
                    // Position is settled, but we need to get the actual settlement price
                    // For now, show "Settled" until we can get the actual price
                    return <span style={{color: '#00ff00', fontWeight: 'bold'}}>Settled</span>;
                  } else {
                    // ✅ IMPROVED: Show "Pending" for positions without settlement price
                    return <span style={{color: '#ffa500', fontWeight: 'bold'}}>Pending</span>;
                  }
                })()}
              </DetailValue>
            </DetailItem>

            <PnLDisplay positive={position.pnl > 0}>
              {position.pnl > 0 ? '📈' : '📉'}
              {position.pnl > 0 ? '+' : ''}{formatCurrency(position.pnl)}
              {(() => {
                // ✅ FIXED: Calculate percentage based on contract cost (size now stores contract count)
                const contractCount = Math.round(position.size);
                const contractCost = contractCount * 1; // $1 per contract
                if (contractCost > 0) {
                  return (
                    <span style={{ fontSize: '0.85em', opacity: 0.8 }}>
                      ({((position.pnl / contractCost) * 100).toFixed(1)}%)
                    </span>
                  );
                }
                return null;
              })()}
            </PnLDisplay>
          </PositionDetails>
        </PositionCard>
      ))}
    </PositionContainer>
  );
};

