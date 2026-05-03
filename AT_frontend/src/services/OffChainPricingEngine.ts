/**
 * ✅ OFF-CHAIN PRICING ENGINE
 * Following odin.fun pattern: All pricing logic moved from backend to frontend
 * This eliminates the need for a price oracle canister and provides instant calculations
 */

import { Decimal } from 'decimal.js';
import { getPartnerExchange } from './partner';

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
      console.log('🔌 Connecting to Coinbase WebSocket feed...');
      
      this.wsConnection = new WebSocket('wss://ws-feed.exchange.coinbase.com');
      
      this.wsConnection.onopen = () => {
        console.log('✅ Connected to Coinbase WebSocket');
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
        console.log('🔌 WebSocket connection closed');
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
      
      // Store price history
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
        console.log(`📊 Price update: $${previousPrice.toFixed(2)} → $${currentPrice.toFixed(2)}`);
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
      
      console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
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
   * ✅ CALCULATE SETTLEMENT (OFF-CHAIN)
   * Fast, accurate settlement using proper payout tables
   * This replaces the slow backend settlement with instant off-chain calculation
   */
  public calculateSettlement(
    optionType: 'call' | 'put',
    strikeOffset: number,
    expiry: string,
    finalPrice: number,
    entryPrice: number,
    contractCount: number = 1
  ): SettlementResult {
    // ✅ FIXED: Calculate strike price from REAL entry price and offset
    const strikePrice = optionType === 'call' 
      ? entryPrice + strikeOffset 
      : entryPrice - strikeOffset;
    
    // ✅ FIXED: Determine win/loss using correct strike price
    const isWin = optionType === 'call' 
      ? finalPrice > strikePrice 
      : finalPrice < strikePrice;
    
    const isTie = Math.abs(finalPrice - strikePrice) < 0.005; // 0.5 cent tolerance
    
    let outcome: 'win' | 'loss' | 'tie' = 'loss';
    let payout = 0;
    let profit = -1.0; // Default to losing the $1 entry premium
    
    if (isTie) {
      outcome = 'tie';
      payout = 1.0 * contractCount; // ✅ FIXED: Refund entry cost for all contracts
      profit = 0.0; // No profit/loss
    } else if (isWin) {
      outcome = 'win';
      
      // ✅ USE CORRECT PAYOUT TABLES (matching backend)
      const PAYOUT_TABLE: Record<string, Record<number, number>> = {
        '5s': { 2.5: 3.33, 5: 4.00, 10: 10.00, 15: 20.00 },
        '10s': { 2.5: 2.86, 5: 3.33, 10: 6.67, 15: 13.33 },
        '15s': { 2.5: 2.50, 5: 2.86, 10: 5.00, 15: 10.00 }
      };
      
      // Get payout from table (per contract)
      const tablePayoutPerContract = PAYOUT_TABLE[expiry]?.[strikeOffset] || 0;
      payout = tablePayoutPerContract * contractCount; // ✅ FIXED: Multiply by contract count
      profit = payout - (1.0 * contractCount); // ✅ FIXED: Net profit = total payout - total entry cost
    } else {
      outcome = 'loss';
      payout = 0;
      profit = -1.0 * contractCount; // ✅ FIXED: Lose the entry premium for all contracts
    }
    
    console.log('🎯 Off-chain settlement calculation:', {
      optionType,
      strikeOffset,
      expiry,
      entryPrice,
      strikePrice,
      finalPrice,
      isWin,
      isTie,
      outcome,
      payout,
      profit
    });
    
    return {
      outcome,
      payout,
      profit,
      finalPrice,
      strikePrice
    };
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
    _isDemoMode: boolean = false
  ): Promise<{ success: boolean; positionId?: number; error?: string }> {
    try {
      const currentPrice = this.getCurrentPrice();
      if (currentPrice === 0) {
        throw new Error('Price feed not available');
      }

      const strikePrice = this.calculateStrikePrice(currentPrice, strikeOffset, optionType);
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
        return { success: true, positionId: result.ok.id };
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
