import { useState, useEffect, useCallback } from 'react';

interface TradeData {
  entryPrice: number;
  strikePrice: number;
  startTime: number;
  expiry: string;
  id?: string;
  type?: 'call' | 'put';
  contracts?: number;
}

export const useTradingCountdown = (
  isActive: boolean, 
  tradeData?: TradeData,
  onExpiry?: (tradeData: TradeData) => void
) => {
  const [countdown, setCountdown] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [hasTriggeredExpiry, setHasTriggeredExpiry] = useState<boolean>(false);

  const handleExpiry = useCallback(() => {
    if (tradeData && onExpiry && !hasTriggeredExpiry) {
      console.log('⏰ Trade expiry triggered for trade:', tradeData.id);
      setHasTriggeredExpiry(true);
      onExpiry(tradeData);
    }
  }, [tradeData, onExpiry, hasTriggeredExpiry]);

  useEffect(() => {
    if (!isActive || !tradeData) {
      setCountdown(0);
      setIsExpired(false);
      setHasTriggeredExpiry(false);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - tradeData.startTime) / 1000);
      const expirySeconds = parseInt(tradeData.expiry.replace('s', ''));
      const remaining = Math.max(0, expirySeconds - elapsed);
      
      setCountdown(remaining);
      setIsExpired(remaining === 0);
      
      // Log countdown progress every second
      if (remaining > 0 && remaining % 1 === 0) {
        console.log(`⏰ Trade ${tradeData.id}: ${remaining}s remaining`);
      }
      
      // Trigger expiry callback when timer reaches 0
      if (remaining === 0 && !hasTriggeredExpiry) {
        console.log('⏰ Countdown reached 0, triggering expiry for trade:', tradeData.id);
        handleExpiry();
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 100);
    return () => clearInterval(interval);
  }, [isActive, tradeData?.startTime, tradeData?.expiry, handleExpiry, hasTriggeredExpiry]);

  return { countdown, isExpired };
};
