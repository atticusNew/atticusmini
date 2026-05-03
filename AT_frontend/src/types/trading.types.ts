export interface PriceData {
  current: number;
  price: number; // For backward compatibility
  change: {
    amount: number;
    percentage: number;
  };
  timestamp: number;
  volume?: number;
  high?: number;
  low?: number;
  source?: string;
}

export interface Position {
  id: string;
  user: string;
  type: 'call' | 'put';
  strike: number;
  expiry: string;
  size: number;
  entryPremium: number;
  currentValue: number;
  pnl: number;
  openedAt: number;
  entryPrice?: number; // ✅ ADDED: Opening BTC price
  settledAt?: number; // ✅ ADDED: Settlement timestamp
  settlementPrice?: number; // ✅ ADDED: Actual settlement price
}

// ✅ CORRECTED: ActiveTrade interface with proper property names
export interface ActiveTrade {
  id: string;
  type: 'call' | 'put';
  strike: number; // ✅ Uses 'strike' not 'strikePrice'
  expiry: string;
  size: number;
  premium: number; // ✅ Uses 'premium' not 'entryPrice'
  entryTime: number;
  expiryTime: number;
}

export interface OptionOrder {
  id: string;
  type: 'call' | 'put';
  strike: number;
  expiry: string;
  size: number;
  premium: number;
  status: 'pending' | 'filled' | 'cancelled';
  timestamp: number;
}
