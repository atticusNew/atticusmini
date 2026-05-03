/**
 * ✅ ENHANCED BEST ODDS PREDICTOR - Hybrid Optimized Approach
 * Combines real backend statistics with live market analysis
 * Uses simplified but effective mathematical techniques
 * 
 * VERSION: 2.0.0 - Real backend statistics integration
 * LAST UPDATED: 2025-01-18
 */

export interface TradeRecommendation {
  optionType: 'call' | 'put';
  expiry: string;
  strikeOffset: number;
  winRate: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  sampleSize?: number; // Number of real trades used
  
  // ✅ NEW: Calculation breakdown for transparency
  breakdown?: {
    baseRate: number;              // Original win rate before adjustments
    volatilityAdjustment: number;  // Adjustment from volatility (can be + or -)
    trendBonus: number;            // Bonus from trend strength
    defaultPenalty: number;        // Penalty when using defaults (0 if real data)
    finalRate: number;             // Final calculated rate (before cap)
    cappedRate: number;            // Final rate after 72% cap
  };
  
  // ✅ NEW: Market conditions at time of recommendation
  marketConditions?: {
    volatility: number;            // Current market volatility %
    volatilityStatus: 'low' | 'medium' | 'high';
    trendDirection: 'up' | 'down' | 'neutral';
    trendStrength: number;         // 0-1 scale
    trendConfidence: number;       // 0-1 scale
  };
  
  // ✅ NEW: Data source information
  dataSource?: {
    type: 'real' | 'smoothed' | 'default';
    lastUpdated?: number;          // Timestamp of last stats fetch
    cacheAge?: number;             // Age of cached data in ms
  };
}

export interface PricePoint {
  timestamp: number;
  price: number;
}

interface EnhancedTrendData {
  direction: 'up' | 'down' | 'neutral';
  strength: number;      // 0-1 strength score
  confidence: number;    // 0-1 confidence score
  volatility: number;    // Market volatility (percentage)
}

interface TradeStats {
  expiry: string;
  strike_offset: number;
  option_type: string;
  total_trades: number;
  wins: number;
  losses: number;
  ties: number;
  win_rate: number;
  last_updated: number;
}

export class EnhancedBestOddsPredictor {
  private readonly VERSION = '2.0.0'; // Track version for cache busting
  private priceHistory: PricePoint[] = [];
  private readonly MAX_HISTORY = 200; // Increased from 50 to 200
  private volatilityEWMA: number = 0;
  private readonly LAMBDA = 0.94; // EWMA decay factor
  private isVolatilityInitialized = false;
  
  // Real statistics from backend (cached)
  private realStatistics: Map<string, TradeStats> = new Map();
  private lastStatsFetch: number = 0;
  private readonly STATS_CACHE_TIME = 30000; // 30 seconds cache
  
  constructor() {
    console.log(`🎯 BestOddsPredictor v${this.VERSION} initialized`);
  }
  
  // ✅ REALISTIC default win rates (based on binary options baseline ~50%)
  private readonly DEFAULT_WIN_RATES = {
    '5s': { 2.5: 0.48, 5: 0.46, 10: 0.40, 15: 0.32 },
    '10s': { 2.5: 0.50, 5: 0.48, 10: 0.43, 15: 0.36 },
    '15s': { 2.5: 0.52, 5: 0.50, 10: 0.45, 15: 0.38 }
  };

  // Reference to backend service (injected)
  private backendService: any = null;

  /**
   * ✅ INITIALIZE WITH BACKEND SERVICE
   */
  public initializeBackendService(service: any): void {
    this.backendService = service;
    console.log('✅ Backend service initialized for Best Odds');
  }

  /**
   * ✅ UPDATE PRICE DATA
   * Called on each price tick to maintain real-time analysis
   */
  public updatePrice(price: number): void {
    const now = Date.now();
    
    // Calculate return if we have previous price
    if (this.priceHistory.length > 0) {
      const prevPrice = this.priceHistory[this.priceHistory.length - 1].price;
      const priceReturn = Math.log(price / prevPrice);
      this.updateVolatilityEWMA(priceReturn);
    }
    
    // Add new price point
    this.priceHistory.push({ timestamp: now, price });
    
    // Keep only recent history (200 points)
    if (this.priceHistory.length > this.MAX_HISTORY) {
      this.priceHistory = this.priceHistory.slice(-this.MAX_HISTORY);
    }
  }

