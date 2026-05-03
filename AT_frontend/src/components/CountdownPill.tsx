import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { tenorToSeconds } from '../services/pricing/tenor';

interface CountdownPillProps {
  isActive: boolean;
  expiry: string;
  onExpiry: () => void;
  /**
   * v4: when true the component still owns the expiry timer (so the
   * trade settles at the right moment) but renders nothing. Lets the
   * header drop the visible pill while the active-ticket card carries
   * the user-facing countdown.
   */
  headless?: boolean;
}

const Pill = styled.span<{ tone: 'normal' | 'warn' | 'critical' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  background: ${p =>
    p.tone === 'critical'
      ? 'var(--down-dim)'
      : p.tone === 'warn'
        ? 'rgba(245, 195, 68, 0.14)'
        : 'var(--bg-elev-2)'};
  color: ${p =>
    p.tone === 'critical'
      ? 'var(--down)'
      : p.tone === 'warn'
        ? 'var(--accent)'
        : 'var(--text-dim)'};
  border: 1px solid ${p =>
    p.tone === 'critical'
      ? 'rgba(255, 93, 108, 0.32)'
      : p.tone === 'warn'
        ? 'rgba(245, 195, 68, 0.32)'
        : 'var(--border)'};

  &::before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: currentColor;
  }
`;

const formatRemaining = (s: number): string => {
  if (s < 60) return `${s}s`;
  if (s < 3600) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
};

export const CountdownPill: React.FC<CountdownPillProps> = ({ isActive, expiry, onExpiry, headless }) => {
  const [remaining, setRemaining] = useState(0);
  const startRef = useRef<number>(0);
  const onExpiryRef = useRef(onExpiry);
  onExpiryRef.current = onExpiry;

  useEffect(() => {
    if (!isActive || !expiry) {
      setRemaining(0);
      return;
    }
    const total = tenorToSeconds(expiry);
    if (total <= 0) return;
    startRef.current = Date.now();
    setRemaining(total);

    const expiryTimer = setTimeout(() => onExpiryRef.current(), total * 1000);
    const tick = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      setRemaining(Math.max(0, total - elapsed));
    }, 1000);

    return () => {
      clearTimeout(expiryTimer);
      clearInterval(tick);
    };
  }, [isActive, expiry]);

  if (!isActive || remaining <= 0) return null;
  if (headless) return null;

  const total = tenorToSeconds(expiry);
  const ratio = total > 0 ? remaining / total : 1;
  const tone: 'normal' | 'warn' | 'critical' = ratio < 0.15 ? 'critical' : ratio < 0.3 ? 'warn' : 'normal';

  return <Pill tone={tone}>{formatRemaining(remaining)}</Pill>;
};
