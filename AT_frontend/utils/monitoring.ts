/**
 * Production Monitoring & Logging Utilities
 * For custodial Bitcoin options platform
 */

export interface TradeEvent {
  userId: string;
  orderId: number;
  optionType: 'call' | 'put';
  strikePrice: number;
  currentPrice: number;
  expiry: string;
  contracts: number;
  premium: number;
  timestamp: number;
}

export interface SystemMetrics {
  activeUsers: number;
  openPositions: number;
  totalVolume24h: number;
  platformBalance: number;
  uptime: number;
  latency: number;
}

/**
 * Trade Execution Monitoring
 */
export const logTradeExecution = (event: TradeEvent): void => {
  const logEntry = {
    type: 'TRADE_EXECUTION',
    timestamp: Date.now(),
    data: event,
    environment: 'production'
  };
  
  console.log('🚀 Trade Executed:', JSON.stringify(logEntry));
  
  // In production, send to monitoring service
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'trade_executed', {
      option_type: event.optionType,
      expiry: event.expiry,
      contracts: event.contracts,
      value: event.premium
    });
  }
};

/**
 * Error Tracking
 */
export const logError = (
  error: Error, 
  context: string, 
  userId?: string
): void => {
  const errorEntry = {
    type: 'ERROR',
    timestamp: Date.now(),
    message: error.message,
    stack: error.stack,
    context,
    userId,
    environment: 'production'
  };
  
  console.error('❌ Platform Error:', JSON.stringify(errorEntry));
  
  // In production, send to error tracking service
  // Example: Sentry, LogRocket, etc.
};

/**
 * Performance Monitoring
 */
export const measurePerformance = (
  operationName: string,
  startTime: number
): number => {
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  const perfEntry = {
    type: 'PERFORMANCE',
    operation: operationName,
    duration: Math.round(duration),
    timestamp: Date.now()
  };
  
  console.log('⏱️ Performance:', JSON.stringify(perfEntry));
  
  return duration;
};

/**
 * System Health Check
 */
export const checkSystemHealth = (): SystemMetrics => {
  const metrics: SystemMetrics = {
    activeUsers: 0, // Would be fetched from backend
    openPositions: 0, // Would be fetched from backend
    totalVolume24h: 0, // Would be fetched from backend
    platformBalance: 0, // Would be fetched from backend
    uptime: performance.now(),
    latency: 0 // Would measure actual latency
  };
  
  console.log('📊 System Health:', JSON.stringify(metrics));
  
  return metrics;
};

/**
 * Risk Monitoring
 */
export const monitorRiskLimits = (
  totalExposure: number,
  maxRiskLimit: number
): { withinLimits: boolean; utilizationPercentage: number } => {
  const utilizationPercentage = (totalExposure / maxRiskLimit) * 100;
  const withinLimits = utilizationPercentage <= 80; // 80% threshold
  
  if (!withinLimits) {
    logError(
      new Error(`Risk limit exceeded: ${utilizationPercentage.toFixed(2)}%`),
      'RISK_MONITORING'
    );
  }
  
  return { withinLimits, utilizationPercentage };
};

/**
 * WebSocket Connection Monitoring
 */
export const monitorWebSocketHealth = (
  connectionState: 'connected' | 'disconnected' | 'reconnecting'
): void => {
  const wsEntry = {
    type: 'WEBSOCKET_STATUS',
    state: connectionState,
    timestamp: Date.now()
  };
  
  console.log('🔗 WebSocket Status:', JSON.stringify(wsEntry));
};
