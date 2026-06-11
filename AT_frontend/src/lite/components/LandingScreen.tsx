import React from 'react';
import styled from 'styled-components';
import { useLiteSession } from '../state/LiteSessionProvider';
import { Screen, BigButton } from './ui';

const Body = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 32px 24px 16px;
  text-align: center;
`;

const Wordmark = styled.img`
  width: min(80vw, 340px);
  height: auto;
`;

const Tag = styled.p`
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 17px;
  color: var(--text);
  margin: 0 0 10px;
`;

const Actions = styled.div`
  width: 100%;
  max-width: 340px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Footer = styled.footer`
  padding: 14px 24px calc(20px + env(safe-area-inset-bottom));
  text-align: center;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 6px;
  .copy { font-size: 12px; font-weight: 700; color: var(--text-dim); }
  .legal { font-size: 10px; color: var(--text-muted); line-height: 1.5; max-width: 360px; margin: 0 auto; }
  a { color: var(--text-dim); text-decoration: underline; }
`;

export const LandingScreen: React.FC = () => {
  const { start, signUp } = useLiteSession();
  const year = new Date().getFullYear();

  return (
    <Screen>
      <Body>
        <Wordmark src="/images/lite-logo.png" alt="bitMATCH" />
        <Tag>Swipe. Match. Trade.</Tag>
        <Actions>
          <BigButton onClick={signUp}>Sign up</BigButton>
          <BigButton tone="ghost" onClick={start}>Sign in</BigButton>
          <BigButton tone="ghost" onClick={start}>Try the demo</BigButton>
        </Actions>
      </Body>

      <Footer>
        <div className="copy">© {year} bitMATCH</div>
        <p className="legal">
          For entertainment; play responsibly. Trading involves risk of loss.
          Real-money play requires identity verification and is unavailable where
          prohibited by law. All trademarks are property of their respective owners.
        </p>
      </Footer>
    </Screen>
  );
};
