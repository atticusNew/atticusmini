/**
 * Shared duel scoreboard — used by both the bot match and the live P2P match so
 * trade-play reads identically. Each player's color matches their chart line
 * (YOU = gold, opponent = cyan) via a thick colored border + dot, so it's
 * obvious who's who. Big PnL, clear direction.
 */

import React from 'react';
import styled from 'styled-components';

export const YOU_COLOR = '#ffd23f';
export const OPP_COLOR = '#41d7ff';

export interface SidePresentation {
  name: string;
  direction: 'up' | 'down' | null;
  pnl: number;
  lead: boolean;
  color: string;
  isYou: boolean;
  /** Shown instead of direction/PnL for the solo "target" slot. */
  placeholder?: string;
}

const Bar = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: stretch;
  gap: 8px;
`;

const Side = styled.div<{ accent: string; side: 'you' | 'opp'; lead: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 16px;
  align-items: ${p => (p.side === 'opp' ? 'flex-end' : 'flex-start')};
  background: var(--bg-elev);
  border: 3px solid ${p => p.accent};
  box-shadow: ${p => (p.lead ? `0 0 0 3px ${p.accent}55, var(--shadow-hard)` : '2px 2px 0 var(--border-strong)')};
  transition: box-shadow 200ms ease;

  .top {
    display: flex; align-items: center; gap: 8px;
    flex-direction: ${p => (p.side === 'opp' ? 'row-reverse' : 'row')};
    max-width: 100%;
  }
  .dot { width: 14px; height: 14px; border-radius: 50%; background: ${p => p.accent}; border: 2px solid var(--border-strong); flex-shrink: 0; }
  .name { font-family: var(--font-display); font-weight: 700; font-size: 16px; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .who { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: ${p => p.accent}; }
  .dir {
    font-family: var(--font-display); font-weight: 700; font-size: 12px;
    padding: 2px 8px; border-radius: 999px; color: #fff;
  }
  .pnl { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-weight: 800; font-size: 26px; line-height: 1; }
  .ph { font-family: var(--font-mono); font-weight: 700; font-size: 16px; color: var(--text-dim); }
`;

const Vs = styled.div`
  align-self: center;
  font-family: var(--font-display);
  font-weight: 700;
  color: #fff;
  background: var(--purple);
  border: 2px solid var(--border-strong);
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 13px;
  box-shadow: 2px 2px 0 var(--border-strong);
`;

const dirText = (d: 'up' | 'down' | null): string =>
  d === 'up' ? '▲ HIGH' : d === 'down' ? '▼ LOW' : '';

const fmt = (n: number): string => `${n >= 0 ? '+' : '−'}$${Math.abs(n).toFixed(2)}`;

const SideCard: React.FC<{ s: SidePresentation }> = ({ s }) => (
  <Side accent={s.color} side={s.isYou ? 'you' : 'opp'} lead={s.lead}>
    <div className="top">
      <span className="dot" />
      <span className="name">{s.isYou ? 'You' : s.name}{s.lead ? ' 👑' : ''}</span>
    </div>
    {s.placeholder ? (
      <span className="ph">{s.placeholder}</span>
    ) : (
      <>
        {s.direction && (
          <span className="dir" style={{ background: s.direction === 'up' ? 'var(--up)' : 'var(--down)' }}>
            {dirText(s.direction)}
          </span>
        )}
        <span className="pnl" style={{ color: s.pnl >= 0 ? 'var(--up)' : 'var(--down)' }}>
          {s.direction ? fmt(s.pnl) : '—'}
        </span>
      </>
    )}
  </Side>
);

export const Scoreboard: React.FC<{ you: SidePresentation; opp: SidePresentation }> = ({ you, opp }) => (
  <Bar>
    <SideCard s={you} />
    <Vs>VS</Vs>
    <SideCard s={opp} />
  </Bar>
);
