import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { useSynchronizedPrice } from '../hooks/useGlobalPriceFeed';
import { TradeForm } from './TradeForm';
import { FirstTradeHint } from './FirstTradeHint';
import { useFirstTradeHint } from '../hooks/useFirstTradeHint';
import { PriceChart } from './PriceChart';
import { CountdownPill } from './CountdownPill';
import { BalancePill } from './BalancePill';
import { ActiveTicketCard } from './ActiveTicketCard';
import {
  toastTradePlaced, toastTradeWon, toastTradeLost, toastTradeTie, toastTradeError,
} from './tradeToasts';
import { PositionsList } from './PositionsList';
import { AccountScreen } from './AccountScreen';
import { ErrorBoundary } from './ErrorBoundary';
import { useCanister } from '../contexts/CanisterProvider';
import { useBalance } from '../contexts/BalanceProvider';
// import { tradingService, TradeRequest } from '../services/tradingService'; // ✅ REMOVED: Using AtticusService instead
import { pricingEngine } from '../services/OffChainPricingEngine';
import { pricingService, type Tenor } from '../services/pricing/PricingService';
import { isSupportedTenor } from '../services/pricing/tenor';
// import { useAuth } from '../hooks/useAuth'; // ✅ REMOVED: Using useUnifiedAuth
import { useAuth } from '../contexts/AuthProvider';
const TradingContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-primary);
  color: var(--text);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  overflow-y: auto; /* ✅ FIX: Allow vertical scrolling for whole app */
  overflow-x: hidden;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.375rem 1rem; /* ✅ FIX: Reduced padding for tighter UI */
  background: var(--bg-panel); /* ✅ FIX: Match footer color for consistency */
  border-bottom: 1px solid var(--border);
  box-shadow: 0 1px 4px var(--shadow);
  min-height: 45px; /* ✅ FIX: Reduced height */
  flex-shrink: 0;
  position: sticky; /* ✅ FIX: Make header sticky for better navigation */
  top: 0;
  z-index: 1000; /* ✅ FIX: Ensure header stays above other content */
  /* ✅ REMOVED: backdrop-filter not widely supported and causes transparency issues */

  @media (min-width: 768px) {
    padding: 0.5rem 1.5rem; /* ✅ FIX: Reduced desktop padding */
  }
`;

/**
 * Brand lockup: square Atticus logo + 'Micro Options' wordmark.
 * Logo runs at 28px on phones / 32px on desktop with a fixed aspect
 * ratio (the source asset is 180x180 JPEG).
 */
const BrandLockup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  img {
    height: 28px;
    width: 28px;
    object-fit: contain;
    border-radius: 6px;
  }

  .wordmark {
    font-family: var(--font-sans);
    font-weight: 700;
    font-size: 15px;
    letter-spacing: 0.01em;
    color: var(--text);
    white-space: nowrap;
  }

  @media (min-width: 768px) {
    gap: 10px;
    img { height: 32px; width: 32px; }
    .wordmark { font-size: 17px; }
  }
`;

const MainContent = styled.div`
  display: flex;
  flex: 1;
  overflow: visible; /* ✅ FIX: Allow content to flow naturally */
  flex-direction: column; /* ✅ FIX: Stack on mobile by default */
  padding-bottom: 60px; /* ✅ FIX: Add bottom padding for mobile footer */

  @media (min-width: 768px) {
    flex-direction: row; /* Side-by-side on desktop */
    padding-bottom: 0; /* Remove bottom padding on desktop */
  }
`;

const PaperBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 4px 10px;
  margin: 4px 8px 0;
  background: rgba(245,195,68,0.10);
  border: 1px solid rgba(245,195,68,0.32);
  border-radius: 999px;
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
`;

const ChartSection = styled.div`
  flex-shrink: 0;
  height: clamp(200px, 32vh, 320px);
  display: flex;
  flex-direction: column;
  padding: 4px 8px 0;
  margin-top: 0;
  position: relative;

  @media (min-width: 768px) {
    flex: 1;
    height: auto;
    min-height: 320px;
    max-height: 520px;
    /* Sidebar is 400px + 1px border. Don't reserve more than that. */
    max-width: calc(100vw - 401px);
    padding: 8px 10px 0;
    margin-top: 4px;
    overflow: hidden;
  }
