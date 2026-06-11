import React from 'react';
import styled from 'styled-components';
import { useLiteSession } from '../state/LiteSessionProvider';
import { Avatar, BigButton } from './ui';

const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 200;
  background: var(--overlay);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
`;

const Card = styled.div`
  width: 100%; max-width: 360px;
  background: var(--bg-elev); border: 2px solid var(--border-strong);
  border-radius: 20px; box-shadow: var(--shadow-hard-lg);
  padding: 22px 18px calc(18px + env(safe-area-inset-bottom));
  display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center;
  .who { font-family: var(--font-display); font-weight: 700; font-size: 20px; color: var(--text); }
  .sub { color: var(--text-dim); font-size: 14px; font-weight: 600; }
  .wager { font-family: var(--font-mono); font-weight: 800; color: var(--accent); -webkit-text-stroke: 0.6px var(--border-strong); font-size: 22px; }
`;

const Row = styled.div`display: flex; gap: 10px; width: 100%; margin-top: 6px;`;

const Spinner = styled.div`
  width: 28px; height: 28px; border-radius: 50%;
  border: 3px solid var(--border); border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
`;

export const InviteModals: React.FC = () => {
  const { incomingInvite, outgoingInvite, acceptInvite, declineInvite, cancelOutgoingInvite } = useLiteSession();

  if (incomingInvite) {
    return (
      <Overlay>
        <Card>
          <Avatar src={incomingInvite.from.avatar} size={84} />
          <div className="who">{incomingInvite.from.name}</div>
          <div className="sub">challenges you to a 30-second duel</div>
          <div className="wager">${incomingInvite.wager}</div>
          <div className="sub">winner takes the wager</div>
          <Row>
            <BigButton tone="ghost" onClick={declineInvite}>Decline</BigButton>
            <BigButton tone="up" onClick={acceptInvite}>Accept</BigButton>
          </Row>
        </Card>
      </Overlay>
    );
  }

  if (outgoingInvite) {
    const { status, oppName } = outgoingInvite;
    return (
      <Overlay>
        <Card>
          {status === 'waiting' && <Spinner aria-hidden="true" />}
          <div className="who">
            {status === 'waiting' ? `Waiting for ${oppName}…` : status === 'declined' ? `${oppName} declined` : `${oppName} didn't respond`}
          </div>
          <div className="sub">
            {status === 'waiting' ? 'Your challenge has been sent.' : 'Try someone else or Quick Match.'}
          </div>
          {status !== 'waiting' && (
            <Row><BigButton onClick={cancelOutgoingInvite}>OK</BigButton></Row>
          )}
          {status === 'waiting' && (
            <Row><BigButton tone="ghost" onClick={cancelOutgoingInvite}>Cancel</BigButton></Row>
          )}
        </Card>
      </Overlay>
    );
  }

  return null;
};
