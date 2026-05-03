import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { earlyExitService } from '../services/sellback/EarlyExitService';
import { getPartnerExchange, type PartnerTicket } from '../services/partner';

interface SellbackBarProps {
  ticketId: number;
  spotUSD: number;
  onSold: () => void;
}

const Bar = styled.div`
  margin-top: 8px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 12px;
  font-family: var(--font-sans);
`;

const Left = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const Title = styled.span`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-dim);
`;

const Numbers = styled.div<{ tone: 'pos' | 'neg' | 'flat' }>`
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 16px;
  font-weight: 700;
  color: ${p => (p.tone === 'pos' ? 'var(--up)' : p.tone === 'neg' ? 'var(--down)' : 'var(--text)')};
  display: flex;
  gap: 10px;
  align-items: baseline;
`;

const PnL = styled.span<{ tone: 'pos' | 'neg' | 'flat' }>`
  font-size: 12px;
  font-weight: 500;
  font-family: var(--font-mono);
  color: ${p => (p.tone === 'pos' ? 'var(--up)' : p.tone === 'neg' ? 'var(--down)' : 'var(--text-dim)')};
`;

const Reason = styled.div`
  font-size: 11px;
  color: var(--text-dim);
  font-style: italic;
`;

const LockoutHint = styled.span<{ tone: 'normal' | 'warn' }>`
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 11px;
  font-weight: 600;
  color: ${p => (p.tone === 'warn' ? 'var(--accent)' : 'var(--text-dim)')};
  margin-left: 8px;
  letter-spacing: 0.04em;
`;

const SellButton = styled.button`
  appearance: none;
  background: var(--accent);
  color: #1a1410;
  border: none;
  border-radius: 10px;
  padding: 10px 16px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  letter-spacing: 0.04em;
  transition: 120ms ease-out;
  &:hover:not(:disabled) { background: var(--accent-hover); }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const formatUSD = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const SellbackBar: React.FC<SellbackBarProps> = ({ ticketId, spotUSD, onSold }) => {
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

  if (!ticket || !quote) return null;

  const refund = quote.refundUSD.toNumber();
  const premium = quote.premiumUSD.toNumber();
  const pnl = quote.pnlUSD.toNumber();
  const tone: 'pos' | 'neg' | 'flat' = pnl > 0.005 ? 'pos' : pnl < -0.005 ? 'neg' : 'flat';

  const handleSell = async () => {
    if (submitting || !quote.available) return;
    setSubmitting(true);
    try {
      const result = await earlyExitService.sell({
        ticketId,
        spotUSD,
        idempotencyKey: `sellback:${ticketId}:${Date.now()}`,
      });
      if ('ok' in result) onSold();
    } finally {
      setSubmitting(false);
    }
  };

  const lockoutTone: 'normal' | 'warn' =
    quote.secondsUntilLockout > 0 && quote.secondsUntilLockout <= 10 ? 'warn' : 'normal';

  return (
    <Bar>
      <Left>
        <Title>
          Sell now
          {quote.available && quote.secondsUntilLockout > 0 && (
            <LockoutHint tone={lockoutTone}>
              · locks in {quote.secondsUntilLockout}s
            </LockoutHint>
          )}
        </Title>
        {quote.available ? (
          <Numbers tone={tone}>
            ${formatUSD(refund)}
            <PnL tone={tone}>
              of ${formatUSD(premium)} · {pnl >= 0 ? '+' : ''}${formatUSD(pnl)}
            </PnL>
          </Numbers>
        ) : (
          <Reason>{quote.reason}</Reason>
        )}
      </Left>
      <SellButton onClick={handleSell} disabled={!quote.available || submitting}>
        {submitting ? 'Selling…' : 'Sell back'}
      </SellButton>
    </Bar>
  );
};