`;

const TradingSidebar = styled.div`
  width: 100%; /* ✅ FIX: Full width on mobile */
  background: var(--bg-panel);
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex: 1; /* ✅ FIX: Take remaining space on mobile */
  min-height: 0;
  max-height: none;

  @media (min-width: 768px) {
    width: 400px; /* Fixed width on desktop */
    border-top: none;
    border-left: 1px solid var(--border);
    flex-shrink: 0; /* Don't shrink on desktop */
  }
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;

  @media (max-width: 767px) {
    display: none; /* Hide tabs on mobile - they'll be in footer */
  }
`;

const Tab = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 0.75rem; /* ✅ FIX: Reduced padding for tighter UI */
  background: ${props => props.active ? 'var(--bg-primary)' : 'transparent'};
  border: none;
  color: ${props => props.active ? 'var(--text)' : 'var(--text-dim)'};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    background: var(--bg-primary);
    color: var(--text);
  }

  ${props => props.active && `
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--accent);
    }
  `}
`;

const TabContent = styled.div`
  flex: 1;
  overflow-y: auto;
  min-height: 0;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: var(--bg-primary);
  }

  &::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: var(--accent);
  }
`;

const MobileFooter = styled.div`
  display: none; /* Hidden by default */
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: var(--bg-panel);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 1000;

  @media (max-width: 767px) {
    display: flex; /* Show on mobile */
  }
`;

