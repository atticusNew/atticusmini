/**
 * External Price Service
 * Fetches historical Bitcoin price data from external APIs
 * Provides fallback mechanisms for reliability
 */

export interface HistoricalPricePoint {
  timestamp: number;
  price: number;
  high?: number;
  low?: number;
  volume?: number;
}

export interface ExternalPriceService {
  fetchHistoricalData(minutes: number): Promise<HistoricalPricePoint[]>;
}

class ExternalPriceServiceImpl implements ExternalPriceService {
  private cache = new Map<string, { data: HistoricalPricePoint[]; timestamp: number }>();
  private readonly CACHE_DURATION = 60000; // 1 minute cache

  /**
   * Fetch historical data with multiple fallback sources
   */
  async fetchHistoricalData(minutes: number): Promise<HistoricalPricePoint[]> {
    const cacheKey = `historical_${minutes}`;
    const cached = this.cache.get(cacheKey);
    
    // Return cached data if still fresh
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('📊 Using cached historical data for', minutes, 'minutes');
      return cached.data;
    }

    console.log('📊 Fetching fresh historical data for', minutes, 'minutes');

    try {
      // Try Coinbase API first (best quality, same source as real-time)
      const data = await this.fetchCoinbaseHistorical(minutes);
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.warn('❌ Coinbase API failed, trying Binance...', error);
      
      try {
        // Fallback to Binance API
        const data = await this.fetchBinanceHistorical(minutes);
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      } catch (error) {
        console.warn('❌ Binance API failed, trying CoinGecko...', error);
        
        try {
          // Final fallback to CoinGecko
          const data = await this.fetchCoinGeckoHistorical(minutes);
          this.cache.set(cacheKey, { data, timestamp: Date.now() });
          return data;
        } catch (error) {
          console.error('❌ All external APIs failed:', error);
          throw new Error('Unable to fetch historical data from any source');
        }
      }
    }
  }

  /**
   * Fetch from Coinbase Advanced Trade API (Primary source)
   */
  private async fetchCoinbaseHistorical(minutes: number): Promise<HistoricalPricePoint[]> {
    const granularity = this.getCoinbaseGranularity(minutes);
    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    
    // Use a CORS proxy for Coinbase API
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const coinbaseUrl = `https://api.exchange.coinbase.com/products/BTC-USD/candles?start=${startTime}&end=${endTime}&granularity=${granularity}`;
    
    const response = await fetch(proxyUrl + encodeURIComponent(coinbaseUrl));
    
    if (!response.ok) {
      throw new Error(`Coinbase API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid Coinbase API response');
    }
    
    return data.map(([time, low, high, _open, close, volume]) => ({
      timestamp: time * 1000, // Convert to milliseconds
      price: close,
      high,
      low,
      volume
    })).sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Fetch from Binance API (Fallback)
   */
  private async fetchBinanceHistorical(minutes: number): Promise<HistoricalPricePoint[]> {
    const interval = this.getBinanceInterval(minutes);
    const endTime = Date.now();
    const startTime = endTime - (minutes * 60 * 1000);
    
    // Use a CORS proxy for Binance API
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&startTime=${startTime}&endTime=${endTime}`;
    
    const response = await fetch(proxyUrl + encodeURIComponent(binanceUrl));
    
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid Binance API response');
    }
    
    return data.map(([openTime, _open, high, low, close, volume]) => ({
      timestamp: openTime,
      price: parseFloat(close),
      high: parseFloat(high),
      low: parseFloat(low),
      volume: parseFloat(volume)
    })).sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Fetch from CoinGecko API (Final fallback)
   */
  private async fetchCoinGeckoHistorical(minutes: number): Promise<HistoricalPricePoint[]> {
    const days = Math.max(1, Math.ceil(minutes / (24 * 60))); // Convert to days, minimum 1
    const interval = minutes <= 60 ? 'hourly' : 'daily';
    
    // Use a CORS proxy for CoinGecko API
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const coinGeckoUrl = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=${interval}`;
    
    const response = await fetch(proxyUrl + encodeURIComponent(coinGeckoUrl));
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.prices || !Array.isArray(data.prices)) {
      throw new Error('Invalid CoinGecko API response');
    }
    
    // Filter data to only include the requested time range
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    
    return data.prices
      .map(([timestamp, price]: [number, number]) => ({
        timestamp,
        price
      }))
      .filter((point: HistoricalPricePoint) => point.timestamp >= cutoffTime)
      .sort((a: HistoricalPricePoint, b: HistoricalPricePoint) => a.timestamp - b.timestamp);
  }

  /**
   * Get appropriate granularity for Coinbase API
   */
  private getCoinbaseGranularity(minutes: number): number {
    if (minutes <= 5) return 60;      // 1 minute candles
    if (minutes <= 15) return 300;    // 5 minute candles
    if (minutes <= 60) return 900;    // 15 minute candles
    return 3600;                      // 1 hour candles
  }

  /**
   * Get appropriate interval for Binance API
   */
  private getBinanceInterval(minutes: number): string {
    if (minutes <= 5) return '1m';
    if (minutes <= 15) return '5m';
    if (minutes <= 60) return '15m';
    return '1h';
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const externalPriceService = new ExternalPriceServiceImpl();
