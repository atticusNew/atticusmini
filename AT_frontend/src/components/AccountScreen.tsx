import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthProvider';
import { useBalance } from '../contexts/BalanceProvider';
import { ledgerService } from '../services/ledger/LedgerService';
import type { TraderLedgerEntry } from '../services/ledger/LedgerService';
import { mockPartnerExchangeAdapter } from '../services/partner';
import { Card } from '../ui/primitives';
// `mockPartnerExchangeAdapter` retained for the partner-name display; reset is
// handled by `resetPaperBalance` so session P&L resets too.

interface AccountScreenProps {
  onLogout: () => void | Promise<void>;
  onReset: () => void;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0 16px;
`;

const BalanceCard = styled(Card)`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Eyebrow = styled.div`
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-dim);
`;

const Big = styled.div`
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: 28px;
  color: var(--text);
`;

const PartnerLine = styled.div`
  font-size: 12px;
  color: var(--text-dim);
  margin-top: 6px;
`;

const SectionTitle = styled.div`
  margin: 12px 4px 4px;
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-dim);
`;

const LedgerRow = styled.div<{ tone: 'pos' | 'neg' | 'flat' }>`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: baseline;
  padding: 10px 14px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 10px;

  .left {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .kind {
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--text);
  }
  .meta {
    font-family: var(--font-sans);
    font-size: 11px;
    color: var(--text-dim);
    letter-spacing: 0.02em;
  }
  .amount {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    font-size: 14px;
    color: ${p => (p.tone === 'pos' ? 'var(--up)' : p.tone === 'neg' ? 'var(--down)' : 'var(--text)')};
  }
`;

const Empty = styled.div`
  text-align: center;
  color: var(--text-dim);
  padding: 24px 12px;
  font-size: 13px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 10px;
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 12px;
`;

const SecondaryButton = styled.button`
  appearance: none;
  flex: 1;
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: 120ms ease-out;
  &:hover { border-color: var(--border-strong); }
`;

const DangerButton = styled(SecondaryButton)`
  &:hover { border-color: var(--down); color: var(--down); }
`;

const KIND_LABEL: Record<TraderLedgerEntry['kind'], string> = {
  premium_debit: 'Stake placed',
  payout_credit: 'Win payout',
  sellback_refund_credit: 'Sold back',
  tie_refund_credit: 'Tie refund',
  admin_credit: 'Adjustment',
  admin_debit: 'Adjustment',
};

const isCredit = (k: TraderLedgerEntry['kind']): boolean =>
  k === 'payout_credit' || k === 'sellback_refund_credit' || k === 'tie_refund_credit' || k === 'admin_credit';

const formatUSD = (n: string): string => {
  const num = parseFloat(n);
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatRelative = (ts: number): string => {
  const delta = Math.max(0, Date.now() - ts);
  const s = Math.floor(delta / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export const AccountScreen: React.FC<AccountScreenProps> = ({ onLogout, onReset }) => {
  const { user } = useAuth();
  const { userBalance, resetPaperBalance } = useBalance();
  const [entries, setEntries] = useState<TraderLedgerEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const refresh = async () => {
      const all = await ledgerService.getTraderEntriesForUser(user.principal);
      if (!cancelled) setEntries(all.slice(-12).reverse());
    };
    refresh().catch(() => {});
    const id = setInterval(() => { refresh().catch(() => {}); }, 2000);
    return () => { cancelled = true; clearInterval(id); };
  }, [user]);

  const partner = useMemo(() => mockPartnerExchangeAdapter.name, []);

  const handleReset = async () => {
    await resetPaperBalance();
    onReset();
  };

  return (
    <Container>
      <BalanceCard>
        <Eyebrow>Balance</Eyebrow>
        <Big>${userBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Big>
        <PartnerLine>
          {user?.displayName ?? user?.principal} · partner: <span style={{ color: 'var(--text)' }}>{partner}</span>
        </PartnerLine>
      </BalanceCard>

      <SectionTitle>Recent activity</SectionTitle>
      {entries.length === 0 ? (
        <Empty>No ledger activity yet. Place a trade from the Trade tab.</Empty>
      ) : (
        entries.map(e => {
          const credit = isCredit(e.kind);
          const tone: 'pos' | 'neg' | 'flat' = credit ? 'pos' : 'neg';
          return (
            <LedgerRow key={e.id} tone={tone}>
              <div className="left">
                <span className="kind">{KIND_LABEL[e.kind] ?? e.kind}</span>
                <span className="meta">
                  {e.ticketId ? `ticket #${e.ticketId} · ` : ''}{formatRelative(e.createdAt)}
                </span>
              </div>
              <span className="amount">
                {credit ? '+' : '−'}${formatUSD(e.amountUSD)}
              </span>
            </LedgerRow>
          );
        })
      )}

      <Actions>
        <DangerButton onClick={handleReset}>Reset demo</DangerButton>
        <SecondaryButton onClick={() => onLogout()}>Sign out</SecondaryButton>
      </Actions>
    </Container>
  );
};
