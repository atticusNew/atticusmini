/**
 * ActiveTicketCard — hero surface for an open position.
 *
 * Replaces the TradeForm in the Trade tab while a ticket is live. Combines
 * the previously-fragmented "trade-active banner" + chart-overlay
 * `SellbackBar` into a single card that shows direction, frozen strike,
 * time remaining, live mark-to-market, and the sell-back CTA. Hold-to-
 * expiry users see the same surface; nothing on the chart-side moves.
 */

import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Card } from '../ui/primitives';
import { earlyExitService } from '../services/sellback/EarlyExitService';
import { getPartnerExchange, type PartnerTicket } from '../services/partner';
import { tenorToSeconds } from '../services/pricing/tenor';
import { toastSoldBack } from './tradeToasts';

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
  onWaiting?: () => void;
}

const Wrap = styled(Card)`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  border-color: var(--accent);
  box-shadow: 0 0 0 1px rgba(245, 195, 68, 0.18);
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

const DirectionTag = styled.div<{ tone: 'up' | 'down' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: ${p => (p.tone === 'up' ? 'var(--up-dim)' : 'var(--down-dim)')};
  color: ${p => (p.tone === 'up' ? 'var(--up)' : 'var(--down)')};
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const Timer = styled.div<{ tone: 'normal' | 'warn' | 'critical' }>`
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: 16px;
  color: ${p =>
    p.tone === 'critical' ? 'var(--down)' : p.tone === 'warn' ? 'var(--accent)' : 'var(--text)'};
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 14px;
  background: var(--bg-elev-2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
`;

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const StatLabel = styled.span`
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-dim);
`;

const StatValue = styled.span`
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  font-size: 14px;
  color: var(--text);
`;

const Hero = styled.div<{ tone: 'pos' | 'neg' | 'flat' }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px;
  border-radius: 12px;
  background: ${p =>
    p.tone === 'pos' ? 'var(--up-dim)' : p.tone === 'neg' ? 'var(--down-dim)' : 'var(--bg-elev-2)'};
  border: 1px solid ${p =>
    p.tone === 'pos'
      ? 'rgba(27,196,125,0.32)'
      : p.tone === 'neg'
        ? 'rgba(255,93,108,0.32)'
        : 'var(--border)'};

  .label {
    font-family: var(--font-sans);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  .now {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    font-size: 28px;
    color: ${p =>
      p.tone === 'pos' ? 'var(--up)' : p.tone === 'neg' ? 'var(--down)' : 'var(--text)'};
    line-height: 1;
  }
  .pnl {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: 12px;
    color: ${p =>
      p.tone === 'pos' ? 'var(--up)' : p.tone === 'neg' ? 'var(--down)' : 'var(--text-dim)'};
  }
`;

const Actions = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const SellButton = styled.button`
  appearance: none;
  background: var(--accent);
  color: #1a1410;
  border: none;
  border-radius: 12px;
  padding: 14px;
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: 120ms ease-out;
  &:hover:not(:disabled) { background: var(--accent-hover); }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const HoldButton = styled.button`
  appearance: none;
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px;
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: 120ms ease-out;
  &:hover { border-color: var(--border-strong); }
`;

const Reason = styled.div`
  font-family: var(--font-sans);
  font-size: 12px;
  color: var(--text-dim);
  text-align: center;
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
    ticketId, spotUSD, optionType, strikePrice, entryPrice, tenor,
    stake, potentialPayout, onSold, onWaiting,
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
  const ratio = totalSec > 0 ? remaining / totalSec : 1;
  const timerTone: 'normal' | 'warn' | 'critical' =
    ratio < 0.15 ? 'critical' : ratio < 0.3 ? 'warn' : 'normal';

  const refund = quote ? quote.refundUSD.toNumber() : 0;
  const pnl = quote ? quote.pnlUSD.toNumber() : 0;
  const heroTone: 'pos' | 'neg' | 'flat' =
    pnl > 0.005 ? 'pos' : pnl < -0.005 ? 'neg' : 'flat';

  const inTheMoney = optionType === 'call' ? spotUSD > strikePrice : spotUSD < strikePrice;

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
        <DirectionTag tone={optionType === 'call' ? 'up' : 'down'}>
          {optionType === 'call' ? '↑ CALL' : '↓ PUT'}
        </DirectionTag>
        <Timer tone={timerTone}>{formatRemaining(remaining)}</Timer>
      </HeaderRow>

      <StatGrid>
        <Stat>
          <StatLabel>Strike</StatLabel>
          <StatValue>${formatUSD(strikePrice)}</StatValue>
        </Stat>
        <Stat>
          <StatLabel>Spot</StatLabel>
          <StatValue style={{ color: inTheMoney ? 'var(--up)' : 'var(--down)' }}>
            ${formatUSD(spotUSD)}
          </StatValue>
        </Stat>
        <Stat>
          <StatLabel>Entry</StatLabel>
          <StatValue>${formatUSD(entryPrice)}</StatValue>
        </Stat>
        <Stat>
          <StatLabel>Stake → Win</StatLabel>
          <StatValue>${formatUSD(stake)} → ${formatUSD(potentialPayout)}</StatValue>
        </Stat>
      </StatGrid>

      <Hero tone={heroTone}>
        <span className="label">Sell back now</span>
        <span className="now">${formatUSD(refund)}</span>
        <span className="pnl">
          {heroTone === 'flat' ? '— flat —' : `${pnl >= 0 ? '+' : '−'}$${formatUSD(Math.abs(pnl))} vs stake`}
        </span>
      </Hero>

      {!quote || quote.available ? (
        <Actions>
          <HoldButton onClick={() => onWaiting?.()} type="button">Hold to expiry</HoldButton>
          <SellButton onClick={handleSell} disabled={!quote || !quote.available || submitting} type="button">
            {submitting ? 'Selling…' : `Sell $${formatUSD(refund)}`}
          </SellButton>
        </Actions>
      ) : (
        <Reason>{quote.reason ?? 'Sell-back unavailable'}</Reason>
      )}
    </Wrap>
  );
};

export default ActiveTicketCard;
