import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { earlyExitService } from '../services/sellback/EarlyExitService';
import { getPartnerExchange, type PartnerTicket } from '../services/partner';

interface SellbackCardProps {
  ticketId: number;
  spotUSD: number;
  onSold: () => void;
}

const Card = styled.div`
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem;
  margin: 0.75rem 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-family: 'Inter', sans-serif;
`;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
`;

const Label = styled.div`
  font-size: 0.75rem;
  color: var(--text-dim);
`;

const Value = styled.div<{ positive?: boolean }>`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${p => (p.positive === undefined ? 'var(--text)' : p.positive ? 'var(--green)' : 'var(--red)')};
`;

const SellButton = styled.button`
  background: var(--accent);
  color: #1a1a1a;
  border: none;
  border-radius: 8px;
  padding: 0.65rem 1rem;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Reason = styled.div`
  font-size: 0.7rem;
  color: var(--text-dim);
  margin-left: 0.5rem;
  font-style: italic;
`;

export const SellbackCard: React.FC<SellbackCardProps> = ({ ticketId, spotUSD, onSold }) => {
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

  const handleSell = async () => {
    if (submitting || !quote.available) return;
    setSubmitting(true);
    try {
      const result = await earlyExitService.sell({
        ticketId,
        spotUSD,
        idempotencyKey: `sellback:${ticketId}:${Date.now()}`,
      });
      if ('err' in result) {
        console.error('sellback failed:', result.err);
      } else {
        onSold();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const refund = quote.refundUSD.toNumber();
  const premium = quote.premiumUSD.toNumber();
  const pnl = quote.pnlUSD.toNumber();

  return (
    <Card>
      <Stack>
        <Label>Sell now</Label>
        <Value>${refund.toFixed(2)} of ${premium.toFixed(2)}</Value>
        {quote.available ? (
          <Label>
            P&amp;L: <Value as="span" positive={pnl >= 0}>{pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}</Value>
          </Label>
        ) : (
          <Reason>{quote.reason}</Reason>
        )}
      </Stack>
      <SellButton onClick={handleSell} disabled={!quote.available || submitting}>
        {submitting ? 'Selling…' : 'Sell back'}
      </SellButton>
    </Card>
  );
};
