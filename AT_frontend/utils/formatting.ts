import { Decimal } from 'decimal.js';

/**
 * Production Formatting Utilities
 */

/**
 * Bitcoin Amount Formatting
 */
export const formatBitcoinAmount = (
  amount: number | string | Decimal,
  precision: number = 8,
  showUnit: boolean = true
): string => {
  const decimal = amount instanceof Decimal ? amount : new Decimal(amount);
  const formatted = decimal.toFixed(precision);
  return showUnit ? `${formatted} BTC` : formatted;
};

/**
 * USD Currency Formatting
 */
export const formatUSD = (
  amount: number,
  precision: number = 2,
  showSymbol: boolean = true
): string => {
  const symbol = showSymbol ? '$' : '';
  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  })}`;
};

/**
 * Percentage Formatting
 */
export const formatPercentage = (
  value: number,
  precision: number = 2,
  showSign: boolean = true
): string => {
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(precision)}%`;
};

/**
 * Bitcoin Address Formatting (for display)
 */
export const formatBitcoinAddress = (
  address: string,
  startChars: number = 8,
  endChars: number = 8
): string => {
  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

/**
 * Time Formatting
 */
export const formatTimestamp = (
  timestamp: number,
  includeTime: boolean = true
): string => {
  const date = new Date(timestamp);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.second = '2-digit';
  }
  
  return date.toLocaleDateString('en-US', options);
};

/**
 * Duration Formatting (for expiry times)
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

/**
 * Order ID Formatting
 */
export const formatOrderId = (orderId: number | string): string => {
  const id = typeof orderId === 'number' ? orderId.toString() : orderId;
  return `#${id.padStart(6, '0')}`;
};

/**
 * Price Change Formatting
 */
export const formatPriceChange = (
  current: number,
  previous: number,
  showCurrency: boolean = true
): { 
  absolute: string; 
  percentage: string; 
  isPositive: boolean 
} => {
  const absoluteChange = current - previous;
  const percentageChange = ((absoluteChange / previous) * 100);
  const isPositive = absoluteChange >= 0;
  
  const sign = isPositive ? '+' : '';
  const currencySymbol = showCurrency ? '$' : '';
  
  return {
    absolute: `${sign}${currencySymbol}${Math.abs(absoluteChange).toFixed(2)}`,
    percentage: `${sign}${percentageChange.toFixed(2)}%`,
    isPositive
  };
};

/**
 * Large Number Formatting
 */
export const formatLargeNumber = (
  num: number,
  precision: number = 1
): string => {
  const units = [
    { threshold: 1e9, suffix: 'B' },
    { threshold: 1e6, suffix: 'M' },
    { threshold: 1e3, suffix: 'K' }
  ];
  
  for (const unit of units) {
    if (Math.abs(num) >= unit.threshold) {
      return `${(num / unit.threshold).toFixed(precision)}${unit.suffix}`;
    }
  }
  
  return num.toFixed(precision);
};
