/**
 * TradeReviewSheet — bottom-sheet confirmation step before placing a trade.
 *
 * Replaces the previous one-tap "Stake $X" CTA with an explicit review:
 * shows the live quote, win/loss conditions, time window, and asks the
 * trader to confirm. Doubling the tap count is a deliberate safety call
 * (the audit flagged the previous flow as a fat-finger risk).
 *
 * The sheet is purely presentational — `onConfirm` performs the place,
 * the parent owns trade state. `live` is recomputed by the parent every
 * render so price moves are visible while the sheet is open.
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
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-dim);
`;

const Hero = styled.div<{ tone: 'up' | 'down' }>`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 14px;
  background: ${p => (p.tone === 'up' ? 'var(--up-dim)' : 'var(--down-dim)')};
  border: 1px solid ${p => (p.tone === 'up' ? 'rgba(27,196,125,0.32)' : 'rgba(255,93,108,0.32)')};

  .left { display: flex; flex-direction: column; gap: 2px; }
  .label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-dim); }
  .dir { font-weight: 800; font-size: 16px; color: ${p => (p.tone === 'up' ? 'var(--up)' : 'var(--down)')}; }
  .right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
  .small { font-size: 11px; color: var(--text-dim); font-family: var(--font-mono); }
  .big { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-weight: 700; font-size: 22px; color: var(--text); }
`;

const RiskWin = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--bg-elev-2);
  border: 1px solid var(--border);
  border-radius: 12px;

  .label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-dim); }
  .pair { display: flex; align-items: baseline; gap: 8px; }
  .risk { color: var(--text-dim); font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
  .arrow { color: var(--text-muted); }
  .win { color: var(--up); font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-weight: 800; font-size: 22px; }
  .mult { color: var(--text-dim); font-family: var(--font-mono); font-size: 11px; margin-left: 4px; }
`;

const Conditions = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;

  li {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: 13px;
    color: var(--text);
    line-height: 1.4;
  }
  li::before {
    content: '·';
    color: var(--text-muted);
    font-weight: 700;
    flex-shrink: 0;
  }
  .em {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    color: var(--text);
  }
  .dim { color: var(--text-dim); }
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
  open, optionType, tenor, stake, spotUSD, quote, submitting, onConfirm, onCancel,
}) => {
  if (!open) return null;
  const tone = optionType === 'call' ? 'up' : 'down';
  const inequality = optionType === 'call' ? '≥' : '≤';
  const win = quote ? quote.potentialPayoutUSD.toNumber() : stake;
  const risk = quote ? quote.premiumUSD.toNumber() : stake;
  const mult = quote ? quote.payoutMultiple : 1;
  const strike = quote ? quote.strikeUSD : spotUSD;
  const probPct = quote ? Math.round(quote.digitalProb * 100) : null;

  return (
    <Backdrop role="dialog" aria-modal="true" aria-label="Review trade" onClick={onCancel}>
      <Sheet onClick={e => e.stopPropagation()}>
        <Title>Review trade</Title>
        <Hero tone={tone}>
          <div className="left">
            <span className="label">Direction · {tenor}</span>
            <span className="dir">{optionType === 'call' ? '↑ CALL' : '↓ PUT'}</span>
          </div>
          <div className="right">
            <span className="small">spot ${formatUSD(spotUSD)}</span>
            <span className="big">${formatUSD(strike)}</span>
            <span className="small">strike</span>
          </div>
        </Hero>

        <RiskWin>
          <span className="label">Risk → Win</span>
          <span className="pair">
            <span className="risk">${formatUSD(risk)}</span>
            <span className="arrow">→</span>
            <span className="win">${formatUSD(win)}</span>
            <span className="mult">{mult.toFixed(2)}×</span>
          </span>
        </RiskWin>

        <Conditions>
          <li>
            Wins if BTC <span className="em">{inequality} ${formatUSD(strike)}</span> in <span className="em">{tenor}</span>.
          </li>
          <li>
            Max loss <span className="em">${formatUSD(risk)}</span> · max win <span className="em">${formatUSD(win)}</span>.
          </li>
          {probPct !== null && (
            <li className="dim">Estimated probability of win: {probPct}%.</li>
          )}
          <li className="dim">You can sell back early before the lockout window.</li>
        </Conditions>

        <Actions>
          <Cancel onClick={onCancel} disabled={submitting} type="button">Cancel</Cancel>
          <Confirm onClick={onConfirm} disabled={submitting || !quote} type="button">
            {submitting ? 'Placing…' : `Place trade · $${formatUSD(stake)}`}
          </Confirm>
        </Actions>
      </Sheet>
    </Backdrop>
  );
};

export default TradeReviewSheet;
