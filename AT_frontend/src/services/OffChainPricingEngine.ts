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

  constructor() {
    this.connectToPriceFeed();
  }

  /**
   * ✅ CONNECT TO REAL-TIME PRICE FEED
   * Using Coinbase WebSocket for live Bitcoin prices
   */
  private connectToPriceFeed(): void {
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
   * ✅ HANDLE PRICE UPDATES
   * Process real-time price data and notify listeners
   */
  private handlePriceUpdate(data: any): void {
    const currentPrice = parseFloat(data.price);
    
    if (currentPrice > 0) {
      const timestamp = Date.now();
      const previousPrice = this.currentPrice;
      this.currentPrice = currentPrice;

      realizedVolatility.observe(currentPrice, timestamp);

      this.priceHistory.push({ timestamp, price: currentPrice });
      
      // Keep only last 1000 prices to prevent memory issues
      if (this.priceHistory.length > 1000) {
        this.priceHistory = this.priceHistory.slice(-1000);
      }
      
      const priceChange = {
        amount: previousPrice > 0 ? currentPrice - previousPrice : 0,
        percentage: previousPrice > 0 ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0
      };

      const priceData: PriceData = {
        current: currentPrice,
        price: currentPrice,
        timestamp,
        isValid: true,
        change: priceChange,
        source: 'coinbase_websocket',
        volume: parseFloat(data.last_size || '0'),
        high: parseFloat(data.high_24h || currentPrice.toString()),
        low: parseFloat(data.low_24h || currentPrice.toString())
      };

      // Notify all listeners
      this.listeners.forEach(callback => {
        try {
          callback(priceData);
        } catch (error) {
          console.error('❌ Error in price update callback:', error);
        }
      });

      // Log significant price changes
      const priceDifference = Math.abs(currentPrice - previousPrice);
      if (priceDifference >= 0.01) {
      }
    }
  }

  /**
   * ✅ HANDLE RECONNECTION
   * Automatic reconnection with exponential backoff
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      
      setTimeout(() => {
        this.connectToPriceFeed();
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached. Price feed unavailable.');
    }
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
   * ✅ GET CONNECTION STATUS
   * Check if price feed is connected
   */
  public isPriceFeedConnected(): boolean {
    return this.isConnected;
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
    this.isConnected = false;
    this.listeners = [];
  }
}

// ✅ SINGLETON INSTANCE
export const pricingEngine = new OffChainPricingEngine();
