/**
 * ✅ OFF-CHAIN PRICING ENGINE
 * Following odin.fun pattern: All pricing logic moved from backend to frontend
 * This eliminates the need for a price oracle canister and provides instant calculations
 */

import { Decimal } from 'decimal.js';
import { getPartnerExchange } from './partner';
import { realizedVolatility } from './pricing/realizedVolatility';
import { pricingService, type Tenor } from './pricing/PricingService';
import { isSupportedTenor } from './pricing/tenor';
import { fetchFirstAvailable, type PriceTick } from './feed/restSources';

export interface PriceData {
  current: number;
  price: number;
  timestamp: number;
  isValid: boolean;
  change: {
    amount: number;
    percentage: number;
  };
  source: string;
  volume: number;
  high: number;
  low: number;
}

export interface SettlementResult {
  outcome: 'win' | 'loss' | 'tie';
  payout: number;
  profit: number;
  finalPrice: number;
  strikePrice: number;
}

export interface TradeData {
  optionType: 'call' | 'put';
  strikeOffset: number;
  expiry: string;
  contractCount: number;
  userPrincipal: string;
}

export class OffChainPricingEngine {
  private wsConnection: WebSocket | null = null;
  private currentPrice: number = 0;
  private priceHistory: Array<{ timestamp: number; price: number }> = [];
  private listeners: Array<(priceData: PriceData) => void> = [];
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private placeSequence = 0;
  private settleSequence = 0;
  private restPollTimer: ReturnType<typeof setInterval> | null = null;
  private restInFlight = false;
  private lastTickAt = 0;
  private currentSource = 'connecting';
  private isDisposed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Skip network setup in headless test runs so the test runner doesn't
    // leak timers + sockets. The engine is only useful in a browser.
    if (typeof window === 'undefined') return;

