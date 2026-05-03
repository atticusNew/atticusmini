/**
 * ✅ IMPROVED ADMIN PANEL
 * Enhanced admin console with detailed analytics
 * - Users tab: Per-user trade summaries
 * - Trades tab: Platform summary + individual bet details
 * - Platform tab: Clear liquidity vs ledger separation
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useCanister } from '../contexts/CanisterProvider';
import { 
  adminAnalyticsService, 
  BetDetail, 
  UserTradeSummary, 
  PlatformSummary 
} from '../services/AdminAnalyticsService';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const AdminContainer = styled.div`
  padding: 2rem;
  max-width: 1600px;
  margin: 0 auto;
  background: var(--bg-primary);
  color: var(--text);
`;

const Title = styled.h1`
  color: var(--text);
  margin-bottom: 2rem;
  text-align: center;
`;

const TabContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--border);
`;

const Tab = styled.button<{ $active: boolean }>`
  background: ${props => props.$active ? 'var(--accent)' : 'transparent'};
  color: ${props => props.$active ? 'var(--bg-primary)' : 'var(--text)'};
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$active ? 'var(--accent)' : 'var(--bg-button)'};
  }
`;

const ContentSection = styled.div`
  min-height: 400px;
`;

const ActionBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  align-items: center;
  flex-wrap: wrap;
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

const DateInput = styled.input`
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.5rem;
  color: var(--text);
  font-size: 0.9rem;
`;

const SearchInput = styled.input`
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.5rem 1rem;
  color: var(--text);
  min-width: 300px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: var(--bg-panel);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 2rem;
`;

const TableHeader = styled.th`
  background: var(--accent);
  color: var(--bg-primary);
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.9rem;
`;

const TableCell = styled.td<{ $positive?: boolean; $negative?: boolean }>`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  color: ${props => 
    props.$positive ? 'var(--green)' : 
    props.$negative ? 'var(--red)' : 
    'var(--text)'
  };
  font-size: 0.85rem;
`;

const TableRow = styled.tr`
  &:hover {
    background: var(--bg-button);
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const MetricCard = styled.div`
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
`;

const MetricLabel = styled.div`
  font-size: 0.85rem;
  color: var(--text-dim);
  margin-bottom: 0.5rem;
`;

const MetricValue = styled.div<{ $positive?: boolean; $negative?: boolean }>`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => 
    props.$positive ? 'var(--green)' : 
    props.$negative ? 'var(--red)' : 
    'var(--text)'
  };
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

const SectionTitle = styled.h2`
  color: var(--text);
  margin: 2rem 0 1rem 0;
  font-size: 1.3rem;
`;

const BreakdownGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const BreakdownItem = styled.div`
  background: var(--bg-button);
  padding: 0.5rem;
  border-radius: 4px;
  text-align: center;
`;

const BreakdownLabel = styled.div`
  font-size: 0.75rem;
  color: var(--text-dim);
`;

const BreakdownValue = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
`;

const PaginationButton = styled.button`
  background: var(--bg-panel);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover:not(:disabled) {
    background: var(--bg-button);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// ============================================================================
// COMPONENT
// ============================================================================

export const ImprovedAdminPanel: React.FC<{ onLogout?: () => Promise<void> }> = ({ onLogout }) => {
  const { isConnected, atticusService } = useCanister();
  const [activeTab, setActiveTab] = useState<'users' | 'trades' | 'platform'>('users');
  
  // Data state
  const [allPositions, setAllPositions] = useState<any[]>([]);
  const [userSummaries, setUserSummaries] = useState<UserTradeSummary[]>([]);
  const [platformSummary, setPlatformSummary] = useState<PlatformSummary | null>(null);
  const [betDetails, setBetDetails] = useState<BetDetail[]>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tradesSearchTerm, setTradesSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Credit user state
  const [creditPrincipal, setCreditPrincipal] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditLoading, setCreditLoading] = useState(false);
  const [creditError, setCreditError] = useState<string | null>(null);
  const [creditSuccess, setCreditSuccess] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  // Platform metrics state
  const [platformWallet, setPlatformWallet] = useState<any>(null);
  const [platformLedger, setPlatformLedger] = useState<any>(null);
  const [blockchainBalance, setBlockchainBalance] = useState<number | null>(null);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchAllData = async () => {
    if (!atticusService) {
      setError('Atticus service not available');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔄 Fetching all positions from canister...');
      const positions = await atticusService.getAllPositions();
      console.log('✅ Fetched positions:', positions.length);
      
      setAllPositions(positions);

      // Process data off-chain
      const userSums = adminAnalyticsService.calculateUserSummaries(positions);
      setUserSummaries(userSums);

      const startTimestamp = startDate ? new Date(startDate).getTime() : undefined;
      const endTimestamp = endDate ? new Date(endDate).getTime() : undefined;
      const platformSum = adminAnalyticsService.calculatePlatformSummary(
        positions, 
        startTimestamp, 
        endTimestamp
      );
      setPlatformSummary(platformSum);

      const bets = adminAnalyticsService.mapToBetDetails(positions);
      setBetDetails(bets);

      console.log('✅ Data processing complete');
    } catch (err) {
      console.error('❌ Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlatformMetrics = async () => {
    if (!atticusService) return;

    try {
      const [wallet, ledger] = await Promise.all([
        atticusService.getPlatformWallet(),
        atticusService.getPlatformLedger()
      ]);

      setPlatformWallet(wallet);
      setPlatformLedger(ledger);

      // Fetch blockchain balance
      await fetchBlockchainBalance();
    } catch (err) {
      console.error('❌ Error fetching platform metrics:', err);
    }
  };

  const fetchBlockchainBalance = async () => {
    const platformAddress = 'bc1q9t8fk860xk7hgwggjf8hqdnz0zwtakne6cv5h0n85s0jhzkvxc4qmx3fn0';
    
    try {
      const corsProxy = 'https://api.allorigins.win/raw?url=';
      const apiUrls = [
        `${corsProxy}${encodeURIComponent(`https://blockstream.info/api/address/${platformAddress}`)}`,
        `https://blockstream.info/api/address/${platformAddress}`,
      ];

      for (const url of apiUrls) {
        try {
          const response = await fetch(url, { 
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          });
          
          if (!response.ok) continue;
          
          const data = await response.json();
          
          if (data.chain_stats) {
            const balanceSatoshis = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
            const balanceBTC = balanceSatoshis / 100000000;
            setBlockchainBalance(balanceBTC);
            return;
          }
        } catch (error) {
          console.log('Trying next API...');
          continue;
        }
      }
    } catch (error) {
      console.error('Failed to fetch blockchain balance:', error);
    }
  };

  useEffect(() => {
    if (isConnected && atticusService) {
      fetchAllData();
      fetchPlatformMetrics();
    }
  }, [isConnected, atticusService, startDate, endDate]);

  // ============================================================================
  // CREDIT USER FUNCTION
  // ============================================================================

  const handleCreditUser = async () => {
    if (!creditPrincipal.trim() || !creditAmount.trim() || !atticusService) {
      setCreditError('Please enter both principal and amount');
      return;
    }

    try {
      const amount = parseFloat(creditAmount);
      if (isNaN(amount) || amount <= 0) {
        setCreditError('Please enter a valid amount greater than 0');
        return;
      }

      // Confirmation dialog
      const confirmed = window.confirm(
        `Are you sure you want to credit ${amount} BTC to user:\n\n${creditPrincipal}\n\nThis action cannot be undone.`
      );
      
      if (!confirmed) {
        return;
      }

      setCreditLoading(true);
      setCreditError(null);
      setCreditSuccess(null);

      console.log(`🔄 Crediting ${amount} BTC to user ${creditPrincipal}`);
      
      const resultMessage = await atticusService.adminCreditUserBalance(
        creditPrincipal.trim(), 
        amount
      );
      
      setCreditSuccess(`✅ ${resultMessage}`);
      console.log('✅ Credit successful');
      
      // Refresh all data to show updated balance
      await fetchAllData();
      
      // Clear form on success
      setCreditPrincipal('');
      setCreditAmount('');
      
    } catch (err) {
      console.error('❌ Credit operation failed:', err);
      setCreditError(err instanceof Error ? err.message : 'Credit operation failed');
    } finally {
      setCreditLoading(false);
    }
  };

  // ============================================================================
  // EXPORT FUNCTIONS
  // ============================================================================

  const handleExportBets = () => {
    try {
      console.log('🔄 Export bets clicked, betDetails length:', betDetails.length);
      
      if (betDetails.length === 0) {
        alert('No bet data to export! Please refresh and ensure trades exist.');
        return;
      }
      
      const csv = adminAnalyticsService.exportBetDetailsToCSV(betDetails);
      console.log('✅ CSV generated, length:', csv.length);
      
      downloadCSV(csv, 'bet_details');
    } catch (error) {
      console.error('❌ Export error:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleExportUsers = () => {
    try {
      console.log('🔄 Export users clicked, userSummaries length:', userSummaries.length);
      
      if (userSummaries.length === 0) {
        alert('No user data to export! Please refresh and ensure users exist.');
        return;
      }
      
      const csv = adminAnalyticsService.exportUserSummariesToCSV(userSummaries);
      console.log('✅ CSV generated, length:', csv.length);
      
      downloadCSV(csv, 'user_summaries');
    } catch (error) {
      console.error('❌ Export error:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleExportPlatform = () => {
    try {
      console.log('🔄 Export platform clicked, platformSummary:', !!platformSummary);
      
      if (!platformSummary) {
        alert('No platform data to export! Please refresh first.');
        return;
      }
      
      const csv = adminAnalyticsService.exportPlatformSummaryToCSV(platformSummary);
      console.log('✅ CSV generated, length:', csv.length);
      
      downloadCSV(csv, 'platform_summary');
    } catch (error) {
      console.error('❌ Export error:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    try {
      // Add BOM for UTF-8 encoding (helps Excel open properly)
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      console.log('✅ Download initiated');
      alert(`✅ ${filename} exported successfully! Check your Downloads folder.`);
    } catch (error) {
      console.error('❌ Download error:', error);
      throw new Error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderUsersTab = () => {
    const filteredUsers = searchTerm
      ? userSummaries.filter(u => u.userPrincipal.toLowerCase().includes(searchTerm.toLowerCase()))
      : userSummaries;

    return (
      <>
        <ActionBar>
          <SearchInput
            type="text"
            placeholder="Search by user principal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button onClick={fetchAllData} disabled={isLoading}>
            {isLoading ? '🔄 Loading...' : '🔄 Refresh'}
          </Button>
          <ExportButton onClick={handleExportUsers} disabled={userSummaries.length === 0}>
            📥 Export Users CSV
          </ExportButton>
        </ActionBar>

        <SectionTitle>User Trade Summaries ({filteredUsers.length} users)</SectionTitle>

        <Table>
          <thead>
            <tr>
              <TableHeader>User Principal (Click to Copy)</TableHeader>
              <TableHeader>Total Trades</TableHeader>
              <TableHeader>Calls</TableHeader>
              <TableHeader>Puts</TableHeader>
              <TableHeader>Wins</TableHeader>
              <TableHeader>Losses</TableHeader>
              <TableHeader>Win Rate</TableHeader>
              <TableHeader>Net PnL (BTC)</TableHeader>
              <TableHeader>Volume (USD)</TableHeader>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user, idx) => (
              <TableRow key={idx}>
                <TableCell 
                  title="Click to copy full principal"
                  style={{ 
                    cursor: 'pointer', 
                    fontFamily: 'monospace', 
                    fontSize: '0.75rem',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  onClick={() => {
                    navigator.clipboard.writeText(user.userPrincipal);
                    alert(`Copied: ${user.userPrincipal}`);
                  }}
                >
                  {user.userPrincipal}
                </TableCell>
                <TableCell>{user.totalTrades}</TableCell>
                <TableCell>{user.callCount}</TableCell>
                <TableCell>{user.putCount}</TableCell>
                <TableCell $positive={user.totalWins > 0}>{user.totalWins}</TableCell>
                <TableCell $negative={user.totalLosses > 0}>{user.totalLosses}</TableCell>
                <TableCell>{user.winRate.toFixed(1)}%</TableCell>
                <TableCell 
                  $positive={user.netPnl > 0}
                  $negative={user.netPnl < 0}
                >
                  {user.netPnl.toFixed(8)}
                </TableCell>
                <TableCell>${user.totalVolume.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>

        {filteredUsers.length === 0 && (
          <LoadingText>No users found</LoadingText>
        )}

        {/* Credit User Balance Section */}
        <div style={{ 
          background: 'var(--bg-panel)', 
          border: '2px solid var(--accent)', 
          borderRadius: '8px', 
          padding: '1.5rem', 
          marginTop: '2rem' 
        }}>
          <h3 style={{ color: 'var(--accent)', marginTop: 0, marginBottom: '1rem' }}>
            💰 Credit User Balance
          </h3>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <SearchInput
              type="text"
              placeholder="User Principal"
              value={creditPrincipal}
              onChange={(e) => {
                setCreditPrincipal(e.target.value);
                setCreditError(null);
                setCreditSuccess(null);
              }}
              style={{ minWidth: '400px', flex: '1' }}
            />
            <SearchInput
              type="number"
              placeholder="Amount (BTC)"
              value={creditAmount}
              onChange={(e) => {
                setCreditAmount(e.target.value);
                setCreditError(null);
                setCreditSuccess(null);
              }}
              style={{ minWidth: '180px' }}
              step="0.00000001"
              min="0"
            />
            <Button 
              onClick={handleCreditUser} 
              disabled={creditLoading || !creditPrincipal.trim() || !creditAmount.trim()}
              style={{ 
                background: 'var(--green)', 
                minWidth: '140px',
                opacity: (!creditPrincipal.trim() || !creditAmount.trim()) ? 0.5 : 1
              }}
            >
              {creditLoading ? '⏳ Processing...' : '💳 Credit User'}
            </Button>
          </div>
          
          {creditError && <ErrorText>{creditError}</ErrorText>}
          {creditSuccess && (
            <div style={{ 
              color: 'var(--green)', 
              textAlign: 'center', 
              padding: '1rem', 
              background: 'rgba(0, 212, 170, 0.1)', 
              borderRadius: '4px',
              marginBottom: '1rem',
              fontWeight: 600
            }}>
              {creditSuccess}
            </div>
          )}
          
          <div style={{ 
            fontSize: '0.85rem', 
            color: 'var(--text-dim)', 
            padding: '0.75rem',
            background: 'rgba(244, 208, 63, 0.1)',
            borderRadius: '4px',
            border: '1px solid rgba(244, 208, 63, 0.3)',
            lineHeight: '1.5'
          }}>
            <strong style={{ color: 'var(--accent)' }}>⚠️ Admin Use Only:</strong> Use this to manually credit user accounts for 
            verified deposits, corrections, or bonuses. All credits are logged on-chain and update both user balance 
            and platform wallet balance.
          </div>
        </div>
      </>
    );
  };

  const renderTradesTab = () => {
    const startTimestamp = startDate ? new Date(startDate).getTime() : undefined;
    const endTimestamp = endDate ? new Date(endDate).getTime() : undefined;
    
    let filteredBets = adminAnalyticsService.filterByDateRange(
      betDetails, 
      startTimestamp, 
      endTimestamp
    );
    
    // Filter by user if search term provided
    if (tradesSearchTerm) {
      filteredBets = filteredBets.filter(bet => 
        bet.userId.toLowerCase().includes(tradesSearchTerm.toLowerCase())
      );
    }

    // Pagination
    const totalPages = Math.ceil(filteredBets.length / itemsPerPage);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const paginatedBets = filteredBets.slice(startIdx, endIdx);

    return (
      <>
        <ActionBar>
          <SearchInput
            type="text"
            placeholder="Search by user principal..."
            value={tradesSearchTerm}
            onChange={(e) => {
              setTradesSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          <label style={{ color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Start Date:
            <DateInput
              type="datetime-local"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </label>
          <label style={{ color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            End Date:
            <DateInput
              type="datetime-local"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </label>
          {(startDate || endDate || tradesSearchTerm) && (
            <Button onClick={() => { 
              setStartDate(''); 
              setEndDate(''); 
              setTradesSearchTerm('');
              setCurrentPage(1); 
            }}>
              Clear Filters
            </Button>
          )}
          <Button onClick={fetchAllData} disabled={isLoading}>
            {isLoading ? '🔄 Loading...' : '🔄 Refresh'}
          </Button>
          <ExportButton onClick={handleExportBets} disabled={betDetails.length === 0}>
            📥 Export Bets CSV
          </ExportButton>
          <ExportButton onClick={handleExportPlatform} disabled={!platformSummary}>
            📥 Export Platform CSV
          </ExportButton>
        </ActionBar>

        {/* Platform Summary */}
        <SectionTitle>📊 Platform Summary</SectionTitle>
        {platformSummary && (
          <>
            <MetricsGrid>
              <MetricCard>
                <MetricLabel>Unique Users</MetricLabel>
                <MetricValue>{platformSummary.uniqueUsers}</MetricValue>
              </MetricCard>
              <MetricCard>
                <MetricLabel>Total Bets</MetricLabel>
                <MetricValue>{platformSummary.totalBets}</MetricValue>
              </MetricCard>
              <MetricCard>
                <MetricLabel>Call Bets</MetricLabel>
                <MetricValue>{platformSummary.callCount}</MetricValue>
              </MetricCard>
              <MetricCard>
                <MetricLabel>Put Bets</MetricLabel>
                <MetricValue>{platformSummary.putCount}</MetricValue>
              </MetricCard>
              <MetricCard>
                <MetricLabel>User Wins</MetricLabel>
                <MetricValue $positive={true}>{platformSummary.totalWins}</MetricValue>
              </MetricCard>
              <MetricCard>
                <MetricLabel>User Losses</MetricLabel>
                <MetricValue $negative={true}>{platformSummary.totalLosses}</MetricValue>
              </MetricCard>
              <MetricCard>
                <MetricLabel>Total Volume</MetricLabel>
                <MetricValue>${platformSummary.totalVolume.toFixed(2)}</MetricValue>
              </MetricCard>
              <MetricCard>
                <MetricLabel>Atticus Net Gain/Loss</MetricLabel>
                <MetricValue 
                  $positive={platformSummary.atticusNetGainLoss > 0}
                  $negative={platformSummary.atticusNetGainLoss < 0}
                >
                  ${platformSummary.atticusNetGainLoss.toFixed(2)}
                </MetricValue>
              </MetricCard>
            </MetricsGrid>

            <h3 style={{ color: 'var(--text)', marginTop: '1.5rem' }}>Bets by Strike Offset</h3>
            <BreakdownGrid>
              {Object.entries(platformSummary.strikeBreakdown).map(([key, value]) => (
                <BreakdownItem key={key}>
                  <BreakdownLabel>{key}</BreakdownLabel>
                  <BreakdownValue>{value}</BreakdownValue>
                </BreakdownItem>
              ))}
            </BreakdownGrid>

            <h3 style={{ color: 'var(--text)', marginTop: '1.5rem' }}>Bets by Expiry</h3>
            <BreakdownGrid>
              {Object.entries(platformSummary.expiryBreakdown).map(([key, value]) => (
                <BreakdownItem key={key}>
                  <BreakdownLabel>{key}</BreakdownLabel>
                  <BreakdownValue>{value}</BreakdownValue>
                </BreakdownItem>
              ))}
            </BreakdownGrid>
          </>
        )}

        {/* Individual Bet Data */}
        <SectionTitle>📈 Individual Bet Data ({filteredBets.length} bets)</SectionTitle>
        <Table>
          <thead>
            <tr>
              <TableHeader>Trade ID</TableHeader>
              <TableHeader>User</TableHeader>
              <TableHeader>Time</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Entry Price</TableHeader>
              <TableHeader>Strike Price</TableHeader>
              <TableHeader>Settlement Price</TableHeader>
              <TableHeader>Price Δ</TableHeader>
              <TableHeader>Expiry</TableHeader>
              <TableHeader>Outcome</TableHeader>
              <TableHeader>Atticus G/L</TableHeader>
            </tr>
          </thead>
          <tbody>
            {paginatedBets.map((bet) => (
              <TableRow key={bet.tradeId}>
                <TableCell>{bet.tradeId}</TableCell>
                <TableCell 
                  title="Click to copy full principal"
                  style={{ 
                    cursor: 'pointer', 
                    fontFamily: 'monospace', 
                    fontSize: '0.7rem',
                    maxWidth: '150px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  onClick={() => {
                    navigator.clipboard.writeText(bet.userId);
                    alert(`Copied: ${bet.userId}`);
                  }}
                >
                  {bet.userId}
                </TableCell>
                <TableCell>{new Date(bet.timestamp).toLocaleString()}</TableCell>
                <TableCell>{bet.betType}</TableCell>
                <TableCell>${bet.entryPrice.toFixed(2)}</TableCell>
                <TableCell>${bet.strikePrice.toFixed(2)}</TableCell>
                <TableCell>
                  {bet.settlementPrice ? `$${bet.settlementPrice.toFixed(2)}` : '-'}
                </TableCell>
                <TableCell 
                  $positive={bet.priceDelta !== null && bet.priceDelta > 0}
                  $negative={bet.priceDelta !== null && bet.priceDelta < 0}
                >
                  {bet.priceDelta !== null ? `$${bet.priceDelta.toFixed(2)}` : '-'}
                </TableCell>
                <TableCell>{bet.expiry}</TableCell>
                <TableCell 
                  $positive={bet.outcome === 'win'}
                  $negative={bet.outcome === 'loss'}
                >
                  {bet.outcome.toUpperCase()}
                </TableCell>
                <TableCell 
                  $positive={bet.atticusGainLoss > 0}
                  $negative={bet.atticusGainLoss < 0}
                >
                  {bet.atticusGainLoss > 0 ? '+' : ''}${bet.atticusGainLoss.toFixed(2)}
                  <span style={{ fontSize: '0.7rem', marginLeft: '0.25rem', opacity: 0.8 }}>
                    {bet.atticusGainLoss > 0 ? '(Gain)' : '(Loss)'}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <PaginationContainer>
            <PaginationButton
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </PaginationButton>
            <span style={{ color: 'var(--text)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <PaginationButton
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </PaginationButton>
          </PaginationContainer>
        )}

        {filteredBets.length === 0 && (
          <LoadingText>No bets found for the selected period</LoadingText>
        )}
      </>
    );
  };

  const renderPlatformTab = () => {
    return (
      <>
        <ActionBar>
          <Button onClick={fetchPlatformMetrics} disabled={isLoading}>
            {isLoading ? '🔄 Loading...' : '🔄 Refresh Platform Data'}
          </Button>
        </ActionBar>

        <SectionTitle>💰 Liquidity vs Ledger</SectionTitle>
        
        <MetricsGrid>
          <MetricCard style={{ gridColumn: 'span 2' }}>
            <MetricLabel>🏦 Liquidity Balance (Cash on Hand)</MetricLabel>
            <MetricValue style={{ fontSize: '2rem' }}>
              {blockchainBalance !== null ? `${blockchainBalance.toFixed(8)} BTC` : 'Loading...'}
            </MetricValue>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
              ✅ Source: Real Bitcoin blockchain
            </div>
          </MetricCard>

          <MetricCard style={{ gridColumn: 'span 2' }}>
            <MetricLabel>📊 Ledger Balance (Accounting)</MetricLabel>
            <MetricValue 
              style={{ fontSize: '2rem' }}
              $positive={platformLedger && platformLedger.netPnl > 0}
              $negative={platformLedger && platformLedger.netPnl < 0}
            >
              {platformLedger ? `$${platformLedger.netPnl.toFixed(2)} USD` : 'Loading...'}
            </MetricValue>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
              ℹ️ Source: Platform ledger calculations
            </div>
          </MetricCard>
        </MetricsGrid>

        <div style={{ 
          background: 'var(--bg-panel)', 
          border: '1px solid var(--border)', 
          borderRadius: '8px', 
          padding: '1rem', 
          marginBottom: '2rem'
        }}>
          <h3 style={{ color: 'var(--text)', marginTop: 0 }}>💡 Understanding Liquidity vs Ledger</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--accent)' }}>Liquidity Balance:</strong> Represents actual BTC in the platform wallet. 
            Changes only with real deposits and withdrawals on the Bitcoin blockchain. This is your actual cash on hand.
          </p>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--accent)' }}>Ledger Balance:</strong> An accounting record that starts at $0. 
            Credits when users lose (platform gains premium), debits when users win (platform pays out). 
            Represents platform's trading profit/loss.
          </p>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--accent)' }}>Reconciliation:</strong> These should be tracked separately. 
            Liquidity ensures you can pay winners. Ledger shows trading performance.
          </p>
        </div>

        <SectionTitle>📈 Platform Wallet Details</SectionTitle>
        {platformWallet && (
          <Table>
            <tbody>
              <TableRow>
                <TableCell><strong>Balance</strong></TableCell>
                <TableCell>{Number(platformWallet.balance).toFixed(8)} BTC</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><strong>Total Deposits</strong></TableCell>
                <TableCell>{Number(platformWallet.totalDeposits).toFixed(8)} BTC</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><strong>Total Withdrawals</strong></TableCell>
                <TableCell>{Number(platformWallet.totalWithdrawals).toFixed(8)} BTC</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><strong>Blockchain Balance (Live)</strong></TableCell>
                <TableCell style={{ fontWeight: 'bold', color: 'var(--accent)' }}>
                  {blockchainBalance !== null ? `${blockchainBalance.toFixed(8)} BTC` : 'Fetching...'}
                </TableCell>
              </TableRow>
            </tbody>
          </Table>
        )}

        <SectionTitle>📊 Platform Ledger Details</SectionTitle>
        {platformLedger && (
          <Table>
            <tbody>
              <TableRow>
                <TableCell><strong>Total Winning Trades (Platform gains)</strong></TableCell>
                <TableCell $positive={true}>
                  +${Number(platformLedger.totalWinningTrades).toFixed(2)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell><strong>Total Losing Trades (Platform losses)</strong></TableCell>
                <TableCell $negative={true}>
                  -${Number(platformLedger.totalLosingTrades).toFixed(2)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell><strong>Net PnL</strong></TableCell>
                <TableCell 
                  $positive={Number(platformLedger.netPnl) > 0}
                  $negative={Number(platformLedger.netPnl) < 0}
                  style={{ fontWeight: 'bold', fontSize: '1.1rem' }}
                >
                  {Number(platformLedger.netPnl) > 0 ? '+' : ''}${Number(platformLedger.netPnl).toFixed(2)}
                </TableCell>
              </TableRow>
            </tbody>
          </Table>
        )}
      </>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <AdminContainer>
      <Title>🏦 Atticus Admin Console</Title>

      <TabContainer>
        <Tab 
          $active={activeTab === 'users'} 
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </Tab>
        <Tab 
          $active={activeTab === 'trades'} 
          onClick={() => setActiveTab('trades')}
        >
          📈 Trades
        </Tab>
        <Tab 
          $active={activeTab === 'platform'} 
          onClick={() => setActiveTab('platform')}
        >
          🏦 Platform
        </Tab>
      </TabContainer>

      {error && <ErrorText>{error}</ErrorText>}

      {isLoading && !allPositions.length && (
        <LoadingText>Loading admin data...</LoadingText>
      )}

      <ContentSection>
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'trades' && renderTradesTab()}
        {activeTab === 'platform' && renderPlatformTab()}
      </ContentSection>

      {onLogout && (
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Button onClick={onLogout}>
            Logout
          </Button>
        </div>
      )}
    </AdminContainer>
  );
};

