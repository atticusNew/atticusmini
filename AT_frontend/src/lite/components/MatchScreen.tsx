import React, { useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useLiteSession } from '../state/LiteSessionProvider';
import { useSynchronizedPrice } from '../../hooks/useGlobalPriceFeed';
import { pricingEngine } from '../../services/OffChainPricingEngine';
import { useNow } from '../hooks/useNow';
import { MatchChart } from './MatchChart';
import { Screen, TopBar, Brand, Avatar, BigButton } from './ui';
import {
  bothClosed, closeSide, effectivePnlUSD, isExpired, livePnlUSD, openSide,
  secondsRemaining, settleMatch,
} from '../services/matchEngine';
import { chooseDirection, shouldSell } from '../services/botStrategy';
import type { Direction, MatchState } from '../types';

const Body = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px 16px 22px;
  min-height: 0;
`;

const VersusRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 10px;
`;

const Fighter = styled.div<{ align: 'left' | 'right' }>`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-direction: ${p => (p.align === 'right' ? 'row-reverse' : 'row')};
  text-align: ${p => p.align};
  .name { font-family: var(--font-display); font-weight: 700; font-size: 15px; }
  .dir { font-size: 12px; font-weight: 700; }
`;

const Vs = styled.div`
  font-family: var(--font-display);
  font-weight: 700;
  color: #fff;
  background: var(--purple);
  border: 2px solid var(--border-strong);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 14px;
  box-shadow: 2px 2px 0 var(--border-strong);
`;

const Timer = styled.div<{ tone: 'normal' | 'warn' | 'critical' }>`
  font-family: var(--font-display);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: 54px;
  text-align: center;
  line-height: 1;
  color: ${p => (p.tone === 'critical' ? 'var(--down)' : p.tone === 'warn' ? 'var(--accent)' : 'var(--text)')};
  -webkit-text-stroke: 1px var(--border-strong);
  animation: ${p => (p.tone === 'critical' ? 'litePulse 0.6s ease-in-out infinite' : 'none')};
`;

const PnlRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const PnlCard = styled.div<{ lead: boolean }>`
  background: ${p => (p.lead ? 'var(--accent)' : 'var(--bg-elev)')};
  border: 2px solid var(--border-strong);
  border-radius: 16px;
  padding: 12px;
  text-align: center;
  box-shadow: ${p => (p.lead ? 'var(--shadow-hard)' : 'none')};
  transition: 120ms ease-out;
  .who { font-size: 12px; color: var(--text); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.7; }
  .pnl { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-weight: 800; font-size: 24px; margin-top: 4px; }
`;

const Pot = styled.div`
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-dim);
  .v { color: var(--text); font-weight: 800; }
`;

const DirRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const fmt = (n: number): string => `${n >= 0 ? '+' : '−'}$${Math.abs(n).toFixed(2)}`;

const recentReturn = (): number => {
  const hist = pricingEngine.getPriceHistory(1);
  if (hist.length < 2) return 0;
  const last = hist[hist.length - 1]?.price ?? 0;
  const ref = hist[Math.max(0, hist.length - 12)]?.price ?? 0;
  return ref > 0 ? (last - ref) / ref : 0;
};