  /**
   * ✅ EWMA VOLATILITY CALCULATION
   * Updates volatility using exponentially weighted moving average
   */
  private updateVolatilityEWMA(currentReturn: number): void {
    const returnSquared = currentReturn * currentReturn;
    
    if (!this.isVolatilityInitialized) {
      this.volatilityEWMA = returnSquared;
      this.isVolatilityInitialized = true;
    } else {
      // EWMA formula: σ²ₜ = λσ²ₜ₋₁ + (1-λ)r²ₜ
      this.volatilityEWMA = this.LAMBDA * this.volatilityEWMA + 
                            (1 - this.LAMBDA) * returnSquared;
    }
  }

  /**
   * ✅ GET CURRENT VOLATILITY
   * Returns volatility as percentage
   */
  private getVolatility(): number {
    if (!this.isVolatilityInitialized) return 0.3; // Default 30% volatility
    // Convert to percentage (not annualized for short-term trading)
    return Math.sqrt(this.volatilityEWMA) * 100;
  }

  /**
   * ✅ SIMPLIFIED TREND DETECTION
   * Uses weighted moving average instead of complex regression
   */
  private analyzeTrendSimplified(): EnhancedTrendData {
    if (this.priceHistory.length < 10) {
      return {
        direction: 'neutral',
        strength: 0,
        confidence: 0,
        volatility: this.getVolatility()
      };
    }

    const recent = this.priceHistory.slice(-15); // Last 15 points
    
    // 1. Simple weighted moving average (faster than regression)
    let weightedSum = 0;
    let weightSum = 0;
    recent.forEach((point, i) => {
      const weight = i + 1; // Linear weights (recent = higher weight)
      weightedSum += point.price * weight;
      weightSum += weight;
    });
    const wma = weightedSum / weightSum;
    const currentPrice = recent[recent.length - 1].price;
    
    // 2. Calculate volatility
    const prices = recent.map(p => p.price);
    const mean = prices.reduce((a, b) => a + b) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    const volatility = Math.sqrt(variance) / mean * 100; // Coefficient of variation
    
    // 3. Determine trend direction with dynamic threshold
    const percentChange = (currentPrice - recent[0].price) / recent[0].price;
    const threshold = Math.max(0.002, volatility * 0.5 / 100); // Dynamic threshold
    
    let direction: 'up' | 'down' | 'neutral' = 'neutral';
    if (percentChange > threshold) direction = 'up';
    else if (percentChange < -threshold) direction = 'down';
    
    // 4. Calculate strength and confidence
    const strength = Math.min(Math.abs(percentChange) / 0.01, 1.0);
    
    // Confidence based on consistency
    let consistentMoves = 0;
    for (let i = 1; i < recent.length; i++) {
      const move = recent[i].price - recent[i-1].price;
      if ((direction === 'up' && move > 0) || (direction === 'down' && move < 0)) {
        consistentMoves++;
      }
    }
    const confidence = consistentMoves / (recent.length - 1);
    
    return { direction, strength, confidence, volatility };
  }

  /**
   * ✅ FETCH REAL STATISTICS FROM BACKEND
   * Cached for 30 seconds to reduce backend calls
   */
  private async fetchRealStatistics(): Promise<void> {
    const now = Date.now();
    if (now - this.lastStatsFetch < this.STATS_CACHE_TIME) {
      return; // Use cached data
    }

    if (!this.backendService) {
      console.warn('⚠️ Backend service not initialized, using defaults');
      return;
    }

    try {
      console.log('🔄 Fetching real trade statistics from backend...');
      const stats = await this.backendService.get_trade_statistics();
      
      this.realStatistics.clear();
      
      // Convert backend format to our format
      for (const [key, stat] of stats) {
        const tradeStats: TradeStats = {
          expiry: stat.expiry,
          strike_offset: Number(stat.strike_offset),
          option_type: stat.option_type,
          total_trades: Number(stat.total_trades),
          wins: Number(stat.wins),
          losses: Number(stat.losses),
          ties: Number(stat.ties),
          win_rate: Number(stat.win_rate),
          last_updated: Number(stat.last_updated)
        };
        this.realStatistics.set(key, tradeStats);
        console.log(`📊 Stored stat: "${key}" → ${tradeStats.total_trades} trades, ${(tradeStats.win_rate * 100).toFixed(1)}% win rate`);
      }
      
      this.lastStatsFetch = now;
      console.log('✅ Fetched', stats.length, 'trade statistics entries');
      console.log('📋 All keys in cache:', Array.from(this.realStatistics.keys()));
    } catch (error) {
      console.warn('⚠️ Failed to fetch statistics, using defaults:', error);
    }
  }

