import { Decimal } from 'decimal.js';

/**
 * Production Option Payout Calculation
 * For micro-expiry Bitcoin options (5s, 10s, 15s)
 */
export const calculateOptionPayout = (
  strikePrice: number,
  currentPrice: number,
  optionType: 'call' | 'put',
  expiry: string,
  contracts: number
): { payout: number; isWinning: boolean; multiplier: number } => {
  
  // Determine if option is in-the-money
  const isWinning = optionType === 'call'
    ? (currentPrice > strikePrice)
    : (currentPrice < strikePrice);

  if (!isWinning) {
    return { payout: 0, isWinning: false, multiplier: 0 };
  }

  // Calculate price difference range
  const priceDiff = Math.abs(strikePrice - currentPrice);
  const percentageDiff = (priceDiff / currentPrice) * 100;

  // Production payout multipliers based on risk/reward
  let payoutMultiplier = 0;

  if (percentageDiff <= 0.01) { // Deep ITM (0.01% or less)
    payoutMultiplier = expiry === '5s' ? 1.85 : expiry === '10s' ? 1.75 : 1.65;
  } else if (percentageDiff <= 0.05) { // Close ITM (0.01% - 0.05%)
    payoutMultiplier = expiry === '5s' ? 2.25 : expiry === '10s' ? 2.10 : 1.95;
  } else if (percentageDiff <= 0.1) { // Mild ITM (0.05% - 0.1%)
    payoutMultiplier = expiry === '5s' ? 3.50 : expiry === '10s' ? 3.00 : 2.50;
  } else if (percentageDiff <= 0.2) { // Moderate ITM (0.1% - 0.2%)
    payoutMultiplier = expiry === '5s' ? 5.00 : expiry === '10s' ? 4.00 : 3.20;
  } else if (percentageDiff <= 0.5) { // Far ITM (0.2% - 0.5%)
    payoutMultiplier = expiry === '5s' ? 8.00 : expiry === '10s' ? 6.50 : 5.00;
  } else { // Very far ITM (>0.5%)
    payoutMultiplier = expiry === '5s' ? 15.00 : expiry === '10s' ? 12.00 : 8.50;
  }

  const totalPayout = payoutMultiplier * contracts;

  return { 
    payout: totalPayout, 
    isWinning: true, 
    multiplier: payoutMultiplier 
  };
};

/**
 * Premium Calculation for Option Pricing
 */
export const calculateOptionPremium = (
  strikePrice: number,
  currentPrice: number,
  optionType: 'call' | 'put',
  expiry: string,
  contracts: number,
  volatility: number = 0.8
): number => {
  
  // Base premium calculation
  const moneyness = Math.abs(strikePrice - currentPrice) / currentPrice;
  
  // Time value based on expiry
  const timeValue = expiry === '5s' ? 0.001 : expiry === '10s' ? 0.002 : 0.003;
  
  // Intrinsic value
  const intrinsicValue = optionType === 'call' 
    ? Math.max(0, currentPrice - strikePrice)
    : Math.max(0, strikePrice - currentPrice);
  
  // Calculate premium using simplified Black-Scholes approximation
  const extrinsicValue = currentPrice * volatility * Math.sqrt(timeValue) * (1 + moneyness);
  
  const totalPremium = (intrinsicValue + extrinsicValue) * contracts;
  
  // Minimum premium to cover platform costs
  const minPremium = 0.50 * contracts; // $0.50 per contract minimum
  
  return Math.max(totalPremium, minPremium);
};

/**
 * Profit/Loss Calculation for Positions
 */
export const calculatePnL = (
  entryPrice: number,
  currentPrice: number,
  size: number,
  isLong: boolean = true
): { pnl: number; pnlPercentage: number } => {
  
  const priceDiff = currentPrice - entryPrice;
  const pnl = isLong ? priceDiff * size : -priceDiff * size;
  const pnlPercentage = (pnl / (entryPrice * size)) * 100;
  
  return { pnl, pnlPercentage };
};

/**
 * Fee Calculation for Custodial Operations
 */
export const calculateTransactionFee = (
  amount: number,
  feeType: 'deposit' | 'withdrawal' | 'trade'
): { fee: number; netAmount: number } => {
  
  let feeRate = 0;
  let minFee = 0;
  let maxFee = 0;
  
  switch (feeType) {
    case 'deposit':
      feeRate = 0.001; // 0.1% deposit fee
      minFee = 0.00001; // 1,000 sats minimum
      maxFee = 0.01; // 0.01 BTC maximum
      break;
    case 'withdrawal':
      feeRate = 0.002; // 0.2% withdrawal fee
      minFee = 0.0001; // Network fee coverage
      maxFee = 0.02; // 0.02 BTC maximum
      break;
    case 'trade':
      feeRate = 0.005; // 0.5% trading fee
      minFee = 0.000001; // 100 sats minimum
      maxFee = 0.001; // 0.001 BTC maximum
      break;
  }
  
  let fee = amount * feeRate;
  fee = Math.max(fee, minFee);
  fee = Math.min(fee, maxFee);
  
  const netAmount = amount - fee;
  
  return { fee, netAmount };
};

/**
 * Risk Management Calculations
 */
export const calculateRiskMetrics = (
  positions: Array<{
    size: number;
    strikePrice: number;
    currentPrice: number;
    optionType: 'call' | 'put';
    premium: number;
  }>,
  accountBalance: number
): {
  totalExposure: number;
  maxLoss: number;
  riskPercentage: number;
  marginRequired: number;
} => {
  
  let totalExposure = 0;
  let maxLoss = 0;
  
  positions.forEach(position => {
    const exposure = position.size * position.premium;
    totalExposure += exposure;
    maxLoss += position.premium; // Max loss is premium paid
  });
  
  const riskPercentage = (maxLoss / accountBalance) * 100;
  const marginRequired = totalExposure * 0.1; // 10% margin requirement
  
  return {
    totalExposure,
    maxLoss,
    riskPercentage,
    marginRequired
  };
};

/**
 * Decimal Precision Helper
 */
export const formatBitcoinAmount = (amount: number, precision: number = 8): string => {
  return new Decimal(amount).toFixed(precision);
};

/**
 * Currency Formatting
 */
export const formatCurrency = (amount: number, currency: 'USD' | 'BTC' = 'USD'): string => {
  if (currency === 'BTC') {
    return `${formatBitcoinAmount(amount)} BTC`;
  }
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Time to Expiry Calculation
 */
export const calculateTimeToExpiry = (expiryString: string): number => {
  const timeMap: { [key: string]: number } = {
    '5s': 5000,   // 5 seconds in milliseconds
    '10s': 10000, // 10 seconds in milliseconds
    '15s': 15000  // 15 seconds in milliseconds
  };
  
  return timeMap[expiryString] || 0;
};

/**
 * Volatility Calculation (simplified)
 */
export const calculateImpliedVolatility = (
  priceHistory: number[],
  windowSize: number = 20
): number => {
  if (priceHistory.length < 2) return 0.8; // Default volatility
  
  const returns: number[] = [];
  for (let i = 1; i < priceHistory.length; i++) {
    const returnValue = Math.log(priceHistory[i] / priceHistory[i - 1]);
    returns.push(returnValue);
  }
  
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  const volatility = Math.sqrt(variance * 365 * 24 * 60 * 60); // Annualized volatility
  
  return Math.max(0.1, Math.min(2.0, volatility)); // Cap between 10% and 200%
};