export const MatchScreen: React.FC = () => {
  const { match, opponent, setMatch, commitResult, goLobby } = useLiteSession();
  const { priceState } = useSynchronizedPrice();
  const spot = priceState.current;
  const live = match?.phase === 'live';
  const now = useNow(250, live);

  const seriesRef = useRef<Array<{ t: number; p: number }>>([]);
  const settledRef = useRef(false);

  // Capture the price path during the live window for the chart.
  useEffect(() => {
    if (live && spot > 0) {
      seriesRef.current = [...seriesRef.current, { t: now, p: spot }].slice(-120);
    }
  }, [live, now, spot]);

  const arm = useCallback(
    (dir: Direction) => {
      if (!match || match.phase !== 'arming' || spot <= 0) return;
      seriesRef.current = [{ t: Date.now(), p: spot }];
      settledRef.current = false;
      const you = openSide(match.you, dir, spot);
      let opp = match.opp;
      if (match.mode === 'pvp') {
        const od = chooseDirection(recentReturn(), opponent?.skill ?? 0.5);
        opp = openSide(match.opp, od, spot);
      }
      setMatch({
        ...match,
        you,
        opp,
        entrySpot: spot,
        startedAt: Date.now(),
        phase: 'live',
      });
    },
    [match, spot, opponent, setMatch],
  );

  const sellYou = useCallback(() => {
    if (!match || match.phase !== 'live') return;
    setMatch({ ...match, you: closeSide(match.you, spot, Date.now()) });
  }, [match, spot, setMatch]);

  // Live loop: drive the bot + settle on expiry.
  useEffect(() => {
    if (!match || match.phase !== 'live' || spot <= 0 || settledRef.current) return;

    let next = match;

    if (match.mode === 'pvp' && opponent && next.opp.status === 'open') {
      const sec = secondsRemaining(next, now);
      if (shouldSell({ opponent, side: next.opp, spot, secondsRemaining: sec })) {
        next = { ...next, opp: closeSide(next.opp, spot, now) };
      }
    }

    if (isExpired(next, now) || bothClosedForMode(next)) {
      settledRef.current = true;
      const settled = settleMatch(next, spot, now);
      setMatch(settled);
      if (settled.result) commitResult(settled.result);
      return;
    }

    if (next !== match) setMatch(next);
  }, [match, now, spot, opponent, setMatch, commitResult]);

  if (!match) {
    return (
      <Screen>
        <TopBar><Brand><span>Atticus</span><span className="lite">Lite</span></Brand></TopBar>
        <Body><Pot>Setting up…</Pot></Body>
      </Screen>
    );
  }

  const sec = match.phase === 'live' ? Math.ceil(secondsRemaining(match, now)) : match.durationSec;
  const tone = sec <= 5 ? 'critical' : sec <= 10 ? 'warn' : 'normal';
  const youPnl = effectivePnlUSD(match.you, spot);
  const oppPnl = match.mode === 'pvp' ? effectivePnlUSD(match.opp, spot) : 0;
  const youLead = match.mode === 'solo' ? youPnl > 0 : youPnl >= oppPnl;

  const dirLabel = (d: Direction | null): string =>
    d === 'up' ? '▲ HIGH' : d === 'down' ? '▼ LOW' : '—';

  return (
    <Screen>
      <TopBar>
        <Brand><span onClick={goLobby} style={{ cursor: 'pointer' }}>← Quit</span></Brand>
        <Pot>{match.mode === 'pvp' ? <>Wager <span className="v">${match.wagerUSD}</span></> : <>Solo</>}</Pot>
      </TopBar>

      <Body>
        <VersusRow>
          <Fighter align="left">
            <Avatar src={match.you.avatar} size={40} />
            <div>
              <div className="name">{match.you.name}</div>
              <div className="dir" style={{ color: match.you.direction === 'up' ? 'var(--up)' : match.you.direction === 'down' ? 'var(--down)' : 'var(--text-dim)' }}>
                {dirLabel(match.you.direction)}
              </div>
            </div>
          </Fighter>
          <Vs>VS</Vs>
          <Fighter align="right">
            {match.mode === 'pvp' ? (
              <>
                <Avatar src={match.opp.avatar} size={40} />
                <div>
                  <div className="name">{match.opp.name}</div>
                  <div className="dir" style={{ color: match.opp.direction === 'up' ? 'var(--up)' : match.opp.direction === 'down' ? 'var(--down)' : 'var(--text-dim)' }}>
                    {dirLabel(match.opp.direction)}
                  </div>
                </div>
              </>
            ) : (
              <div className="name" style={{ color: 'var(--text-dim)' }}>Beat $0</div>
            )}
          </Fighter>
        </VersusRow>

        <Timer tone={tone}>{sec}s</Timer>

        <MatchChart series={seriesRef.current} entrySpot={match.entrySpot} spot={spot} />

        <PnlRow>
          <PnlCard lead={youLead}>
            <div className="who">You</div>
            <div className="pnl" style={{ color: youPnl >= 0 ? 'var(--up)' : 'var(--down)' }}>{fmt(youPnl)}</div>
          </PnlCard>
          <PnlCard lead={!youLead && match.mode === 'pvp'}>
            <div className="who">{match.mode === 'pvp' ? match.opp.name : 'Target'}</div>
            <div className="pnl" style={{ color: oppPnl >= 0 ? 'var(--up)' : 'var(--down)' }}>
              {match.mode === 'pvp' ? fmt(oppPnl) : '$0.00'}
            </div>
          </PnlCard>
        </PnlRow>

        <div style={{ flex: 1 }} />

        {match.phase === 'arming' ? (
          <>
            <Pot>Pick your side — locks in your entry at the live price</Pot>
            <DirRow>
              <BigButton tone="up" disabled={spot <= 0} onClick={() => arm('up')}>▲ HIGH</BigButton>
              <BigButton tone="down" disabled={spot <= 0} onClick={() => arm('down')}>▼ LOW</BigButton>
            </DirRow>
          </>
        ) : match.you.status === 'open' ? (
          <BigButton tone="ghost" onClick={sellYou}>
            Sell now · lock {fmt(livePnlUSD(match.you, spot))}
          </BigButton>
        ) : (
          <Pot>Position locked at {fmt(match.you.realizedPnlUSD ?? 0)} — waiting on the clock…</Pot>
        )}
      </Body>
    </Screen>
  );
};

/** Solo only needs your side closed; PvP needs both. */
function bothClosedForMode(match: MatchState): boolean {
  if (match.mode === 'solo') return match.you.status === 'closed';
  return bothClosed(match);
}
