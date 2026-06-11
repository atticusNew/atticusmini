import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useLiteSession } from '../state/LiteSessionProvider';
import { Screen, BigButton } from './ui';

const Body = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22px;
  padding: 32px 24px calc(40px + env(safe-area-inset-bottom));
  text-align: center;
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
`;

const Icon = styled.img`
  width: 120px;
  height: 120px;
  object-fit: contain;
  animation: ${float} 3.4s ease-in-out infinite;
`;

const Wordmark = styled.img`
  width: min(72vw, 300px);
  height: auto;
`;

const Tag = styled.p`
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 18px;
  color: var(--text);
  margin: 0;
  line-height: 1.35;
`;

const Sub = styled.p`
  color: var(--text-dim);
  font-size: 14px;
  font-weight: 500;
  margin: 0;
  max-width: 320px;
  line-height: 1.5;
`;

const Steps = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 4px;
  .step {
    flex: 1;
    background: var(--bg-elev);
    border: 2px solid var(--border-strong);
    border-radius: 14px;
    padding: 12px 8px;
    box-shadow: var(--shadow-hard);
    display: flex; flex-direction: column; gap: 4px; align-items: center;
  }
  .emoji { font-size: 20px; }
  .t { font-family: var(--font-display); font-weight: 700; font-size: 12px; color: var(--text); }
`;

const Actions = styled.div`
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 6px;
`;

const Foot = styled.p`
  color: var(--text-muted);
  font-size: 11px;
  margin: 0;
  max-width: 320px;
  line-height: 1.4;
`;

export const LandingScreen: React.FC = () => {
  const { start } = useLiteSession();
  return (
    <Screen>
      <Body>
        <Icon src="/images/bitmatch-icon.png" alt="bitMATCH" />
        <Wordmark src="/images/lite-logo.png" alt="bitMATCH" />
        <Tag>Swipe. Match. Trade.</Tag>
        <Sub>Challenge a trader to a 30-second Bitcoin duel. Whoever profits the most wins the wager.</Sub>

        <Steps>
          <div className="step"><span className="emoji">👤</span><span className="t">Create profile</span></div>
          <div className="step"><span className="emoji">🃏</span><span className="t">Find opponent</span></div>
          <div className="step"><span className="emoji">📈</span><span className="t">Out-trade them</span></div>
        </Steps>

        <Actions>
          <BigButton onClick={start}>Play now</BigButton>
        </Actions>

        <Foot>
          Trade involves risk. For entertainment; play responsibly. Real-money
          play requires identity verification and is unavailable where prohibited.
        </Foot>
      </Body>
    </Screen>
  );
};
