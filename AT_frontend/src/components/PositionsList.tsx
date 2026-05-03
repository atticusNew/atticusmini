import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { getPartnerExchange, type PartnerTicket } from '../services/partner';
import { earlyExitService } from '../services/sellback/EarlyExitService';
import { useAuth } from '../contexts/AuthProvider';
import { tenorToSeconds } from '../services/pricing/tenor';
import { Card, Chip } from '../ui/primitives';

interface PositionsListProps {
  spotUSD: number;
  onChanged: () => void;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0 16px;
`;

const TabRow = styled.div`
  display: inline-flex;
  align-self: flex-start;
  background: var(--bg-elev-2);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 3px;
  gap: 0;
  margin: 0 0 4px;
`;

const TabButton = styled.button<{ active?: boolean }>`
  appearance: none;
  background: ${p => (p.active ? 'var(--bg-elev)' : 'transparent')};
  color: ${p => (p.active ? 'var(--text)' : 'var(--text-dim)')};
  border: none;
  border-radius: 999px;
  padding: 6px 14px;
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition: 120ms ease-out;
  &:hover { color: var(--text); }
  small {
    margin-left: 6px;
    font-weight: 500;
    color: var(--text-muted);
    text-transform: none;
    letter-spacing: normal;
  }
`;

const Row = styled(Card)<{ tone: 'up' | 'down' | 'flat' }>`
  padding: 12px 14px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  border-left: 3px solid
    ${p => (p.tone === 'up' ? 'var(--up)' : p.tone === 'down' ? 'var(--down)' : 'var(--border)')};
`;

const Side = styled.span<{ tone: 'up' | 'down' }>`
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${p => (p.tone === 'up' ? 'var(--up)' : 'var(--down)')};
`;

const Mid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const Top = styled.div`
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 14px;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Bottom = styled.div`
  font-family: var(--font-sans);
  font-size: 11px;
  color: var(--text-dim);
  letter-spacing: 0.02em;
`;

const Right = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
`;

const PnL = styled.span<{ tone: 'up' | 'down' | 'flat' }>`
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: 14px;
  color: ${p => (p.tone === 'up' ? 'var(--up)' : p.tone === 'down' ? 'var(--down)' : 'var(--text)')};
`;

const SellButton = styled.button`
  appearance: none;
  background: var(--accent);
  color: #1a1410;
  border: none;
  border-radius: 8px;
  padding: 6px 12px;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  letter-spacing: 0.04em;
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const Empty = styled.div`
  text-align: center;
  color: var(--text-dim);
  padding: 32px 16px;
  font-size: 13px;
`;

const formatUSD = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatRemaining = (sec: number): string => {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
  return `${Math.floor(sec / 3600)}:${Math.floor((sec % 3600) / 60).toString().padStart(2, '0')}`;
};

const formatPrice = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const ActiveRow: React.FC<{ ticket: PartnerTicket; spotUSD: number; now: number; onSell: (id: number) => void; submitting: boolean }> = ({
  ticket,
  spotUSD,
  now,
  onSell,
  submitting,
}) => {
  const tenorSec = tenorToSeconds(ticket.tenor);
  const elapsed = Math.max(0, Math.floor((now - ticket.openedAt) / 1000));
  const remaining = Math.max(0, tenorSec - elapsed);
  const quote = earlyExitService.quote(ticket, spotUSD, now);
  const pnl = quote.pnlUSD.toNumber();
  const tone: 'up' | 'down' | 'flat' = pnl > 0.005 ? 'up' : pnl < -0.005 ? 'down' : 'flat';
  const sideTone: 'up' | 'down' = ticket.optionType === 'call' ? 'up' : 'down';

  return (
    <Row tone={tone}>
      <Side tone={sideTone}>{ticket.optionType === 'call' ? '↑ UP' : '↓ DOWN'}</Side>
      <Mid>
        <Top>
          ${formatPrice(ticket.strikePriceUSD.toNumber())} · ${formatUSD(ticket.premiumUSD.toNumber())} stake
        </Top>
        <Bottom>
          {ticket.tenor} · {formatRemaining(remaining)} left
        </Bottom>
      </Mid>
      <Right>
        <PnL tone={tone}>{pnl >= 0 ? '+' : ''}${formatUSD(pnl)}</PnL>
        <SellButton disabled={!quote.available || submitting} onClick={() => onSell(ticket.id)}>
          {submitting ? '…' : 'Sell'}
        </SellButton>
      </Right>
    </Row>
  );
};

const HistoryRow: React.FC<{ ticket: PartnerTicket }> = ({ ticket }) => {
  const won = ticket.outcome === 'win';
  const tied = ticket.outcome === 'tie';
  const tone: 'up' | 'down' | 'flat' = won ? 'up' : tied ? 'flat' : 'down';
  const sideTone: 'up' | 'down' = ticket.optionType === 'call' ? 'up' : 'down';
  const payout = ticket.payoutUSD?.toNumber() ?? 0;
  const premium = ticket.premiumUSD.toNumber();
  const pnl = won ? payout - premium : tied ? 0 : -premium;
  const outcomeLabel = won ? 'Win' : tied ? 'Tie' : ticket.status === 'cancelled' ? 'Sold' : 'Loss';
  const finalLabel =
    ticket.finalPriceUSD != null
      ? `final $${formatPrice(ticket.finalPriceUSD.toNumber())}`
      : ticket.status === 'cancelled'
        ? 'closed early'
        : '—';

  return (
    <Row tone={tone}>
      <Side tone={sideTone}>{ticket.optionType === 'call' ? '↑ UP' : '↓ DOWN'}</Side>
      <Mid>
        <Top>
          {outcomeLabel} · ${formatPrice(ticket.strikePriceUSD.toNumber())} · {ticket.tenor}
        </Top>
        <Bottom>
          ${formatUSD(premium)} stake · {finalLabel}
        </Bottom>
      </Mid>
      <Right>
        <PnL tone={tone}>{pnl >= 0 ? '+' : ''}${formatUSD(pnl)}</PnL>
      </Right>
    </Row>
  );
};

export const PositionsList: React.FC<PositionsListProps> = ({ spotUSD, onChanged }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [tickets, setTickets] = useState<PartnerTicket[]>([]);
  const [now, setNow] = useState(Date.now());
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const refresh = useMemo(
    () => async () => {
      if (!user) return;
      const all = await getPartnerExchange().getUserTickets(user.principal);
      setTickets(all);
    },
    [user],
  );

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      refresh().catch(() => {});
    }, 1000);
    return () => clearInterval(id);
  }, [refresh]);

  const active = tickets.filter(t => t.status === 'active');
  const history = tickets.filter(t => t.status !== 'active');

  const onSell = async (ticketId: number) => {
    setSubmittingId(ticketId);
    try {
      const r = await earlyExitService.sell({
        ticketId,
        spotUSD,
        idempotencyKey: `sellback:${ticketId}:${Date.now()}`,
      });
      if ('ok' in r) {
        await refresh();
        onChanged();
      }
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <Container>
      <TabRow>
        <TabButton active={tab === 'active'} onClick={() => setTab('active')}>
          Active <small>{active.length}</small>
        </TabButton>
        <TabButton active={tab === 'history'} onClick={() => setTab('history')}>
          History <small>{history.length}</small>
        </TabButton>
      </TabRow>

      {tab === 'active' &&
        (active.length === 0 ? (
          <Empty>No active tickets. Open one from the Trade tab.</Empty>
        ) : (
          active.map(t => (
            <ActiveRow
              key={t.id}
              ticket={t}
              spotUSD={spotUSD}
              now={now}
              onSell={onSell}
              submitting={submittingId === t.id}
            />
          ))
        ))}

      {tab === 'history' &&
        (history.length === 0 ? (
          <Empty>No settled trades yet.</Empty>
        ) : (
          history.map(t => <HistoryRow key={t.id} ticket={t} />)
        ))}
    </Container>
  );
};

// Suppress unused-import warning while transitioning legacy components.
const _ensureChip: typeof Chip = Chip;
void _ensureChip;
