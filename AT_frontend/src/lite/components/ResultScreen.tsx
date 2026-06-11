import React from 'react';
import styled from 'styled-components';
import { useLiteSession } from '../state/LiteSessionProvider';
import { Screen, TopBar, Brand, BalanceTag, BigButton, Pop } from './ui';

const Body = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  text-align: center;
`;

const Banner = styled.div<{ outcome: 'you' | 'opp' | 'push' }>`
  font-family: var(--font-display);
  font-size: 52px;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1;
  color: ${p => (p.outcome === 'you' ? 'var(--up)' : p.outcome === 'opp' ? 'var(--down)' : 'var(--accent)')};
  -webkit-text-stroke: 1.5px var(--border-strong);
`;

const Net = styled.div<{ pos: boolean }>`
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  font-size: 34px;
  color: ${p => (p.pos ? 'var(--up)' : 'var(--down)')};
`;

const Breakdown = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 320px;
  font-size: 14px;
  .row { display: flex; justify-content: space-between; color: var(--text-dim); }
  .row .v { font-family: var(--font-mono); font-variant-numeric: tabular-nums; color: var(--text); font-weight: 700; }
`;

const fmt = (n: number): string => `${n >= 0 ? '+' : '−'}$${Math.abs(n).toFixed(2)}`;

export const ResultScreen: React.FC = () => {
  const { match, balance, rematch, goLobby } = useLiteSession();
  const result = match?.result;

  if (!match || !result) {
    return (
      <Screen>
        <TopBar><Brand><span>Atticus</span><span className="lite">Lite</span></Brand></TopBar>
        <Body><BigButton onClick={goLobby}>Back to lobby</BigButton></Body>
      </Screen>
    );
  }

  const title =
    result.outcome === 'you' ? 'YOU WIN' : result.outcome === 'opp' ? 'YOU LOSE' : 'PUSH';

  return (
    <Screen>
      <TopBar>
        <Brand>
          <img src="/images/atticus-logo.jpg" alt="Atticus" />
          <span>Atticus</span><span className="lite">Lite</span>
        </Brand>
        <BalanceTag>${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</BalanceTag>
      </TopBar>

      <Body>
        <Pop>
          <Banner outcome={result.outcome}>{title}</Banner>
        </Pop>
        <Net pos={result.youNetUSD >= 0}>{fmt(result.youNetUSD)}</Net>

        <Breakdown>
          <div className="row"><span>Your trade PnL</span><span className="v">{fmt(result.youPnlUSD)}</span></div>
          {match.mode === 'pvp' && (
            <>
              <div className="row"><span>{match.opp.name} PnL</span><span className="v">{fmt(result.oppPnlUSD)}</span></div>
              <div className="row">
                <span>Wager</span>
                <span className="v">
                  {result.outcome === 'you' ? fmt(result.wagerUSD) : result.outcome === 'opp' ? fmt(-result.wagerUSD) : '$0.00'}
                </span>
              </div>
            </>
          )}
        </Breakdown>

        <div style={{ height: 8 }} />

        <BigButton onClick={rematch}>Re-MATCH ✓</BigButton>
        <BigButton tone="ghost" onClick={goLobby}>Back to lobby</BigButton>
      </Body>
    </Screen>
  );
};
