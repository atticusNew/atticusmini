/**
 * BalancePill — header surface that shows the user's available balance,
 * day-session P&L, and a transient delta chip when a trade settles or
 * sells back. In demo mode the balance is the partner mock; the same
 * component works for a live partner adapter without changes.
 *
 * Designed to give traders the "I just won/lost" feedback the inline
 * banner used to provide, without occupying the chart area.
 */

import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useBalance } from '../contexts/BalanceProvider';

const Wrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 4px 12px;
  border-radius: 999px;
  background: var(--bg-elev-2);
  border: 1px solid var(--border);
  font-family: var(--font-sans);
  position: relative;
  min-height: 32px;
`;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.05;
`;

const BalanceText = styled.span`
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: 14px;
  color: var(--text);
  letter-spacing: 0.01em;
`;

const PnlText = styled.span<{ tone: 'pos' | 'neg' | 'flat' }>`
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 10px;
  font-weight: 600;
  color: ${p => (p.tone === 'pos' ? 'var(--up)' : p.tone === 'neg' ? 'var(--down)' : 'var(--text-dim)')};
  letter-spacing: 0.02em;
`;

const Label = styled.span`
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-dim);
  text-transform: uppercase;
`;

const floatUp = keyframes`
  0%   { opacity: 0; transform: translate(-50%, 0); }
  15%  { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%, -22px); }
`;

const DeltaChip = styled.span<{ tone: 'pos' | 'neg' }>`
  position: absolute;
  left: 50%;
  bottom: 100%;
  transform: translate(-50%, 0);
  margin-bottom: 4px;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  pointer-events: none;
  background: ${p => (p.tone === 'pos' ? 'var(--up-dim)' : 'var(--down-dim)')};
  color: ${p => (p.tone === 'pos' ? 'var(--up)' : 'var(--down)')};
  border: 1px solid ${p => (p.tone === 'pos' ? 'rgba(27,196,125,0.32)' : 'rgba(255,93,108,0.32)')};
  animation: ${floatUp} 1500ms ease-out forwards;
  white-space: nowrap;
`;

const formatUSD = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const BalancePill: React.FC<{ label?: string }> = ({ label = 'Paper' }) => {
  const { userBalance, dayPnl, lastDelta } = useBalance();
  const [activeDelta, setActiveDelta] = useState<{ amount: number; key: number } | null>(null);

  useEffect(() => {
    if (!lastDelta) return;
    setActiveDelta({ amount: lastDelta.amount, key: lastDelta.at });
    const id = setTimeout(() => setActiveDelta(null), 1500);
    return () => clearTimeout(id);
  }, [lastDelta]);

  const pnlTone: 'pos' | 'neg' | 'flat' =
    dayPnl > 0.005 ? 'pos' : dayPnl < -0.005 ? 'neg' : 'flat';
  const pnlPrefix = dayPnl > 0 ? '+' : dayPnl < 0 ? '−' : '';
  const pnlAbs = Math.abs(dayPnl);

  const deltaTone: 'pos' | 'neg' | null = activeDelta
    ? activeDelta.amount > 0 ? 'pos' : 'neg'
    : null;
  const deltaPrefix = activeDelta && activeDelta.amount > 0 ? '+' : '−';

  return (
    <Wrap aria-live="polite" aria-label={`Paper balance ${formatUSD(userBalance)} dollars`}>
      <Label>{label}</Label>
      <Stack>
        <BalanceText>${formatUSD(userBalance)}</BalanceText>
        <PnlText tone={pnlTone}>
          {pnlTone === 'flat' ? 'today flat' : `${pnlPrefix}$${formatUSD(pnlAbs)} today`}
        </PnlText>
      </Stack>
      {activeDelta && deltaTone && (
        <DeltaChip key={activeDelta.key} tone={deltaTone}>
          {deltaPrefix}${formatUSD(Math.abs(activeDelta.amount))}
        </DeltaChip>
      )}
    </Wrap>
  );
};

export default BalancePill;
