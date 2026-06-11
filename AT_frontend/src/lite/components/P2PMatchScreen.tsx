import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useLiteSession } from '../state/LiteSessionProvider';
import { useSynchronizedPrice } from '../../hooks/useGlobalPriceFeed';
import { pricingEngine } from '../../services/OffChainPricingEngine';
import { useNow } from '../hooks/useNow';
import { MatchChart, type StrikeMark } from './MatchChart';
import { Screen, TopBar, Avatar, BigButton } from './ui';
import {
  closeSide, effectivePnlUSD, livePnlUSD, openSide, settleMatch,
} from '../services/matchEngine';
import { chooseDirection } from '../services/botStrategy';
import { haptics } from '../services/haptics';
import type { Direction, MatchResult, MatchSide, MatchState } from '../types';

const DURATION_SEC = 30;
// In relay (WS) mode the server sends the authoritative result; only settle
// locally (cross-tab BroadcastChannel mode) if none arrives within this grace.
const LOCAL_SETTLE_GRACE_MS = 1500;
const YOU_COLOR = '#ffd23f';
const OPP_COLOR = '#41d7ff';

const Body = styled.div`
  flex: 1; display: flex; flex-direction: column; gap: 12px;
  padding: 12px max(14px, env(safe-area-inset-left)) calc(18px + env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-right));
  min-height: 0;
`;
const UserChip = styled.div`
  display: flex; align-items: center; gap: 10px; min-width: 0;
  .meta { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .uname { font-family: var(--font-display); font-weight: 700; font-size: 18px; color: var(--text); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.1; }
  .ubal { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-weight: 700; font-size: 12px; color: var(--text-dim); }
`;
const TopTimer = styled.div<{ tone: 'normal' | 'warn' | 'critical' }>`
  width: 58px; height: 58px; border-radius: 50%; display: flex; flex-direction: column;
  align-items: center; justify-content: center; border: 3px solid var(--border-strong);
  box-shadow: var(--shadow-hard);
  background: ${p => (p.tone === 'critical' ? 'var(--down)' : p.tone === 'warn' ? 'var(--accent)' : 'var(--up)')};
  color: ${p => (p.tone === 'critical' ? '#fff' : '#140f28')};
  font-family: var(--font-display); font-weight: 700; line-height: 1;
  .n { font-size: 26px; } .u { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.8; }
  animation: ${p => (p.tone === 'critical' ? 'litePulse 0.55s ease-in-out infinite' : 'none')};
`;
const WagerPill = styled.div`
  font-family: var(--font-display); font-weight: 700; font-size: 13px; color: var(--text);
  background: var(--accent); border: 2px solid var(--border-strong); border-radius: 999px;
  padding: 5px 11px; box-shadow: 2px 2px 0 var(--border-strong); white-space: nowrap;
  .lbl { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.7; }
`;
const ChartFrame = styled.div`position: relative; flex: 1; display: flex; min-height: 0;`;
const BtcTag = styled.div`
  position: absolute; top: 10px; left: 50%; transform: translateX(-50%); z-index: 2;
  display: flex; align-items: baseline; gap: 6px; padding: 5px 12px; border-radius: 999px;
  background: rgba(20,15,40,0.78); border: 1.5px solid rgba(255,255,255,0.25);
  .lbl { font-family: var(--font-display); font-weight: 700; font-size: 11px; color: #c9b8ff; letter-spacing: 0.08em; }
  .val { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-weight: 800; font-size: 16px; color: #fff; }
`;
const ArmOverlay = styled.div`
  position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 10px; background: rgba(20,15,40,0.42); border-radius: 18px; pointer-events: none;
`;
const ArmRing = styled.div<{ crit: boolean }>`
  width: 110px; height: 110px; border-radius: 50%;
  border: 6px solid ${p => (p.crit ? 'var(--down)' : 'var(--accent)')};
  display: flex; align-items: center; justify-content: center; background: rgba(20,15,40,0.5);
  .n { font-family: var(--font-display); font-weight: 700; font-size: 56px; color: #fff; -webkit-text-stroke: 1px var(--border-strong); }
`;
const ArmHint = styled.div`font-family: var(--font-display); font-weight: 700; font-size: 19px; color: #fff; text-shadow: 0 2px 6px rgba(0,0,0,0.55); text-align: center;`;
const ArmSub = styled.div`font-family: var(--font-sans); font-weight: 600; font-size: 13px; line-height: 1.5; color: #fff; text-align: center; text-shadow: 0 2px 6px rgba(0,0,0,0.6); max-width: 280px; b { font-weight: 800; }`;
const ScoreBar = styled.div`display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px;`;
const ScoreSide = styled.div<{ side: 'you' | 'opp'; lead: boolean }>`
  display: flex; flex-direction: column; gap: 3px; padding: 10px 12px; border-radius: 14px;
  align-items: ${p => (p.side === 'opp' ? 'flex-end' : 'flex-start')};
  background: var(--bg-elev); border: 2px solid var(--border-strong);
  box-shadow: ${p => (p.lead ? 'inset 0 0 0 3px var(--accent), var(--shadow-hard)' : '2px 2px 0 var(--border-strong)')};
  transition: box-shadow 220ms ease;
  .name { display: flex; align-items: center; gap: 6px; flex-direction: ${p => (p.side === 'opp' ? 'row-reverse' : 'row')}; font-family: var(--font-display); font-weight: 700; font-size: 14px; color: var(--text); max-width: 100%; overflow: hidden; white-space: nowrap; }
  .dot { width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid var(--border-strong); flex-shrink: 0; }
  .crown { width: 16px; text-align: center; flex-shrink: 0; }
  .lbl { font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
  .pnl { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-weight: 800; font-size: 23px; line-height: 1; }
`;
const Vs = styled.div`font-family: var(--font-display); font-weight: 700; color: var(--text-dim); font-size: 13px;`;
const DirRow = styled.div`display: grid; grid-template-columns: 1fr 1fr; gap: 10px;`;
const Note = styled.div`text-align: center; font-size: 14px; font-weight: 600; color: var(--text-dim);`;
const LockedCard = styled.div`
  display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px;
  border-radius: 14px; background: var(--bg-elev); border: 2px dashed var(--border-strong);
  font-family: var(--font-display); font-weight: 700; font-size: 15px; color: var(--text-dim);
  .badge { font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #fff; background: var(--purple); border: 2px solid var(--border-strong); border-radius: 999px; padding: 3px 9px; }
  .amt { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-weight: 800; font-size: 17px; }
`;