  /**
   * ✅ GET WIN RATE WITH LAPLACE SMOOTHING
   * Uses real data > smoothed > default (in that order)
   */
  private getWinRate(expiry: string, strike: number, type: 'call' | 'put'): { rate: number; sampleSize: number } {
    const key = `${expiry}_${strike}_${type}`;
    const realStat = this.realStatistics.get(key);
    
    console.log(`🔍 Looking up: "${key}" → Found:`, realStat ? `${realStat.total_trades} trades` : 'NOT FOUND');

    if (realStat && realStat.total_trades >= 20) {
      // Use real data if we have enough trades
      console.log(`✅ Using REAL data for ${key}: ${realStat.total_trades} trades, ${(realStat.win_rate * 100).toFixed(1)}% win rate`);
      return { rate: realStat.win_rate, sampleSize: realStat.total_trades };
    } else if (realStat && realStat.total_trades >= 5) {
      // Use Laplace smoothing for small samples
      const smoothed = (realStat.wins + 1) / (realStat.wins + realStat.losses + 2);
      console.log(`⚠️ Using SMOOTHED data for ${key}: ${realStat.total_trades} trades, ${(smoothed * 100).toFixed(1)}% smoothed rate`);
      return { rate: smoothed, sampleSize: realStat.total_trades };
    } else if (realStat && realStat.total_trades > 0) {
      // Less than 5 trades but has some data - SHOW real count but use defaults
      console.log(`📊 Has ${realStat.total_trades} trades but < 5, showing count but using defaults`);
      const defaultRate = this.DEFAULT_WIN_RATES[expiry as keyof typeof this.DEFAULT_WIN_RATES]?.[strike] || 0.5;
      return { rate: defaultRate, sampleSize: realStat.total_trades }; // ✅ SHOW real count
    } else {
      // Fall back to improved defaults
      console.log(`❌ NO data for ${key}, using defaults`);
      const defaultRate = this.DEFAULT_WIN_RATES[expiry as keyof typeof this.DEFAULT_WIN_RATES]?.[strike] || 0.5;
      return { rate: defaultRate, sampleSize: 0 };
    }
  }

  /**
   * ✅ VOLATILITY-AWARE WIN RATE ADJUSTMENT
   * Adjusts predictions based on market conditions
   */
  private calculateVolatilityAdjustedWinRate(
    baseRate: number,
    trendStrength: number,
    volatility: number,
    sampleSize: number
  ): { 
    adjustedRate: number; 
    confidence: 'high' | 'medium' | 'low';
    breakdown: {
      volatilityAdjustment: number;
      trendBonus: number;
      defaultPenalty: number;
      finalRate: number;
      cappedRate: number;
    };
  } {
    
    // Sample size penalty for small datasets
    const samplePenalty = Math.min(1.0, sampleSize / 50); // Full confidence at 50+ trades
    
    // ✅ ADJUSTED: More conservative volatility curve (asymmetric: penalty > bonus)
    let volatilityMultiplier = 1.0;
    if (volatility < 0.3) {
      // Low volatility - more predictable (reduced from 15% to 6% max boost)
      volatilityMultiplier = 1.0 + (0.3 - volatility) * 0.2; // Up to +6% boost
    } else if (volatility > 0.6) {
      // High volatility - less predictable (increased from 12% to 20% max penalty)
      volatilityMultiplier = 1.0 - (volatility - 0.6) * 0.5; // Up to -20% penalty
    }

    // Trend strength bonus (strong trends are more reliable)
    const trendBonus = 1.0 + trendStrength * 0.1; // Up to +10% for strong trends

    // ✅ ADDED: Default penalty for when using non-real data
    const defaultPenalty = sampleSize > 0 ? samplePenalty : 0.85; // -15% for defaults

    // Combined adjustment
    let adjustedRate = baseRate * volatilityMultiplier * trendBonus * defaultPenalty;
    
    // Store pre-cap rate
    const finalRate = adjustedRate;
    
    // ✅ ADJUSTED: Lower cap to more realistic maximum (reduced from 85% to 72%)
    adjustedRate = Math.min(adjustedRate, 0.72); // Max 72% win rate

    // Confidence levels based on multiple factors - ✅ FIX: No low confidence for smart trades
    const confidenceScore = (volatilityMultiplier + (sampleSize > 0 ? samplePenalty : 0.5) + trendStrength) / 3;
    let confidence: 'high' | 'medium' | 'low';
    
    if (confidenceScore >= 0.7 && sampleSize >= 20) confidence = 'high';
    else confidence = 'medium'; // ✅ FIX: Minimum confidence is medium for smart trades

    // ✅ NEW: Return breakdown for transparency
    return { 
      adjustedRate, 
      confidence,
      breakdown: {
        volatilityAdjustment: (volatilityMultiplier - 1.0) * baseRate, // Absolute adjustment
        trendBonus: (trendBonus - 1.0) * baseRate, // Absolute bonus
        defaultPenalty: sampleSize > 0 ? 0 : (0.85 - 1.0) * baseRate, // Absolute penalty
        finalRate,
        cappedRate: adjustedRate
      }
    };
  }