const MobileTab = styled.button<{ active: boolean; disabled?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  background: transparent;
  border: none;
  color: ${props => props.disabled ? 'var(--text-dim)' : (props.active ? 'var(--accent)' : 'var(--text-dim)')};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  min-width: 60px;
  opacity: ${props => props.disabled ? 0.5 : 1};

  &:hover {
    color: ${props => props.disabled ? 'var(--text-dim)' : 'var(--text)'};
  }

  svg {
    width: 20px;
    height: 20px;
    margin-bottom: 0.25rem;
  }

  span {
    font-size: 0.75rem;
    font-weight: 500;
  }
`;

interface TradingPanelProps {
  onLogout?: () => void;
  isDemoMode?: boolean;
  onConnectWallet?: () => void;
  shouldOpenHelp?: boolean;
  onHelpOpened?: () => void;
}

interface TradeData {
  id: string;
  positionId: number;
  entryPrice: number;
  strikeOffset: number;
  startTime: number;
  expiry: string;
  type: 'call' | 'put';
  amount: number;
  /** Payout multiple frozen at submit time so settlement matches what the user saw. */
  quotedPayoutMultiple?: number;
}

/**
 * Auto-scroll the chart into view after a trade is placed.
 *
 * Triggers when the device is touch-primary OR the viewport is too short
 * for the chart + active-ticket card to both fit above the fold (≈700px).
 * On laptops with a tall window we leave the layout alone — the user
 * already sees both surfaces.
 *
 * Uses requestAnimationFrame so the DOM has reflowed with the new
 * ActiveTicketCard before we measure / scroll.
 */
const scrollChartIntoView = (): void => {
  if (typeof window === 'undefined') return;
  const isTouchPrimary = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const isShortViewport = window.innerHeight < 700;
  if (!isTouchPrimary && !isShortViewport) return;
  requestAnimationFrame(() => {
    const el = document.querySelector('[data-chart-section]');
    if (el && 'scrollIntoView' in el) {
      (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
};

export const TradingPanel: React.FC<TradingPanelProps> = ({ onLogout, isDemoMode = false, onConnectWallet, shouldOpenHelp, onHelpOpened }) => {
  const { priceState, isConnected: priceConnected } = useSynchronizedPrice();
  const { isConnected: canisterConnected, atticusService } = useCanister();
  const { user } = useAuth();
  const { refreshBalance } = useBalance();
  const { dismiss: dismissFirstTradeHint } = useFirstTradeHint();

  const [activeTab, setActiveTab] = useState<'trade' | 'positions' | 'account'>('trade');
  const [optionType, setOptionType] = useState<'call' | 'put' | null>(null);
  const [strikeOffset, setStrikeOffset] = useState(0);
  const [selectedExpiry, setSelectedExpiry] = useState('1m');
  
  // ✅ OPTIMIZED TRADE STATE: Single consolidated state object
  const [tradeState, setTradeState] = useState<{
    isActive: boolean;
    isInProgress: boolean;
    data: TradeData | null;
    entryPrice: number | undefined;
    countdown: number;
    statusMessage: string | null;
    result: { message: string; type: 'success' | 'error' } | null;
    settlementResult: { 
      outcome: 'win' | 'loss' | 'tie'; 
      profit: number; 
      payout: number; 
      finalPrice: number;
      strikePrice?: number;
      entryPrice?: number;
      strikeOffset?: number;
      optionType?: 'call' | 'put';
    } | null;
    activeOptionType?: 'call' | 'put';  // ✅ ADDED: Store active trade's option type
    activeStrikeOffset?: number;         // ✅ ADDED: Store active trade's strike offset
  }>({
    isActive: false,
    isInProgress: false,
    data: null,
    entryPrice: undefined,
    countdown: 0,
    statusMessage: null,
    result: null,
    settlementResult: null
  });

  // ✅ FIXED: Initialize trading service when canister is available (or in demo mode)
  useEffect(() => {
    if (isDemoMode) {
    } else if (atticusService) {
    }
  }, [atticusService, isDemoMode]);

  useEffect(() => {
    setOptionType(null);
    setStrikeOffset(0);
    setTradeState(prev => ({
      ...prev,
      isActive: false,
      entryPrice: undefined
    }));
  }, []);

  // Handle opening help tab from popup
  useEffect(() => {
    if (shouldOpenHelp) {
      onHelpOpened?.();
    }
  }, [shouldOpenHelp, onHelpOpened]);

  // ✅ FIXED: Use refs to store current values and prevent stale closures
  const tradeStateRef = useRef(tradeState);
  const priceStateRef = useRef(priceState);
  
  // Update refs when values change
  tradeStateRef.current = tradeState;
  priceStateRef.current = priceState;

  const handleAutoSettlement = useCallback(async () => {
    const currentTradeData = tradeStateRef.current.data;
    const currentPrice = priceStateRef.current.current;
    
    if (!currentTradeData) {
      return;
    }


    try {
      // ✅ FIXED: Use actual position ID from backend instead of custom trade ID
      // The backend stores positions with numeric IDs, so we use the positionId directly
      const positionId = currentTradeData.positionId;
      console.log('🔄 Trade details:', {
        positionId: currentTradeData.positionId,
        type: currentTradeData.type,
        strikeOffset: currentTradeData.strikeOffset,
        expiry: currentTradeData.expiry,
        amount: currentTradeData.amount,
        entryPrice: currentTradeData.entryPrice
      });
      
      // ✅ SIMPLIFIED: Backend gets final price from price oracle, not frontend
      // ✅ DEMO: Pass trade data for realistic demo outcomes
      console.log('🎮 Demo settlement - passing trade data:', {
        optionType: currentTradeData.type,
        strikeOffset: currentTradeData.strikeOffset,
        finalPrice: currentPrice,
        isCall: currentTradeData.type === 'call'
      });
      
      const result = pricingEngine.calculateSettlement(
        currentTradeData.type,
        currentTradeData.strikeOffset,
        currentTradeData.expiry,
        currentPrice,
        currentTradeData.entryPrice,
        currentTradeData.amount,
        currentTradeData.quotedPayoutMultiple,
      );
      
      // ✅ RECORD: Send result to backend for storage only
      try {
        await pricingEngine.recordSettlement(
          positionId,
          result,
          atticusService,
          user?.principal // Pass user principal
        );
      } catch (error) {
        console.warn('⚠️ Backend settlement recording failed, but settlement calculation succeeded:', error);
        // ✅ Continue with frontend settlement display even if backend fails
        // Frontend calculation is authoritative for user experience
      }


      if (result.outcome === 'win') {
        toastTradeWon({ profit: result.profit, payout: result.payout });
      } else if (result.outcome === 'tie') {
        toastTradeTie({ refund: result.payout });
      } else {
        toastTradeLost({ loss: result.profit });
      }

      setTradeState({
        isActive: false,
        isInProgress: false,
        data: null,
        entryPrice: undefined,
        countdown: 0,
        statusMessage: null,
        result: null,
        settlementResult: null,
      });
      
      // Reset form state
      setOptionType(null);
      setStrikeOffset(0);

      refreshBalance().catch(() => {});
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Auto-settlement failed:', errorMessage);
      toastTradeError(`Settlement failed: ${errorMessage}`);

      setTradeState({
        isActive: false,
        isInProgress: false,
        data: null,
        entryPrice: undefined,
        countdown: 0,
        statusMessage: null,
        result: null,
        settlementResult: null,
      });
      setOptionType(null);
      setStrikeOffset(0);
    }
  }, []);

  // ✅ REMOVED: Timer logic moved to separate TimerDisplay component to prevent re-renders

  // ✅ REMOVED: No need to update countdown state - it's calculated on demand

  // ✅ REMOVED: useMemo to prevent unnecessary re-renders - use priceState directly

  const handleOptionTypeSelect = (type: 'call' | 'put') => {
    setOptionType(type);
    // ✅ OPTIMIZED: Removed unnecessary trade state reset to prevent re-renders
  };

  const handleStrikeOffsetSelect = (offset: number) => {
    setStrikeOffset(offset);
    // ✅ OPTIMIZED: Removed unnecessary trade state reset to prevent re-renders
  };

  const handleExpirySelect = (expiry: string) => {
    setSelectedExpiry(expiry);
    // ✅ OPTIMIZED: Removed unnecessary trade state reset to prevent re-renders
  };

  // ✅ COMPLETELY FIXED: Use trading service instead of direct canister calls
  const handleTradeStart = async (contracts: number, overrideParams?: {
    optionType?: 'call' | 'put';
    strikeOffset?: number;
    expiry?: string;
  }) => {
    // ✅ DEBUG: Log what TradingPanel receives
    
    // ✅ FIX: Use override params if provided, otherwise use state
    const finalOptionType = overrideParams?.optionType || optionType;
    const finalStrikeOffset = overrideParams?.strikeOffset || strikeOffset;
    const finalExpiry = overrideParams?.expiry || selectedExpiry;
    
    // ✅ FIX: Update state to match override params for chart synchronization
    if (overrideParams) {
      if (overrideParams.optionType) setOptionType(overrideParams.optionType);
      if (overrideParams.strikeOffset !== undefined) setStrikeOffset(overrideParams.strikeOffset);
      if (overrideParams.expiry) setSelectedExpiry(overrideParams.expiry);
    }
    
    if (!priceState.isValid || !finalOptionType) {
      console.error('Cannot start trade: missing price data or option type', {
        priceStateIsValid: priceState.isValid,
        finalOptionType: finalOptionType,
        optionType: optionType,
        overrideParams: overrideParams,
        priceState: priceState
      });
      return;
    }

    if (tradeState.isInProgress) {
      return;
    }

    // ✅ CRITICAL: Capture price at the exact moment trade starts for perfect synchronization
    const tradeStartPrice = priceState.current || 0;
    if (!tradeStartPrice) {
      throw new Error('Price not available for trade - please refresh and try again');
    }

    try {
      setTradeState(prev => ({
        ...prev,
        isInProgress: true,
        statusMessage: 'Preparing trade...'
      }));
      
      // ✅ FIXED: Check if we have the necessary services (skip in demo mode)
      if (!isDemoMode && !atticusService) {
        console.error('Atticus service not available');
        setTradeState(prev => ({
          ...prev,
          isInProgress: false,
          statusMessage: 'Trading service not available'
        }));
        return;
      }

      if (!isDemoMode && !user) {
        console.error('User not authenticated');
        return;
      }

      // ✅ SINGLE CALCULATION: Calculate once and reuse
      const strikePrice = finalOptionType === 'call'
        ? tradeStartPrice + finalStrikeOffset
        : tradeStartPrice - finalStrikeOffset;

      console.log('🎯 Strike price calculation:', {
        tradeStartPrice,
        finalStrikeOffset,
        finalOptionType,
        calculatedStrikePrice: strikePrice
      });

      // ✅ FIXED: 1 contract = 1 USD worth of BTC, not 1 BTC

      const tradeRequest = {
        optionType: finalOptionType,
        strikeOffset: finalStrikeOffset,
        expiry: finalExpiry,
        size: contracts,
      };


      console.log('🔍 Debug - Calling pricingEngine.placeTrade with:', {
        userPrincipal: isDemoMode ? 'demo-user' : user?.principal,
        userObject: user,
        userPrincipalFromUser: user?.principal,
        tradeRequest,
        isDemoMode
      });

      // ✅ ASYNC TRADE PROCESSING: Run trade in parallel with price updates
      setTradeState(prev => ({ ...prev, statusMessage: 'Executing trade...' }));
      
      // ✅ NEW: Use off-chain trade placement (faster, more accurate)
      const tradePromise = pricingEngine.placeTrade(
        isDemoMode ? 'demo-user' : user!.principal,
        finalOptionType,
        finalStrikeOffset,
        finalExpiry,
        contracts,
        atticusService,
        isDemoMode
      );
      
      // Run trade in parallel with price monitoring
      const [tradeResult] = await Promise.allSettled([tradePromise]);
      
      if (tradeResult.status === 'rejected') {
        throw new Error(tradeResult.reason?.message || 'Trade execution failed');
      }
      
      const result = tradeResult.value;

      if (!result.success) {
        throw new Error(result.error || 'Trade execution failed');
      }

      const orderId = result.positionId ?? 0;

      const tradeData: TradeData = {
        id: orderId.toString(),
        positionId: orderId,
        entryPrice: result.entryPrice ?? tradeStartPrice ?? 0,
        strikeOffset: finalStrikeOffset,
        startTime: Date.now(),
        expiry: finalExpiry,
        type: finalOptionType,
        amount: contracts,
        quotedPayoutMultiple: result.quotedPayoutMultiple,
      };


      setTradeState({
        isActive: true,
        isInProgress: false,
        data: tradeData,
        entryPrice: tradeStartPrice || 0,
        countdown: 0,
        statusMessage: null,
        result: null,
        settlementResult: null,
        activeOptionType: finalOptionType,
        activeStrikeOffset: finalStrikeOffset,
      });

      toastTradePlaced({ direction: finalOptionType, stake: contracts, tenor: finalExpiry });
      refreshBalance().catch(() => {});
      setActiveTab('trade');
      scrollChartIntoView();
      dismissFirstTradeHint();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to start trade:', errorMessage);
      toastTradeError(errorMessage);
      setTradeState({
        isActive: false,
        isInProgress: false,
        data: null,
        entryPrice: undefined,
        countdown: 0,
        statusMessage: null,
        result: null,
        settlementResult: null,
      });
    }
  };

  const isFullyConnected = isDemoMode ? true : (priceConnected && canisterConnected);

  // ✅ FIXED: Use active trade params when trade is running, otherwise use form state
  const chartProps = {
    priceData: priceState,
    isConnected: priceConnected,
    optionType: tradeState.isActive && tradeState.activeOptionType ? tradeState.activeOptionType : optionType,
    strikeOffset: tradeState.isActive && tradeState.activeStrikeOffset !== undefined ? tradeState.activeStrikeOffset : strikeOffset,
    isTradeActive: tradeState.isActive,
    ...(tradeState.entryPrice !== undefined && { entryPrice: tradeState.entryPrice })
  };

  return (
    <TradingContainer>
      <Header>
        <BrandLockup aria-label="Atticus Micro Options">
          <img src="/images/atticus-logo.jpg" alt="Atticus" />
          <span className="wordmark">Micro Options</span>
        </BrandLockup>
        <BalancePill />
        {/*
          v4 header cleanup: dropped DemoPill, the 'Paper' label on
          BalancePill, the Exit-demo button, and the global
          CountdownPill (the active-ticket card has its own timer
          right next to the trade). The PAPER banner under the chart
          is the single demo-mode reminder.

          The countdown timer is still wired up on TradingPanel
          (handleAutoSettlement fires when it expires) — it just
          no longer renders in the header.
        */}
        <CountdownPill
          isActive={tradeState.isActive}
          expiry={selectedExpiry}
          onExpiry={handleAutoSettlement}
          headless
        />
      </Header>

      <MainContent>
        {isDemoMode && <PaperBanner>Paper · No real money at stake</PaperBanner>}
        <ChartSection data-chart-section>
          <ErrorBoundary fallback={<div>Chart temporarily unavailable</div>}>
            <PriceChart {...chartProps} />
          </ErrorBoundary>
        </ChartSection>

        <TradingSidebar>
          <TabContainer>
            <Tab active={activeTab === 'trade'} onClick={() => setActiveTab('trade')}>
              Trade
            </Tab>
            <Tab active={activeTab === 'positions'} onClick={() => setActiveTab('positions')}>
              Positions
            </Tab>
            <Tab active={activeTab === 'account'} onClick={() => setActiveTab('account')}>
              Account
            </Tab>
          </TabContainer>

          <TabContent>
            {activeTab === 'trade' && (
              <ErrorBoundary fallback={<div>Trading form unavailable</div>}>
                {tradeState.isActive && tradeState.data ? (
                  (() => {
                    const td = tradeState.data;
                    const entry = tradeState.entryPrice ?? td.entryPrice;
                    const strike = td.type === 'call' ? entry + td.strikeOffset : entry - td.strikeOffset;
                    let payoutMultiple = 1;
                    if (isSupportedTenor(td.expiry)) {
                      payoutMultiple = pricingService.quote({
                        optionType: td.type,
                        spotUSD: entry,
                        strikeOffsetUSD: td.strikeOffset,
                        tenor: td.expiry as Tenor,
                        contracts: td.amount,
                      }).payoutMultiple;
                    }
                    return (
                      <ActiveTicketCard
                        ticketId={td.positionId}
                        spotUSD={priceState.current}
                        optionType={td.type}
                        strikePrice={strike}
                        entryPrice={entry}
                        tenor={td.expiry}
                        stake={td.amount}
                        potentialPayout={td.amount * payoutMultiple}
                        onSold={() => {
                          setTradeState({
                            isActive: false, isInProgress: false, data: null,
                            entryPrice: undefined, countdown: 0, statusMessage: null,
                            result: null, settlementResult: null,
                          });
                          setOptionType(null);
                          setStrikeOffset(0);
                          refreshBalance().catch(() => {});
                        }}
                      />
                    );
                  })()
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
                    <FirstTradeHint />
                    <TradeForm
                      currentPrice={priceState.current}
                      optionType={optionType}
                      strikeOffset={strikeOffset}
                      isTradeActive={tradeState.isActive}
                      isTradeInProgress={tradeState.isInProgress}
                      onOptionTypeSelect={handleOptionTypeSelect}
                      onStrikeOffsetSelect={handleStrikeOffsetSelect}
                      onExpirySelect={handleExpirySelect}
                      onTradeStart={handleTradeStart}
                      isConnected={isFullyConnected}
                      isDemoMode={isDemoMode}
                    />
                  </div>
                )}
              </ErrorBoundary>
            )}

            {activeTab === 'positions' && (
              <ErrorBoundary fallback={<div>Positions unavailable</div>}>
                <PositionsList
                  spotUSD={priceState.current}
                  onChanged={() => { refreshBalance().catch(() => {}); }}
                />
              </ErrorBoundary>
            )}

            {activeTab === 'account' && (
              <ErrorBoundary fallback={<div>Account unavailable</div>}>
                <AccountScreen
                  onLogout={onLogout ?? (() => {})}
                  onReset={() => {
                    setTradeState(prev => ({
                      ...prev,
                      isActive: false,
                      isInProgress: false,
                      data: null,
                      result: null,
                    }));
                    refreshBalance().catch(() => {});
                  }}
                />
              </ErrorBoundary>
            )}
          </TabContent>
        </TradingSidebar>
      </MainContent>

      {/* Mobile Footer */}
      <MobileFooter>
        <MobileTab
          active={activeTab === 'trade'}
          onClick={() => setActiveTab('trade')}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>Trade</span>
        </MobileTab>
        <MobileTab active={activeTab === 'positions'} onClick={() => setActiveTab('positions')}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
          </svg>
          <span>Positions</span>
        </MobileTab>
        <MobileTab active={activeTab === 'account'} onClick={() => setActiveTab('account')}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4S14.21 4 12 4 8 5.79 8 8s1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          <span>Account</span>
        </MobileTab>
      </MobileFooter>

    </TradingContainer>
  );
};

export default TradingPanel;