const fmt = (n: number): string => `${n >= 0 ? '+' : '−'}$${Math.abs(n).toFixed(2)}`;
const recentReturn = (): number => {
  const hist = pricingEngine.getPriceHistory(1);
  if (hist.length < 2) return 0;
  const last = hist[hist.length - 1]?.price ?? 0;
  const ref = hist[Math.max(0, hist.length - 12)]?.price ?? 0;
  return ref > 0 ? (last - ref) / ref : 0;
};

export const P2PMatchScreen: React.FC = () => {
  const { match, peer, balance, setMatch, commitResult } = useLiteSession();
  const { priceState } = useSynchronizedPrice();
  const spot = priceState.current;
  const now = useNow(120, true);

  const [chosenDir, setChosenDir] = useState<Direction | null>(null);
  const seriesRef = useRef<Array<{ t: number; p: number }>>([]);
  const matchRef = useRef<MatchState | null>(match);
  matchRef.current = match;
  const youEnteredRef = useRef(false);
  const settledRef = useRef(false);

  const liveStartAt = peer?.info.liveStartAt ?? 0;
  const expiryAt = liveStartAt + DURATION_SEC * 1000;
  const phase: 'arming' | 'live' | 'settled' =
    !liveStartAt ? 'arming' : now < liveStartAt ? 'arming' : now < expiryAt ? 'live' : 'settled';
  const live = phase === 'live';

  // Room: identify ourselves to the relay, then handle peer + authoritative msgs.
  useEffect(() => {
    if (!peer) return;
    const unsub = peer.room.subscribe(msg => {
      const m = matchRef.current;
      if (!m) return;
      if (msg.t === 'entry' && m.opp.status === 'idle') {
        setMatch({ ...m, opp: openSide(m.opp, msg.dir, msg.entrySpot, msg.at) });
      } else if (msg.t === 'sell' && m.opp.status === 'open') {
        setMatch({ ...m, opp: closeSide(m.opp, msg.spot, msg.at) });
      } else if (msg.t === 'settle') {
        if (settledRef.current) return;
        settledRef.current = true;
        const result: MatchResult = {
          outcome: msg.outcome,
          youPnlUSD: msg.youPnlUSD,
          oppPnlUSD: msg.oppPnlUSD,
          youNetUSD: msg.youNetUSD,
          wagerUSD: msg.wagerUSD,
          finalSpot: msg.finalSpot,
        };
        haptics.settle();
        setMatch({
          ...m,
          phase: 'settled',
          result,
          you: { ...m.you, status: 'closed', realizedPnlUSD: msg.youPnlUSD },
          opp: { ...m.opp, status: 'closed', realizedPnlUSD: msg.oppPnlUSD },
        });
        commitResult(result);
      }
    });
    peer.room.send({ t: 'join', role: peer.info.role });
    return unsub;
  }, [peer, setMatch, commitResult]);

  // Capture price path during the live window.
  useEffect(() => {
    if (live && spot > 0) {
      seriesRef.current = [...seriesRef.current, { t: now, p: spot }].slice(-160);
    }
  }, [live, now, spot]);

  // Lock YOUR entry exactly at the shared live start (auto-pick if undecided).
  useEffect(() => {
    const m = matchRef.current;
    if (!m || !peer || youEnteredRef.current) return;
    if (now >= liveStartAt && liveStartAt > 0 && spot > 0) {
      youEnteredRef.current = true;
      const dir = chosenDir ?? chooseDirection(recentReturn(), 0.5);
      const you = openSide(m.you, dir, spot, liveStartAt);
      seriesRef.current = [{ t: liveStartAt, p: spot }];
      setMatch({ ...m, you, entrySpot: spot, startedAt: liveStartAt });
      peer.room.send({ t: 'entry', dir, entrySpot: spot, at: liveStartAt });
      haptics.pick();
    }
  }, [now, liveStartAt, spot, chosenDir, peer, setMatch]);

  // Fallback settlement (cross-tab/no-relay): only if the authoritative relay
  // result hasn't arrived shortly after expiry.
  useEffect(() => {
    const m = matchRef.current;
    if (!m || settledRef.current) return;
    if (phase === 'settled' && liveStartAt > 0 && spot > 0 && now >= expiryAt + LOCAL_SETTLE_GRACE_MS) {
      settledRef.current = true;
      const settled = settleMatch(m, spot, now);
      haptics.settle();
      setMatch(settled);
      if (settled.result) commitResult(settled.result);
    }
  }, [phase, liveStartAt, spot, now, expiryAt, setMatch, commitResult]);

  const sellYou = useCallback(() => {
    const m = matchRef.current;
    if (!m || !peer || m.you.status !== 'open') return;
    haptics.sell();
    setMatch({ ...m, you: closeSide(m.you, spot, Date.now()) });
    peer.room.send({ t: 'sell', spot, at: Date.now() });
  }, [peer, spot, setMatch]);

  if (!match || !peer) {
    return (
      <Screen>
        <TopBar><UserChip><span className="uname">bitMATCH</span></UserChip></TopBar>
        <Body><Note>Connecting…</Note></Body>
      </Screen>
    );
  }

  const remainingSec = Math.max(0, Math.ceil((expiryAt - now) / 1000));
  const armRemaining = Math.max(0, Math.ceil((liveStartAt - now) / 1000));
  const tone = remainingSec <= 5 ? 'critical' : remainingSec <= 10 ? 'warn' : 'normal';

  const youPnl = effectivePnlUSD(match.you, spot);
  const oppPnl = effectivePnlUSD(match.opp, spot);
  const LEAD_EPS = 0.05;
  const leader = Math.abs(youPnl - oppPnl) <= LEAD_EPS ? null : (youPnl > oppPnl ? 'you' : 'opp');
  const youLead = live && leader === 'you';
  const oppLead = live && leader === 'opp';

  const strikes: StrikeMark[] = [];
  if (match.you.direction && match.you.strikeUSD && match.you.entrySpot && match.you.entryAt) {
    strikes.push({ price: match.you.strikeUSD, entrySpot: match.you.entrySpot, entryAt: match.you.entryAt, direction: match.you.direction, label: 'YOU', you: true });
  }
  if (match.opp.direction && match.opp.strikeUSD && match.opp.entrySpot && match.opp.entryAt) {
    strikes.push({ price: match.opp.strikeUSD, entrySpot: match.opp.entrySpot, entryAt: match.opp.entryAt, direction: match.opp.direction, label: match.opp.name, you: false });
  }

  const chartSeries = live
    ? seriesRef.current
    : pricingEngine.getPriceHistory(0.6).map(h => ({ t: h.timestamp, p: h.price }));

  const renderSide = (side: MatchSide, who: 'you' | 'opp', pnl: number, lead: boolean, color: string, name: string) => {
    const arrow = side.direction === 'up' ? '▲ ' : side.direction === 'down' ? '▼ ' : '';
    return (
      <ScoreSide side={who} lead={lead}>
        <span className="name">
          <span className="dot" style={{ background: color }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
          <span className="crown">{lead ? '👑' : ''}</span>
        </span>
        <span className="lbl">{side.direction ? (side.direction === 'up' ? 'HIGH · P/L' : 'LOW · P/L') : 'profit/loss'}</span>
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
          <Avatar src={match.you.avatar} size={36} />
          <div className="meta">
            <span className="uname">{match.you.name}</span>
            <span className="ubal">${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </UserChip>
        {live
          ? <TopTimer tone={tone}><span className="n">{remainingSec}</span><span className="u">sec</span></TopTimer>
          : <Vs>Starts {armRemaining}s</Vs>}
        <WagerPill><span className="lbl">Wager </span>${match.wagerUSD}</WagerPill>
      </TopBar>

      <Body>
        <ChartFrame>
          {spot > 0 && (
            <BtcTag><span className="lbl">BTC</span><span className="val">${spot.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span></BtcTag>
          )}
          <MatchChart
            series={chartSeries}
            now={now}
            live={live}
            windowStart={liveStartAt}
            durationSec={DURATION_SEC}
            spot={spot}
            strikes={strikes}
          />
          {phase === 'arming' && (
            <ArmOverlay>
              <ArmHint>Will BTC go up or down?</ArmHint>
              <ArmRing crit={armRemaining <= 3}><span className="n">{armRemaining}</span></ArmRing>
              <ArmSub>
                {chosenDir
                  ? <>Locked in <b style={{ color: chosenDir === 'up' ? 'var(--up)' : 'var(--down)' }}>{chosenDir === 'up' ? 'HIGH' : 'LOW'}</b>. Trade starts when the clock hits 0.</>
                  : <>Tap <b style={{ color: 'var(--up)' }}>HIGH</b> or <b style={{ color: 'var(--down)' }}>LOW</b>. You both start together — most profit in 30s wins the wager.</>}
              </ArmSub>
            </ArmOverlay>
          )}
        </ChartFrame>

        <ScoreBar>
          {renderSide(match.you, 'you', youPnl, youLead, YOU_COLOR, match.you.name)}
          <Vs>VS</Vs>
          {renderSide(match.opp, 'opp', oppPnl, oppLead, OPP_COLOR, match.opp.name)}
        </ScoreBar>

        {phase === 'arming' ? (
          <DirRow>
            <BigButton tone="up" disabled={spot <= 0} onClick={() => { setChosenDir('up'); haptics.tap(); }}
              aria-label="Bet BTC goes higher"
              style={chosenDir === 'up' ? undefined : { opacity: chosenDir ? 0.6 : 1 }}>▲ HIGH</BigButton>
            <BigButton tone="down" disabled={spot <= 0} onClick={() => { setChosenDir('down'); haptics.tap(); }}
              aria-label="Bet BTC goes lower"
              style={chosenDir === 'down' ? undefined : { opacity: chosenDir ? 0.6 : 1 }}>▼ LOW</BigButton>
          </DirRow>
        ) : match.you.status === 'open' ? (
          <BigButton tone="sell" onClick={sellYou} aria-label="Sell now and lock your profit or loss">
            Sell now · lock {fmt(livePnlUSD(match.you, spot))}
          </BigButton>
        ) : (
          <LockedCard>
            <span className="badge">Locked</span>
            <span>You banked</span>
            <span className="amt" style={{ color: (match.you.realizedPnlUSD ?? 0) >= 0 ? 'var(--up)' : 'var(--down)' }}>
              {fmt(match.you.realizedPnlUSD ?? 0)}
            </span>
          </LockedCard>
        )}
      </Body>
    </Screen>
  );
};
