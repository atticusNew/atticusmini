/**
 * TradeReviewSheet — minimum-viable confirm.
 *
 * v2: every meaningful detail is already on the form (target price,
 * tenor, multiplier, risk → win panel). The sheet's only job is to
 * stop a fat-finger. We show direction · tenor and the single most
 * important sentence ("Stake $X to win $Y?") plus Cancel / Yes.
 * No bullet list, no probability sermon, no extra surfaces.
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import type { Quote } from '../services/pricing/PricingService';
import { Button } from '../ui/primitives';

interface TradeReviewSheetProps {
  open: boolean;
  optionType: 'call' | 'put';
  tenor: string;
  stake: number;
  spotUSD: number;
  quote: Quote | null;
  submitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const fade = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;
const slideUp = keyframes`
  from { transform: translateY(24px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
`;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(10, 13, 18, 0.7);
  backdrop-filter: blur(2px);
  z-index: 1100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: ${fade} 160ms ease-out;

  @media (min-width: 768px) {
    align-items: center;
  }
`;

const Sheet = styled.div`
  width: 100%;
  max-width: 460px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 18px 18px 0 0;
  padding: 18px 18px 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  animation: ${slideUp} 200ms ease-out;
  font-family: var(--font-sans);

  @media (min-width: 768px) {
    border-radius: 18px;
  }
`;

const Title = styled.div`
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 18px;
  text-align: center;
  color: var(--text);
  margin-top: 4px;
`;

const Summary = styled.div<{ tone: 'up' | 'down' }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px;
  border-radius: 14px;
  background: ${p => (p.tone === 'up' ? 'var(--up-dim)' : 'var(--down-dim)')};
  border: 1px solid ${p => (p.tone === 'up' ? 'rgba(27,196,125,0.32)' : 'rgba(255,93,108,0.32)')};

  .dir {
    font-family: var(--font-sans);
    font-weight: 800;
    font-size: 14px;
    letter-spacing: 0.06em;
    color: ${p => (p.tone === 'up' ? 'var(--up)' : 'var(--down)')};
  }
  .line {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    font-size: 22px;
    color: var(--text);
    letter-spacing: 0.01em;
  }
  .line .arrow { color: var(--text-muted); margin: 0 6px; font-weight: 500; }
  .line .win { color: var(--up); }
`;

const Actions = styled.div`
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 10px;
  margin-top: 4px;
`;

const Cancel = styled(Button).attrs({ variant: 'subtle' as const })`
  padding: 14px;
  font-size: 14px;
  letter-spacing: 0.04em;
`;

const Confirm = styled(Button).attrs({ variant: 'primary' as const })`
  padding: 14px;
  font-size: 15px;
  letter-spacing: 0.04em;
`;

const formatUSD = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const TradeReviewSheet: React.FC<TradeReviewSheetProps> = ({
  open, optionType, tenor, stake, spotUSD: _spotUSD, quote, submitting, onConfirm, onCancel,
}) => {
  if (!open) return null;
  const tone = optionType === 'call' ? 'up' : 'down';
  const win = quote ? quote.potentialPayoutUSD.toNumber() : stake;
  const risk = quote ? quote.premiumUSD.toNumber() : stake;

  return (
    <Backdrop role="dialog" aria-modal="true" aria-label="Place this trade?" onClick={onCancel}>
      <Sheet onClick={e => e.stopPropagation()}>
        <Title>Place this trade?</Title>
        <Summary tone={tone}>
          <span className="dir">{optionType === 'call' ? '↑ UP' : '↓ DOWN'} · {tenor}</span>
          <span className="line">
            <span className="risk">${formatUSD(risk)}</span>
            <span className="arrow">→</span>
            <span className="win">${formatUSD(win)}</span>
          </span>
        </Summary>

        <Actions>
          <Cancel onClick={onCancel} disabled={submitting} type="button">Cancel</Cancel>
          <Confirm onClick={onConfirm} disabled={submitting || !quote} type="button">
            {submitting ? 'Placing…' : 'Yes, place'}
          </Confirm>
        </Actions>
      </Sheet>
    </Backdrop>
  );
};

export default TradeReviewSheet;
