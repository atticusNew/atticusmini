import React, { useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';

interface TimerDisplayProps {
  isActive: boolean;
  expiry: string;
  onExpiry: () => void;
}

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const TimerContainer = styled.div<{ isActive: boolean }>`
  position: absolute;
  top: 0.5rem;
  right: 1rem;
  z-index: 20;
  background: transparent;
  color: #ffd700;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  border: 3px solid #ffd700;
  display: ${props => props.isActive ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  animation: ${props => props.isActive ? pulse : 'none'} 1s ease-in-out infinite;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  }
`;

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ isActive, expiry, onExpiry }) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [displayTime, setDisplayTime] = React.useState(0);
  const onExpiryRef = useRef(onExpiry);
  const startTimeRef = useRef<number>(0);

  // ✅ FIXED: Store onExpiry in ref to prevent timer resets
  onExpiryRef.current = onExpiry;

  useEffect(() => {
    if (!isActive) {
      setDisplayTime(0);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const expirySeconds = parseInt(expiry.replace('s', ''));
    setDisplayTime(expirySeconds);
    startTimeRef.current = Date.now();

    // ✅ FIXED: Single timeout for expiry
    timeoutRef.current = setTimeout(() => {
      onExpiryRef.current();
    }, expirySeconds * 1000);

    // ✅ FIXED: Simple setInterval for countdown display - updates once per second
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, expirySeconds - elapsed);
      setDisplayTime(remaining);
    }, 1000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, expiry]); // ✅ FIXED: Removed onExpiry from dependencies

  if (!isActive || displayTime <= 0) {
    return null;
  }

  return (
    <TimerContainer isActive={isActive}>
      {displayTime}s
    </TimerContainer>
  );
};