  /**
   * ✅ GET BEST RECOMMENDATION
   * Main entry point - combines all improvements
   */
  public async getBestRecommendation(): Promise<TradeRecommendation> {
    if (this.priceHistory.length < 10) {
      const volatility = this.getVolatility();
      return {
        optionType: 'call',
        expiry: '15s',
        strikeOffset: 2.5,
        winRate: 0.70,
        confidence: 'medium',
        reasoning: 'Insufficient price data - using conservative defaults',
        sampleSize: 0,
        breakdown: {
          baseRate: 0.70,
          volatilityAdjustment: 0,
          trendBonus: 0,
          defaultPenalty: 0,
          finalRate: 0.70,
          cappedRate: 0.70
        },
        marketConditions: {
          volatility,
          volatilityStatus: volatility < 0.3 ? 'low' : volatility > 0.6 ? 'high' : 'medium',
          trendDirection: 'neutral',
          trendStrength: 0,
          trendConfidence: 0
        },
        dataSource: {
          type: 'default',
          lastUpdated: this.lastStatsFetch,
          cacheAge: Date.now() - this.lastStatsFetch
        }
      };
    }

    // 1. Fetch latest real statistics (cached)
    await this.fetchRealStatistics();

    // 2. Analyze current market trend
    const trend = this.analyzeTrendSimplified();

    // 3. Test all combinations with real + live data
    const expiries = ['5s', '10s', '15s'];
    const strikes = [2.5, 5, 10, 15];
    let bestOption: TradeRecommendation | null = null;
    let bestScore = 0;

    for (const expiry of expiries) {
      for (const strike of strikes) {
        // ✅ FIXED: Determine option type based on trend (no bonus here)
        let optionType: 'call' | 'put' = 'call';
        
        if (trend.direction === 'up') {
          optionType = 'call';
        } else if (trend.direction === 'down') {
          optionType = 'put';
        }

        // Get base win rate from real data or defaults
        const { rate: baseRate, sampleSize } = this.getWinRate(expiry, strike, optionType);
        
        // ✅ FIXED: Apply volatility and trend adjustments (trend applied once inside function)
        const { adjustedRate, confidence, breakdown } = this.calculateVolatilityAdjustedWinRate(
          baseRate,  // No trendBonus multiplication here
          trend.strength,
          trend.volatility,
          sampleSize
        );

        // Calculate composite score with EXTREME bias for real data
        let dataQualityMultiplier = 1.0;
        if (sampleSize >= 20) {
          dataQualityMultiplier = 20.0; // ✅ 20x multiplier for real data (20+ trades) - ALWAYS prefer
        } else if (sampleSize >= 5) {
          dataQualityMultiplier = 10.0; // ✅ 10x multiplier for smoothed data (5-19 trades)
        } else if (sampleSize > 0) {
          dataQualityMultiplier = 5.0; // ✅ 5x multiplier for some data (1-4 trades)
        } else {
          dataQualityMultiplier = 1.0; // ✅ No multiplier for defaults (heavily penalized)
        }
        
        const confidenceMultiplier = confidence === 'high' ? 1.2 : confidence === 'medium' ? 1.0 : 0.8;
        const score = adjustedRate * confidenceMultiplier * dataQualityMultiplier;
        
        console.log(`📊 Score for ${expiry} ${strike} ${optionType}: ${score.toFixed(3)} (rate=${adjustedRate.toFixed(3)}, data=${sampleSize} trades, quality=${dataQualityMultiplier}x)`);
        
        if (score > bestScore) {
          bestScore = score;
          
          let reasoning = sampleSize >= 20 
            ? `Based on ${sampleSize} real trades (${(baseRate * 100).toFixed(1)}% win rate)`
            : sampleSize >= 5
            ? `Based on ${sampleSize} trades with smoothing`
            : sampleSize > 0
            ? `${sampleSize} trades recorded (using improved defaults until 5+ trades)`
            : `Using improved defaults`;
          
          if (trend.direction !== 'neutral') {
            reasoning += ` + ${trend.direction === 'up' ? 'Uptrend' : 'Downtrend'} detected (${(trend.strength * 100).toFixed(0)}% strength)`;
          }
          
          reasoning += ` + Volatility: ${trend.volatility.toFixed(1)}%`;
          
          // ✅ DIAGNOSTIC: Log what we're setting
          console.log(`🎯 Setting best option: ${expiry} ${strike} ${optionType}, sampleSize=${sampleSize}, score=${score.toFixed(3)}`);

          bestOption = {
            optionType,
            expiry,
            strikeOffset: strike,
            winRate: adjustedRate,
            confidence,
            reasoning,
            sampleSize,
            // ✅ NEW: Add calculation breakdown
            breakdown: {
              baseRate,
              volatilityAdjustment: breakdown.volatilityAdjustment,
              trendBonus: breakdown.trendBonus,
              defaultPenalty: breakdown.defaultPenalty,
              finalRate: breakdown.finalRate,
              cappedRate: breakdown.cappedRate
            },
            // ✅ NEW: Add market conditions
            marketConditions: {
              volatility: trend.volatility,
              volatilityStatus: trend.volatility < 0.3 ? 'low' : trend.volatility > 0.6 ? 'high' : 'medium',
              trendDirection: trend.direction,
              trendStrength: trend.strength,
              trendConfidence: trend.confidence
            },
            // ✅ NEW: Add data source info
            dataSource: {
              type: sampleSize >= 20 ? 'real' : sampleSize >= 5 ? 'smoothed' : 'default',
              lastUpdated: this.lastStatsFetch,
              cacheAge: Date.now() - this.lastStatsFetch
            }
          };
        }
      }
    }

    return bestOption || this.getConservativeDefault();
  }

