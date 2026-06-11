import React, { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useLiteSession } from '../state/LiteSessionProvider';
import { Screen, TopBar, Logo, Avatar, BigButton } from './ui';
import { getMatchTransport } from '../transport';

const BOT_DELAY_MS = 1300;
const P2P_TIMEOUT_MS = 15000;

const Body = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22px;
  padding: 24px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;
`;

const Who = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  .n { font-family: var(--font-display); font-weight: 700; font-size: 15px; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

const Vs = styled.div`
  font-family: var(--font-display);
  font-weight: 700;
  color: #fff;
  background: var(--purple);
  border: 2px solid var(--border-strong);
  border-radius: 999px;
  padding: 4px 11px;
  font-size: 15px;
  box-shadow: 2px 2px 0 var(--border-strong);
`;

const Mystery = styled.div`
  width: 72px; height: 72px; border-radius: 50%;
  border: 3px solid var(--border-strong); box-shadow: 2px 2px 0 var(--border-strong);
  background: var(--bg-elev-2);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display); font-weight: 700; font-size: 30px; color: var(--text-dim);
`;

const spin = keyframes`to { transform: rotate(360deg); }`;
const Spinner = styled.div`
  width: 30px; height: 30px; border-radius: 50%;
  border: 3px solid var(--border); border-top-color: var(--accent);
  animation: ${spin} 0.8s linear infinite;
`;

const Status = styled.div`
  font-family: var(--font-display); font-weight: 700; font-size: 16px;
  color: var(--text-dim); letter-spacing: 0.02em; text-align: center;
`;

const Wager = styled.div`
  font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-size: 14px; color: var(--text-dim);
  .v { color: var(--text); font-weight: 800; }
`;

export const MatchmakingScreen: React.FC = () => {
  const {
    profile, opponent, wagerUSD, amountUSD, matchmakeMode,
    enterMatch, beginP2PMatch, beginBotFallback, goLobby,
  } = useLiteSession();
  const [elapsed, setElapsed] = useState(0);
  const signalRef = useRef({ cancelled: false });

  // Bot challenge (from the swipe deck): short, friendly beat then start.
  useEffect(() => {
    if (matchmakeMode !== 'bot') return;
    const id = setTimeout(enterMatch, BOT_DELAY_MS);
    return () => clearTimeout(id);
  }, [matchmakeMode, enterMatch]);

  // Online quick match: seek a real peer; fall back to a bot on timeout.
  useEffect(() => {
    if (matchmakeMode !== 'p2p' || !profile) return;
    const signal = { cancelled: false };
    signalRef.current = signal;
    const transport = getMatchTransport();
    let cancelled = false;
    transport
      .matchmake({
        profile: { name: profile.name, avatar: profile.avatar },
        wager: wagerUSD,
        amount: amountUSD,
        signal,
        timeoutMs: P2P_TIMEOUT_MS,
      })
      .then(res => {
        if (cancelled || signal.cancelled) return;
        if (res) beginP2PMatch(res, transport.openRoom(res.matchId));
        else beginBotFallback();
      })
      .catch(() => { if (!cancelled) beginBotFallback(); });
    return () => { cancelled = true; signal.cancelled = true; };
  }, [matchmakeMode, profile, wagerUSD, amountUSD, beginP2PMatch, beginBotFallback]);

  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const oppName = opponent?.name ?? 'Opponent';
  const oppAvatar = opponent?.avatar;
  const searching = matchmakeMode === 'p2p';

  return (
    <Screen>
      <TopBar><Logo src="/images/lite-logo.png" alt="bitMATCH" /></TopBar>
      <Body>
        <Row>
          <Who>
            <Avatar src={profile?.avatar} size={72} />
            <span className="n">{profile?.name ?? 'You'}</span>
          </Who>
          <Vs>VS</Vs>
          <Who>
            {searching ? <Mystery>?</Mystery> : <Avatar src={oppAvatar} size={72} />}
            <span className="n">{searching ? 'Searching…' : oppName}</span>
          </Who>
        </Row>
        <Spinner aria-hidden="true" />
        <Status role="status">
          {searching ? `Finding a live opponent…${elapsed > 0 ? ` (${elapsed}s)` : ''}` : 'Setting up your match…'}
        </Status>
        <Wager>Wager <span className="v">${wagerUSD}</span> · 30s · winner takes it</Wager>
        {searching && (
          <BigButton tone="ghost" onClick={() => { signalRef.current.cancelled = true; goLobby(); }}>
            Cancel
          </BigButton>
        )}
      </Body>
    </Screen>
  );
};
