import { Decimal } from 'decimal.js';

/**
 * Production Bitcoin Address Validation
 * Supports mainnet addresses only - no testnet
 */
export const validateBitcoinAddress = (address: string): boolean => {
  if (!address || typeof address !== 'string') return false;

  // P2PKH addresses (start with 1) - Legacy format
  const p2pkhRegex = /^1[A-HJ-NP-Z2-9]{25,34}$/;
  
  // P2SH addresses (start with 3) - Script hash format
  const p2shRegex = /^3[A-HJ-NP-Z2-9]{25,34}$/;
  
  // Bech32 addresses (start with bc1) - Native segwit
  const bech32Regex = /^bc1[a-z0-9]{39,59}$/;
  
  // Taproot addresses (start with bc1p) - Pay-to-Taproot
  const taprootRegex = /^bc1p[a-z0-9]{58}$/;

  return p2pkhRegex.test(address) || 
         p2shRegex.test(address) || 
         bech32Regex.test(address) || 
         taprootRegex.test(address);
};

/**
 * Custodial Trade Parameters Validation
 * Enhanced for micro-expiry Bitcoin options (5s, 10s, 15s)
 */
export const validateTradeParams = (params: {
  strikePrice: number;
  currentPrice: number;
  size: number;
  expiry: string;
  optionType: 'call' | 'put';
}): { valid: boolean; error?: string } => {
  const { strikePrice, currentPrice, size, expiry, optionType } = params;

  // Strike price validation
  if (strikePrice <= 0) {
    return { valid: false, error: 'Strike price must be positive' };
  }

  // Current price validation
  if (currentPrice <= 0) {
    return { valid: false, error: 'Current price must be positive' };
  }

  // Contract size validation (1-10 contracts max for risk management)
  if (!Number.isInteger(size) || size <= 0 || size > 10) {
    return { valid: false, error: 'Contract size must be 1-10 whole contracts' };
  }

  // Micro-expiry validation (only 5s, 10s, 15s supported)
  if (!['5s', '10s', '15s'].includes(expiry)) {
    return { valid: false, error: 'Invalid expiry. Must be 5s, 10s, or 15s' };
  }

  // Option type validation
  if (!['call', 'put'].includes(optionType)) {
    return { valid: false, error: 'Option type must be call or put' };
  }

  // Strike price range validation (max 10% from current price)
  const priceRange = Math.abs(strikePrice - currentPrice);
  const maxRange = currentPrice * 0.15; // 15% max deviation for micro-expiry

  if (priceRange > maxRange) {
    return { 
      valid: false, 
      error: `Strike price too far from current price. Max deviation: $${maxRange.toFixed(2)}` 
    };
  }

  // Minimum price difference validation (prevent dust trades)
  const minDifference = currentPrice * 0.0001; // 0.01% minimum
  if (priceRange < minDifference) {
    return { 
      valid: false, 
      error: 'Strike price too close to current price' 
    };
  }

  return { valid: true };
};

/**
 * Custodial Deposit Amount Validation
 */
export const validateDepositAmount = (amount: string | number): { valid: boolean; error?: string } => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount) || numAmount <= 0) {
    return { valid: false, error: 'Deposit amount must be a positive number' };
  }

  // Minimum deposit: 0.00001 BTC (1,000 satoshis)
  if (numAmount < 0.00001) {
    return { valid: false, error: 'Minimum deposit: 0.00001 BTC' };
  }

  // Maximum deposit: 10 BTC (risk management)
  if (numAmount > 10) {
    return { valid: false, error: 'Maximum deposit: 10 BTC' };
  }

  // Validate decimal precision (max 8 decimal places)
  const decimalStr = numAmount.toString();
  if (decimalStr.includes('.') && decimalStr.split('.')[1].length > 8) {
    return { valid: false, error: 'Maximum 8 decimal places allowed' };
  }

  return { valid: true };
};

/**
 * Custodial Withdrawal Validation
 */
export const validateWithdrawRequest = (params: {
  amount: string | number;
  address: string;
  availableBalance: number;
}): { valid: boolean; error?: string } => {
  const { amount, address, availableBalance } = params;

  // Validate withdrawal amount
  const amountValidation = validateDepositAmount(amount);
  if (!amountValidation.valid) {
    return amountValidation;
  }

  // Validate Bitcoin address
  if (!validateBitcoinAddress(address)) {
    return { valid: false, error: 'Invalid Bitcoin address' };
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  // Check sufficient balance (with fee buffer)
  const estimatedFee = 0.0001; // ~$4-10 network fee buffer
  if (numAmount + estimatedFee > availableBalance) {
    return { 
      valid: false, 
      error: `Insufficient balance. Available: ${availableBalance.toFixed(8)} BTC (including fee buffer)` 
    };
  }

  // Minimum withdrawal: 0.001 BTC (to cover network fees)
  if (numAmount < 0.001) {
    return { valid: false, error: 'Minimum withdrawal: 0.001 BTC' };
  }

  return { valid: true };
};

/**
 * Principal Validation for ICP
 */
export const validatePrincipal = (principal: string): boolean => {
  if (!principal || typeof principal !== 'string') return false;
  
  // Basic principal format validation
  const principalRegex = /^[a-z0-9-]+$/;
  return principalRegex.test(principal) && principal.length >= 5 && principal.length <= 63;
};

/**
 * Real-time Price Validation
 */
export const validatePriceData = (price: number, timestamp: number): boolean => {
  // Price must be positive
  if (price <= 0) return false;
  
  // Price must be reasonable for Bitcoin (between $1,000 and $1,000,000)
  if (price < 1000 || price > 1000000) return false;
  
  // Timestamp must be recent (within last 60 seconds)
  const now = Date.now();
  const timeDiff = now - timestamp;
  if (timeDiff > 60000 || timeDiff < -10000) return false;
  
  return true;
};

/**
 * Order ID Validation
 */
export const validateOrderId = (orderId: string | number): boolean => {
  if (typeof orderId === 'string') {
    return /^[0-9]+$/.test(orderId) && parseInt(orderId) > 0;
  }
  return Number.isInteger(orderId) && orderId > 0;
};

/**
 * Expiry Time Validation
 */
export const validateExpiryTime = (expiry: string): { valid: boolean; seconds?: number } => {
  const validExpiries = {
    '5s': 5,
    '10s': 10,
    '15s': 15
  };

  if (!validExpiries[expiry as keyof typeof validExpiries]) {
    return { valid: false };
  }

  return { 
    valid: true, 
    seconds: validExpiries[expiry as keyof typeof validExpiries] 
  };
};