    // REST polling supervises the chart so the user always sees a price
    // (even when the WebSocket is blocked or the venue is in maintenance).
    this.startRestPolling();
    this.connectToPriceFeed();
  }

  /**
   * ✅ CONNECT TO REAL-TIME PRICE FEED
   * Using Coinbase WebSocket for live Bitcoin prices
   */
  private connectToPriceFeed(): void {
    if (this.isDisposed) return;
    try {
      this.wsConnection = new WebSocket('wss://ws-feed.exchange.coinbase.com');
      
      this.wsConnection.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Subscribe to BTC-USD ticker
        this.wsConnection?.send(JSON.stringify({
          type: 'subscribe',
          product_ids: ['BTC-USD'],
          channels: ['ticker']
        }));
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'ticker' && data.product_id === 'BTC-USD') {
            this.handlePriceUpdate(data);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      this.wsConnection.onclose = () => {
        this.isConnected = false;
        this.handleReconnect();
      };

      this.wsConnection.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.isConnected = false;
      };

    } catch (error) {
      console.error('❌ Failed to connect to price feed:', error);
      this.handleReconnect();
    }
  }

  /**
   * Coinbase WS ticker payload → normalized tick.
   */
  private handlePriceUpdate(data: any): void {
    const price = parseFloat(data.price);
    if (!isFinite(price) || price <= 0) return;
    this.applyTick({
      price,
      source: 'coinbase_websocket',
      high24h: parseFloat(data.high_24h || data.price),
      low24h: parseFloat(data.low_24h || data.price),
    });
  }

  /**
   * Single emit path: WS handler + REST polling both call this with a
   * normalized tick. Notifies every listener and records into the
   * price-history buffer used by the chart.
   */
  private applyTick(tick: PriceTick): void {
    const timestamp = Date.now();
    const previousPrice = this.currentPrice;
    this.currentPrice = tick.price;
    this.lastTickAt = timestamp;
    this.currentSource = tick.source;

    realizedVolatility.observe(tick.price, timestamp);

    this.priceHistory.push({ timestamp, price: tick.price });
    if (this.priceHistory.length > 1000) {
      this.priceHistory = this.priceHistory.slice(-1000);
    }

    const change = previousPrice > 0
      ? {
          amount: tick.price - previousPrice,
          percentage: ((tick.price - previousPrice) / previousPrice) * 100,
        }
      : { amount: 0, percentage: 0 };

    const priceData: PriceData = {
      current: tick.price,
      price: tick.price,
      timestamp,
      isValid: true,
      change,
      source: tick.source,
      volume: 0,
      high: tick.high24h || tick.price,
      low: tick.low24h || tick.price,
    };

    this.listeners.forEach(callback => {
      try {
        callback(priceData);
      } catch (error) {
        console.error('listener callback failed:', error);
      }
    });
  }

  /**
   * Polls a chain of REST endpoints (Coinbase → Kraken → Binance.us).
   * Runs every ~1.5s but skips when the WebSocket has emitted within the
   * last 4s (so a healthy WS connection still drives the chart).
   */
  private startRestPolling(): void {
    if (this.restPollTimer) return;
    const tick = async () => {
      if (this.restInFlight) return;
      // Bail if disconnect() ran while this closure was queued
      if (!this.restPollTimer) return;
      const wsFresh = this.isConnected && Date.now() - this.lastTickAt < 4_000;
      if (wsFresh) return;
      this.restInFlight = true;
      try {
        const next = await fetchFirstAvailable();
        if (next && this.restPollTimer) this.applyTick(next);
      } finally {
        this.restInFlight = false;
      }
    };
    // Steady-state polling every 1.5s. First tick fires after ~1.5s; if a
    // faster first paint matters, the WebSocket connection (started in
    // parallel) usually beats it.
    this.restPollTimer = setInterval(tick, 1_500);
  }

  /**
   * ✅ HANDLE RECONNECTION
   * Automatic reconnection with exponential backoff
   */
  private handleReconnect(): void {
    if (this.isDisposed) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // REST polling continues regardless, so the chart still gets prices.
      return;
    }
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectToPriceFeed();
    }, delay);
  }

  /**
   * ✅ ADD PRICE LISTENER
   * Subscribe to real-time price updates
   * This replaces WebSocketProvider and PriceFeedManager
   */
  public addPriceListener(callback: (priceData: PriceData) => void): void {
    this.listeners.push(callback);
  }

  /**
   * ✅ REMOVE PRICE LISTENER
   * Unsubscribe from price updates
   */
  public removePriceListener(callback: (priceData: PriceData) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * ✅ GET CURRENT PRICE
   * Get the latest Bitcoin price
   */
  public getCurrentPrice(): number {
    return this.currentPrice;
  }

  /**
   * ✅ GET PRICE HISTORY
   * Get historical price data
   */
  public getPriceHistory(minutes: number = 60): Array<{ timestamp: number; price: number }> {
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    return this.priceHistory.filter(entry => entry.timestamp >= cutoffTime);
  }

  /**
   * ✅ CALCULATE STRIKE PRICE
   * Calculate strike price based on current price and offset
   */
  public calculateStrikePrice(currentPrice: number, offset: number, optionType: 'call' | 'put'): number {
    if (optionType === 'call') {
      return currentPrice + offset;
    } else {
      return currentPrice - offset;
    }
  }

  /**
   * ✅ CALCULATE PREMIUM
   * Calculate premium cost for trade
   */
  public calculatePremium(contractCount: number): number {
    return contractCount; // $1 per contract
  }

  /**
   * Settle a binary ticket at expiry.
   *
   * Single source of truth for payout: the multiple is taken from the same
   * `PricingService.quote()` the user saw at trade time (frozen via
   * `quotedPayoutMultiple`). If a quoted multiple is not provided we re-quote
   * with the trade's frozen entry price + tenor so the user is paid exactly
   * what the chip showed at submit. The deprecated 5s/10s/15s `PAYOUT_TABLE`
   * is gone — every supported tenor (30s..1h) now settles correctly.
   */
  public calculateSettlement(
    optionType: 'call' | 'put',
    strikeOffset: number,
    expiry: string,
    finalPrice: number,
    entryPrice: number,
    contractCount: number = 1,
    quotedPayoutMultiple?: number,
  ): SettlementResult {
    const strikePrice = optionType === 'call'
      ? entryPrice + strikeOffset
      : entryPrice - strikeOffset;

    const isTie = Math.abs(finalPrice - strikePrice) < 0.005;
    const isWin = !isTie && (
      optionType === 'call' ? finalPrice > strikePrice : finalPrice < strikePrice
    );

    const premiumPaid = this.calculatePremium(contractCount);

    if (isTie) {
      return {
        outcome: 'tie',
        payout: premiumPaid,
        profit: 0,
        finalPrice,
        strikePrice,
      };
    }

    if (!isWin) {
      return {
        outcome: 'loss',
        payout: 0,
        profit: -premiumPaid,
        finalPrice,
        strikePrice,
      };
    }

    const multiple = this.resolvePayoutMultiple({
      optionType,
      strikeOffset,
      expiry,
      entryPrice,
      contractCount,
      quotedPayoutMultiple,
    });
    const payout = premiumPaid * multiple;
    return {
      outcome: 'win',
      payout,
      profit: payout - premiumPaid,
      finalPrice,
      strikePrice,
    };
  }

  /**
   * Resolve a payout multiple for a winning ticket.
   *
   * Order of precedence:
   *  1. The frozen multiple from when the user submitted (preferred — matches UI exactly).
   *  2. A fresh quote from `PricingService` keyed off the trade's entry price + tenor.
   *  3. A floor of 1.05x as a defensive fallback if the tenor is unrecognized.
   */
  private resolvePayoutMultiple(args: {
    optionType: 'call' | 'put';
    strikeOffset: number;
    expiry: string;
    entryPrice: number;
    contractCount: number;
    quotedPayoutMultiple?: number;
  }): number {
    if (args.quotedPayoutMultiple && args.quotedPayoutMultiple > 0) {
      return args.quotedPayoutMultiple;
    }
    if (isSupportedTenor(args.expiry)) {
      const q = pricingService.quote({
        optionType: args.optionType,
        spotUSD: args.entryPrice,
        strikeOffsetUSD: args.strikeOffset,
        tenor: args.expiry as Tenor,
        contracts: args.contractCount,
      });
      return q.payoutMultiple;
    }
    return 1.05;
  }

  /**
   * ✅ PLACE TRADE (OFF-CHAIN)
   * Complete trade placement with off-chain pricing
   * Only store minimal data on-chain for efficiency
   */
  public async placeTrade(
    userPrincipal: string,
    optionType: 'call' | 'put',
    strikeOffset: number,
    expiry: string,
    contractCount: number,
    _backendCanister?: any,
    _isDemoMode: boolean = false,
  ): Promise<{
    success: boolean;
    positionId?: number;
    quotedPayoutMultiple?: number;
    entryPrice?: number;
    error?: string;
  }> {
    try {
      const currentPrice = this.getCurrentPrice();
      if (currentPrice === 0) {
        throw new Error('Price feed not available');
      }

      const strikePrice = this.calculateStrikePrice(currentPrice, strikeOffset, optionType);

      let quotedPayoutMultiple: number | undefined;
      if (isSupportedTenor(expiry)) {
        quotedPayoutMultiple = pricingService.quote({
          optionType,
          spotUSD: currentPrice,
          strikeOffsetUSD: strikeOffset,
          tenor: expiry as Tenor,
          contracts: contractCount,
        }).payoutMultiple;
      }

      const partner = getPartnerExchange();
      this.placeSequence += 1;
      const result = await partner.placeTicket({
        userId: userPrincipal,
        optionType,
        strikeOffsetUSD: strikeOffset,
        tenor: expiry,
        contracts: contractCount,
        entryPriceUSD: new Decimal(currentPrice),
        strikePriceUSD: new Decimal(strikePrice),
        premiumUSD: new Decimal(this.calculatePremium(contractCount)),
        idempotencyKey: `place:${userPrincipal}:${Date.now()}:${this.placeSequence}`,
      });

      if ('ok' in result) {
        return {
          success: true,
          positionId: result.ok.id,
          quotedPayoutMultiple,
          entryPrice: currentPrice,
        };
      }
      return { success: false, error: result.err };
    } catch (error) {
      console.error('Off-chain trade placement failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * ✅ CALCULATE TRADE COST
   * Calculate total cost for trade
   */
  public calculateTradeCost(contractCount: number, btcPrice: number): number {
    const premiumUSD = this.calculatePremium(contractCount);
    return premiumUSD / btcPrice; // Convert to BTC
  }

  /**
   * ✅ VALIDATE TRADE
   * Validate trade parameters
   */
  public validateTrade(tradeData: TradeData, userBalance: number, btcPrice: number): {
    valid: boolean;
    error?: string;
    tradeCost: number;
  } {
    const tradeCost = this.calculateTradeCost(tradeData.contractCount, btcPrice);
    
    if (tradeCost > userBalance) {
      return {
        valid: false,
        error: `Insufficient balance. Required: ${tradeCost.toFixed(8)} BTC`,
        tradeCost
      };
    }
    
    if (tradeData.contractCount < 1 || tradeData.contractCount > 1000) {
      return {
        valid: false,
        error: 'Contract count must be between 1 and 1000',
        tradeCost
      };
    }
    
    if (tradeData.strikeOffset < 0.01 || tradeData.strikeOffset > 1000) {
      return {
        valid: false,
        error: 'Strike offset must be between $0.01 and $1000',
        tradeCost
      };
    }
    
    return {
      valid: true,
      tradeCost
    };
  }

  /**
   * Connection status from the consumer's perspective: true when *any*
   * source (WebSocket or REST) has emitted a tick within the last 5 s.
   * The chart uses this to decide whether to render the "offline" badge.
   */
  public isPriceFeedConnected(): boolean {
    return Date.now() - this.lastTickAt < 5_000;
  }

  /** Name of the source that emitted the most recent tick. */
  public getActiveSource(): string {
    return this.currentSource;
  }

  /**
   * ✅ RECORD SETTLEMENT (BACKEND)
   * Send settlement result to backend for recording only
   * Backend just stores the result - no complex calculations
   */
  public async recordSettlement(
    positionId: number,
    settlementResult: SettlementResult,
    _backendCanister?: any,
    _userPrincipal?: string,
  ): Promise<void> {
    const outcome = settlementResult.outcome || 'loss';
    const partner = getPartnerExchange();
    this.settleSequence += 1;
    const result = await partner.settleTicket({
      ticketId: positionId,
      outcome,
      payoutUSD: new Decimal(settlementResult.payout),
      profitUSD: new Decimal(Math.max(0, settlementResult.profit)),
      finalPriceUSD: new Decimal(settlementResult.finalPrice),
      idempotencyKey: `settle:${positionId}:${this.settleSequence}`,
    });
    if ('err' in result) throw new Error(result.err);
  }

  /**
   * ✅ DISCONNECT
   * Clean up WebSocket connection
   */
  public disconnect(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    if (this.restPollTimer) {
      clearInterval(this.restPollTimer);
      this.restPollTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.isDisposed = true;
    this.isConnected = false;
    this.listeners = [];
  }
}

// ✅ SINGLETON INSTANCE
export const pricingEngine = new OffChainPricingEngine();
