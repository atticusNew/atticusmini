import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { getPartnerExchange, type PartnerTicket } from '../services/partner';
import { earlyExitService } from '../services/sellback/EarlyExitService';
import { useAuth } from '../contexts/AuthProvider';
import { tenorToSeconds } from '../services/pricing/tenor';

interface ActiveTicketsListProps {
  spotUSD: number;
  onChanged: () => void;
}

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.5rem 0;
`;

const Row = styled.div`
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.85rem 1rem;
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  align-items: center;
  gap: 0.75rem;
  font-family: 'Inter', sans-serif;
`;

const Side = styled.span<{ side: 'call' | 'put' }>`
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  color: ${p => (p.side === 'call' ? 'var(--green)' : 'var(--red)')};
`;

const Tenor = styled.span`
  font-size: 0.8rem;
  color: var(--text-dim);
`;

const Mid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
`;

const Label = styled.div`
  font-size: 0.7rem;
  color: var(--text-dim);
`;

const Value = styled.div<{ tone?: 'pos' | 'neg' }>`
  font-size: 0.95rem;
  font-weight: 600;
  color: ${p => (p.tone === 'pos' ? 'var(--green)' : p.tone === 'neg' ? 'var(--red)' : 'var(--text)')};
`;

const SellButton = styled.button`
  background: var(--accent);
  color: #1a1a1a;
  border: none;
  border-radius: 8px;
  padding: 0.55rem 0.9rem;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Empty = styled.div`
  text-align: center;
  color: var(--text-dim);
  padding: 2rem 1rem;
  font-size: 0.9rem;
`;

const formatRemaining = (sec: number): string => {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
  return `${Math.floor(sec / 3600)}:${Math.floor((sec % 3600) / 60).toString().padStart(2, '0')}`;
};

export const ActiveTicketsList: React.FC<ActiveTicketsListProps> = ({ spotUSD, onChanged }) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<PartnerTicket[]>([]);
  const [now, setNow] = useState(Date.now());
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const refresh = useMemo(
    () => async () => {
      if (!user) return;
      const all = await getPartnerExchange().getUserTickets(user.principal);
      setTickets(all.filter(t => t.status === 'active'));
    },
    [user],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const handleSell = async (ticket: PartnerTicket) => {
    setSubmittingId(ticket.id);
    try {
      const r = await earlyExitService.sell({
        ticketId: ticket.id,
        spotUSD,
        idempotencyKey: `sellback:${ticket.id}:${Date.now()}`,
      });
      if ('ok' in r) {
        await refresh();
        onChanged();
      }
    } finally {
      setSubmittingId(null);
    }
  };

  if (!tickets.length) {
    return <Empty>No active tickets. Open one from the Trade tab.</Empty>;
  }

  return (
    <ListContainer>
      {tickets.map(t => {
        const tenorSec = tenorToSeconds(t.tenor);
        const elapsed = Math.max(0, Math.floor((now - t.openedAt) / 1000));
        const remaining = Math.max(0, tenorSec - elapsed);
        const quote = earlyExitService.quote(t, spotUSD, now);
        const pnl = quote.pnlUSD.toNumber();
        return (
          <Row key={t.id}>
            <Side side={t.optionType}>{t.optionType.toUpperCase()}</Side>
            <Tenor>
              {t.tenor} · {formatRemaining(remaining)}
            </Tenor>
            <Mid>
              <Label>Sell now</Label>
              <Value tone={pnl >= 0 ? 'pos' : 'neg'}>
                ${quote.refundUSD.toNumber().toFixed(2)} (
                {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)})
              </Value>
            </Mid>
            <SellButton
              disabled={!quote.available || submittingId === t.id}
              onClick={() => handleSell(t)}
            >
              {submittingId === t.id ? '…' : 'Sell'}
            </SellButton>
          </Row>
        );
      })}
    </ListContainer>
  );
};