  /**
   * ✅ GET CONSERVATIVE DEFAULT
   * Fallback when no better option is found
   */
  private getConservativeDefault(): TradeRecommendation {
    const volatility = this.getVolatility();
    return {
      optionType: 'call',
      expiry: '15s',
      strikeOffset: 2.5,
      winRate: 0.70,
      confidence: 'medium',
      reasoning: 'Conservative default - longer expiry, small strike offset',
      sampleSize: 0,
      breakdown: {
        baseRate: 0.70,
        volatilityAdjustment: 0,
        trendBonus: 0,
        defaultPenalty: 0,
        finalRate: 0.70,
        cappedRate: 0.70
      },
      marketConditions: {
        volatility,
        volatilityStatus: volatility < 0.3 ? 'low' : volatility > 0.6 ? 'high' : 'medium',
        trendDirection: 'neutral',
        trendStrength: 0,
        trendConfidence: 0
      },
      dataSource: {
        type: 'default',
        lastUpdated: this.lastStatsFetch,
        cacheAge: Date.now() - this.lastStatsFetch
      }
    };
  }

  /**
   * ✅ GET CURRENT TREND INFO
   * Returns current market trend for display
   */
  public getTrendInfo(): { direction: string; strength: number; description: string } {
    const trend = this.analyzeTrendSimplified();
    
    let description = 'Market is stable';
    if (trend.direction === 'up') {
      description = `Uptrend detected (${(trend.strength * 100).toFixed(0)}% strength) - Favoring calls`;
    } else if (trend.direction === 'down') {
      description = `Downtrend detected (${(trend.strength * 100).toFixed(0)}% strength) - Favoring puts`;
    }
    
    return {
      direction: trend.direction,
      strength: trend.strength,
      description
    };
  }

  /**
   * ✅ RESET ANALYSIS
   * Clear history for fresh analysis
   */
  public reset(): void {
    this.priceHistory = [];
    this.volatilityEWMA = 0;
    this.isVolatilityInitialized = false;
  }
}

// Export singleton instance
export const bestOddsPredictor = new EnhancedBestOddsPredictor();
