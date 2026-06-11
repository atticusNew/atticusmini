import React, { useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useLiteSession } from '../state/LiteSessionProvider';
import { Screen, TopBar, Logo, Avatar } from './ui';

const MATCHMAKING_MS = 1300;

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

const spin = keyframes`to { transform: rotate(360deg); }`;

const Spinner = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  animation: ${spin} 0.8s linear infinite;
`;

const Status = styled.div`
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 16px;
  color: var(--text-dim);
  letter-spacing: 0.02em;
`;

const Wager = styled.div`
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 14px;
  color: var(--text-dim);
  .v { color: var(--text); font-weight: 800; }
`;

export const MatchmakingScreen: React.FC = () => {
  const { profile, opponent, wagerUSD, enterMatch } = useLiteSession();

  useEffect(() => {
    const id = setTimeout(enterMatch, MATCHMAKING_MS);
    return () => clearTimeout(id);
  }, [enterMatch]);

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
            <Avatar src={opponent?.avatar} size={72} />
            <span className="n">{opponent?.name ?? 'Opponent'}</span>
          </Who>
        </Row>
        <Spinner aria-hidden="true" />
        <Status role="status">Setting up your match…</Status>
        <Wager>Wager <span className="v">${wagerUSD}</span> · 30s · winner takes it</Wager>
      </Body>
    </Screen>
  );
};
