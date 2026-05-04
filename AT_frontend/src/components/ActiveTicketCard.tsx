/**
 * ActiveTicketCard — row format for the active position.
 *
 * v3: matches the form's label-left/value-right layout.
 *
 * v4: three body rows (If you win / Worth now / PnL) so the trader
 * can directly compare the hold-to-expiry payout vs the take-it-now
 * sell-back vs the current floating PnL. Header carries the deal
 * (direction · target) and the countdown.
 */

import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { earlyExitService } from '../services/sellback/EarlyExitService';
import { getPartnerExchange, type PartnerTicket } from '../services/partner';
import { tenorToSeconds } from '../services/pricing/tenor';
import { toastSoldBack } from './tradeToasts';
import { FormRow, FormRowLabel, FormRowControl } from '../ui/primitives';

interface ActiveTicketCardProps {
  ticketId: number;
  spotUSD: number;
  optionType: 'call' | 'put';
  strikePrice: number;
  entryPrice: number;
  tenor: string;
  stake: number;
  potentialPayout: number;
  onSold: () => void;
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  padding: 4px 14px 14px;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
`;

const DirectionTag = styled.span<{ tone: 'up' | 'down' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 999px;
  background: ${p => (p.tone === 'up' ? 'var(--up-dim)' : 'var(--down-dim)')};
  color: ${p => (p.tone === 'up' ? 'var(--up)' : 'var(--down)')};
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
`;

const HeaderTarget = styled.span`
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  color: var(--text-dim);
  margin-left: 8px;
  .em { color: var(--text); font-weight: 600; }
`;

const Timer = styled.div<{ tone: 'normal' | 'warn' | 'critical' }>`
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  font-size: 18px;
  color: ${p =>
    p.tone === 'critical' ? 'var(--down)' : p.tone === 'warn' ? 'var(--accent)' : 'var(--text)'};
`;

const RowValue = styled.span<{ tone?: 'pos' | 'neg' | 'flat' }>`
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: 16px;
  color: ${p =>
    p.tone === 'pos' ? 'var(--up)' : p.tone === 'neg' ? 'var(--down)' : 'var(--text)'};
`;

const SellButton = styled.button`
  appearance: none;
  width: 100%;
  background: var(--accent);
  color: #1a1410;
  border: none;
  border-radius: 12px;
  padding: 16px;
  margin-top: 14px;
  font-family: var(--font-sans);
  font-weight: 800;
  font-size: 16px;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: 120ms ease-out;
  @media (hover: hover) {
    &:hover:not(:disabled) { background: var(--accent-hover); }
  }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const LockoutHint = styled.div<{ tone: 'normal' | 'warn' }>`
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  margin-top: 8px;
  color: ${p => (p.tone === 'warn' ? 'var(--accent)' : 'var(--text-dim)')};
  letter-spacing: 0.04em;
`;

const Reason = styled.div`
  font-family: var(--font-sans);
  font-size: 12px;
  color: var(--text-dim);
  text-align: center;
  margin-top: 14px;
  font-style: italic;
`;

const formatUSD = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatRemaining = (s: number): string => {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
};

export const ActiveTicketCard: React.FC<ActiveTicketCardProps> = props => {
  const {
    ticketId, spotUSD, optionType, strikePrice, entryPrice: _entryPrice, tenor,
    stake: _stake, potentialPayout, onSold,
  } = props;

  const [ticket, setTicket] = useState<PartnerTicket | null>(null);
  const [now, setNow] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPartnerExchange()
      .getTicket(ticketId)
      .then(t => { if (!cancelled) setTicket(t); });
    return () => { cancelled = true; };
  }, [ticketId]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const quote = useMemo(() => {
    if (!ticket || !spotUSD) return null;
    return earlyExitService.quote(ticket, spotUSD, now);
  }, [ticket, spotUSD, now]);

  const totalSec = tenorToSeconds(tenor) || 0;
  const elapsed = ticket ? Math.max(0, Math.floor((now - ticket.openedAt) / 1000)) : 0;
  const remaining = Math.max(0, totalSec - elapsed);
  // v5: absolute thresholds. With the ladder capped at 3m, a ratio
  // gate would put a 3m trade in 'warn' for the full last 54s — too
  // much yellow, blunts the urgency cue. 'last 15s warn / last 5s
  // critical' reads identically across all four tenors.
  const timerTone: 'normal' | 'warn' | 'critical' =
    remaining <= 5 ? 'critical' : remaining <= 15 ? 'warn' : 'normal';

  const refund = quote ? quote.refundUSD.toNumber() : 0;
  const pnl = quote ? quote.pnlUSD.toNumber() : 0;
  const pnlTone: 'pos' | 'neg' | 'flat' =
    pnl > 0.005 ? 'pos' : pnl < -0.005 ? 'neg' : 'flat';

  const lockoutTone: 'normal' | 'warn' =
    quote && quote.secondsUntilLockout > 0 && quote.secondsUntilLockout <= 10 ? 'warn' : 'normal';

  const handleSell = async () => {
    if (!quote || !quote.available || submitting) return;
    setSubmitting(true);
    try {
      const result = await earlyExitService.sell({
        ticketId,
        spotUSD,
        idempotencyKey: `sellback:${ticketId}:${Date.now()}`,
      });
      if ('ok' in result) {
        toastSoldBack({ refund, pnl });
        onSold();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Wrap aria-live="polite">
      <HeaderRow>
        <div>
          <DirectionTag tone={optionType === 'call' ? 'up' : 'down'}>
            {optionType === 'call' ? '▲ UP' : '▼ DOWN'}
          </DirectionTag>
          <HeaderTarget>
            target <span className="em">${formatUSD(strikePrice)}</span>
          </HeaderTarget>
        </div>
        <Timer tone={timerTone}>{formatRemaining(remaining)}</Timer>
      </HeaderRow>

      <FormRow>
        <FormRowLabel>If you win</FormRowLabel>
        <FormRowControl>
          <RowValue tone="pos">${formatUSD(potentialPayout)}</RowValue>
        </FormRowControl>
      </FormRow>

      <FormRow>
        <FormRowLabel>Worth now</FormRowLabel>
        <FormRowControl>
          <RowValue>${formatUSD(refund)}</RowValue>
        </FormRowControl>
      </FormRow>

      <FormRow>
        <FormRowLabel>PnL</FormRowLabel>
        <FormRowControl>
          <RowValue tone={pnlTone}>
            {pnlTone === 'flat' ? '$0.00' : `${pnl >= 0 ? '+' : '−'}$${formatUSD(Math.abs(pnl))}`}
          </RowValue>
        </FormRowControl>
      </FormRow>

      {!quote || quote.available ? (
        <>
          <SellButton
            onClick={handleSell}
            disabled={!quote || !quote.available || submitting}
            type="button"
          >
            {submitting ? 'Selling…' : `Sell now · $${formatUSD(refund)}`}
          </SellButton>
          {quote && quote.secondsUntilLockout > 0 && quote.secondsUntilLockout <= 30 && (
            <LockoutHint tone={lockoutTone}>
              Sell-back closes in {quote.secondsUntilLockout}s
            </LockoutHint>
          )}
        </>
      ) : (
        <Reason>
          {quote.reason ?? 'Sell-back unavailable'} — letting it ride to expiry.
        </Reason>
      )}
    </Wrap>
  );
};

export default ActiveTicketCard;
