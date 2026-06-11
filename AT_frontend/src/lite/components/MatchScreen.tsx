import React, { useCallback, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { useLiteSession } from '../state/LiteSessionProvider';
import { useSynchronizedPrice } from '../../hooks/useGlobalPriceFeed';
import { pricingEngine } from '../../services/OffChainPricingEngine';
import { useNow } from '../hooks/useNow';
import { MatchChart, type StrikeMark } from './MatchChart';
import { Screen, TopBar, Avatar, BigButton } from './ui';
import {
  bothClosed, closeSide, effectivePnlUSD, isExpired, livePnlUSD, openSide,
  secondsRemaining, settleMatch,
} from '../services/matchEngine';
import { chooseDirection, shouldSell } from '../services/botStrategy';
import type { Direction, MatchSide, MatchState } from '../types';

const ARM_SECONDS = 5;
const YOU_COLOR = '#ffd23f';
const OPP_COLOR = '#41d7ff';

const Body = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 14px 18px;
  min-height: 0;
`;

const UserChip = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  .quit { cursor: pointer; font-size: 20px; font-weight: 700; color: var(--text); padding-right: 2px; }
  .uname {
    font-family: var(--font-display); font-weight: 700; font-size: 15px; color: var(--text);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 160px;
  }
`;

const ScoreBar = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 10px;
`;

const ScoreSide = styled.div<{ side: 'you' | 'opp'; lead: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 12px;
  align-items: ${p => (p.side === 'opp' ? 'flex-end' : 'flex-start')};
  border: 2px solid transparent;
  /* Non-jarring lead cue: a soft fade, no size/border layout shift. */
  background: ${p => (p.lead ? 'var(--bg-elev)' : 'transparent')};
  box-shadow: ${p => (p.lead ? 'inset 0 0 0 2px var(--accent)' : 'none')};
  transition: background 220ms ease, box-shadow 220ms ease;
  .name {
    display: flex; align-items: center; gap: 6px;
    flex-direction: ${p => (p.side === 'opp' ? 'row-reverse' : 'row')};
    font-family: var(--font-display); font-weight: 700; font-size: 13px; color: var(--text);
    max-width: 100%; overflow: hidden; white-space: nowrap;
  }
  .dot { width: 9px; height: 9px; border-radius: 50%; border: 1.5px solid var(--border-strong); flex-shrink: 0; }
  .crown { width: 16px; text-align: center; flex-shrink: 0; }
  .pnl { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-weight: 800; font-size: 20px; }
`;

const Vs = styled.div`
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--text-dim);
  font-size: 13px;
`;

const TopTimer = styled.div<{ tone: 'normal' | 'warn' | 'critical' }>`
  font-family: var(--font-display);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: 26px;
  line-height: 1;
  color: ${p => (p.tone === 'critical' ? 'var(--down)' : p.tone === 'warn' ? 'var(--accent)' : 'var(--text)')};
  animation: ${p => (p.tone === 'critical' ? 'litePulse 0.6s ease-in-out infinite' : 'none')};
  span { font-size: 13px; color: var(--text-dim); }
`;

const TopLabel = styled.div`
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-dim);
`;

const ChartFrame = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  min-height: 0;
`;

const pulseRing = keyframes`
  0% { transform: scale(0.92); }
  50% { transform: scale(1.04); }
  100% { transform: scale(0.92); }
`;

const ArmOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(20, 15, 40, 0.42);
  border-radius: 18px;
  pointer-events: none;
`;

const ArmRing = styled.div<{ crit: boolean }>`
  width: 110px;
  height: 110px;
  border-radius: 50%;
  border: 6px solid ${p => (p.crit ? 'var(--down)' : 'var(--accent)')};
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(20,15,40,0.5);
  animation: ${pulseRing} 1s ease-in-out infinite;
  .n { font-family: var(--font-display); font-weight: 700; font-size: 56px; color: #fff; -webkit-text-stroke: 1px var(--border-strong); }
`;

const ArmHint = styled.div`
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 16px;
  color: #fff;
  text-shadow: 0 2px 6px rgba(0,0,0,0.5);
  letter-spacing: 0.04em;
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
  const now = useNow(120, true);

  const seriesRef = useRef<Array<{ t: number; p: number }>>([]);
  const settledRef = useRef(false);
  const botDelayMsRef = useRef(0);
  // Arming pick-clock start, keyed to the match so a re-match resets it.
  const armRef = useRef<{ id: string; at: number }>({ id: '', at: 0 });
  if (match && match.phase === 'arming' && armRef.current.id !== match.id) {
    armRef.current = { id: match.id, at: Date.now() };
  }

  useEffect(() => {
    if (live && spot > 0) {
      seriesRef.current = [...seriesRef.current, { t: now, p: spot }].slice(-160);
    }
  }, [live, now, spot]);

  const arm = useCallback(
    (dir: Direction) => {
      if (!match || match.phase !== 'arming' || spot <= 0) return;
      const t = Date.now();
      seriesRef.current = [{ t, p: spot }];
      settledRef.current = false;
      botDelayMsRef.current = 600 + Math.random() * 1800;
      const you = openSide(match.you, dir, spot, t);
      setMatch({ ...match, you, entrySpot: spot, startedAt: t, phase: 'live' });
    },
    [match, spot, setMatch],
  );

  // Auto-pick when the 5s arming clock runs out, so the round always starts.
  useEffect(() => {
    if (match?.phase === 'arming' && spot > 0 && armRef.current.id === match.id) {
      if (now - armRef.current.at >= ARM_SECONDS * 1000) {
        arm(chooseDirection(recentReturn(), 0.5));
      }
    }
  }, [match, now, spot, arm]);

  const sellYou = useCallback(() => {
    if (!match || match.phase !== 'live') return;
    setMatch({ ...match, you: closeSide(match.you, spot, Date.now()) });
  }, [match, spot, setMatch]);

  // Live loop: drive the bot + settle on expiry.
  useEffect(() => {
    if (!match || match.phase !== 'live' || spot <= 0 || settledRef.current) return;
    let next = match;
    const elapsedMs = match.startedAt != null ? now - match.startedAt : 0;

    if (match.mode === 'pvp' && opponent && next.opp.status === 'idle' && elapsedMs >= botDelayMsRef.current) {
      const od = chooseDirection(recentReturn(), opponent.skill);
      next = { ...next, opp: openSide(next.opp, od, spot, now) };
    }
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
        <TopBar><UserChip><span className="uname">Atticus Lite</span></UserChip></TopBar>
        <Body><Pot>Setting up…</Pot></Body>
      </Screen>
    );
  }

  const sec = live ? Math.ceil(secondsRemaining(match, now)) : match.durationSec;
  const tone = sec <= 5 ? 'critical' : sec <= 10 ? 'warn' : 'normal';
  const youPnl = effectivePnlUSD(match.you, spot);
  const oppPnl = match.mode === 'pvp' ? effectivePnlUSD(match.opp, spot) : 0;
  // Deadband so the lead doesn't flicker when PnLs are near-equal.
  const LEAD_EPS = 0.05;
  const leader: 'you' | 'opp' | null = match.mode === 'solo'
    ? (youPnl > LEAD_EPS ? 'you' : null)
    : (Math.abs(youPnl - oppPnl) <= LEAD_EPS ? null : (youPnl > oppPnl ? 'you' : 'opp'));
  const youLead = live && leader === 'you';
  const oppLead = live && leader === 'opp';

  const strikes: StrikeMark[] = [];
  if (match.you.direction && match.you.strikeUSD && match.you.entrySpot && match.you.entryAt) {
    strikes.push({ price: match.you.strikeUSD, entrySpot: match.you.entrySpot, entryAt: match.you.entryAt, direction: match.you.direction, label: 'YOU', you: true });
  }
  if (match.mode === 'pvp' && match.opp.direction && match.opp.strikeUSD && match.opp.entrySpot && match.opp.entryAt) {
    strikes.push({ price: match.opp.strikeUSD, entrySpot: match.opp.entrySpot, entryAt: match.opp.entryAt, direction: match.opp.direction, label: match.opp.name, you: false });
  }

  const chartSeries = live
    ? seriesRef.current
    : pricingEngine.getPriceHistory(0.6).map(h => ({ t: h.timestamp, p: h.price }));

  const armRemaining = Math.max(0, Math.ceil(ARM_SECONDS - (now - armRef.current.at) / 1000));

  const renderSide = (side: MatchSide, who: 'you' | 'opp', pnl: number, lead: boolean, color: string, name: string) => {
    const arrow = side.direction === 'up' ? '▲ ' : side.direction === 'down' ? '▼ ' : '';
    return (
      <ScoreSide side={who} lead={lead}>
        <span className="name">
          <span className="dot" style={{ background: color }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
          <span className="crown">{lead ? '👑' : ''}</span>
        </span>
        <span className="pnl" style={{ color: pnl >= 0 ? 'var(--up)' : 'var(--down)' }}>
          {side.direction ? `${arrow}${fmt(pnl)}` : '—'}
        </span>
      </ScoreSide>
    );
  };

  return (
    <Screen>
      <TopBar>
        <UserChip>
          <span className="quit" onClick={goLobby}>←</span>
          <Avatar src={match.you.avatar} size={30} />
          <span className="uname">{match.you.name}</span>
        </UserChip>
        {live
          ? <TopTimer tone={tone}>{sec}<span>s</span></TopTimer>
          : <TopLabel>{match.phase === 'arming' ? 'Get ready' : ''}</TopLabel>}
        <Pot>{match.mode === 'pvp' ? <>Wager <span className="v">${match.wagerUSD}</span></> : <>Solo</>}</Pot>
      </TopBar>

      <Body>
        <ChartFrame>
          <MatchChart
            series={chartSeries}
            now={now}
            live={live}
            windowStart={match.startedAt}
            durationSec={match.durationSec}
            spot={spot}
            strikes={strikes}
          />
          {match.phase === 'arming' && (
            <ArmOverlay>
              <ArmHint>PICK A SIDE</ArmHint>
              <ArmRing crit={armRemaining <= 2}>
                <span className="n">{armRemaining}</span>
              </ArmRing>
              <ArmHint style={{ fontSize: 13, opacity: 0.85 }}>
                {spot > 0 ? 'HIGH or LOW before the clock hits 0' : 'waiting for price…'}
              </ArmHint>
            </ArmOverlay>
          )}
        </ChartFrame>

        <ScoreBar>
          {renderSide(match.you, 'you', youPnl, youLead, YOU_COLOR, match.you.name)}
          <Vs>VS</Vs>
          {match.mode === 'pvp'
            ? renderSide(match.opp, 'opp', oppPnl, oppLead, OPP_COLOR, match.opp.name)
            : (
              <ScoreSide side="opp" lead={false}>
                <span className="name">Solo</span>
                <span className="pnl" style={{ color: 'var(--text-dim)' }}>beat $0</span>
              </ScoreSide>
            )}
        </ScoreBar>

        {match.phase === 'arming' ? (
          <DirRow>
            <BigButton tone="up" disabled={spot <= 0} onClick={() => arm('up')}>▲ HIGH</BigButton>
            <BigButton tone="down" disabled={spot <= 0} onClick={() => arm('down')}>▼ LOW</BigButton>
          </DirRow>
        ) : match.you.status === 'open' ? (
          <BigButton tone="ghost" onClick={sellYou}>
            Sell now · lock {fmt(livePnlUSD(match.you, spot))}
          </BigButton>
        ) : (
          <Pot>Locked at {fmt(match.you.realizedPnlUSD ?? 0)} — riding the clock…</Pot>
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
