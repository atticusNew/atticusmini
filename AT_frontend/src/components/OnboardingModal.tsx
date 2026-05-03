import React, { useState } from 'react';
import styled from 'styled-components';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDontShowAgain: () => void;
}

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(8, 11, 16, 0.84);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const Sheet = styled.div`
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 100%;
  max-width: 360px;
  padding: 24px 22px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-family: var(--font-sans);
`;

const StepEyebrow = styled.div`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-dim);
`;

const Title = styled.h2`
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.01em;
`;

const Body = styled.p`
  font-size: 14px;
  line-height: 1.55;
  color: var(--text-dim);
  strong { color: var(--text); font-weight: 600; }
  span.up { color: var(--up); font-weight: 600; }
  span.down { color: var(--down); font-weight: 600; }
`;

const Dots = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 4px;
`;

const Dot = styled.span<{ active?: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: ${p => (p.active ? 'var(--accent)' : 'var(--border-strong)')};
  transition: 120ms ease-out;
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 8px;
`;

const Primary = styled.button`
  flex: 1;
  appearance: none;
  background: var(--accent);
  color: #1a1410;
  border: none;
  border-radius: 10px;
  padding: 12px 16px;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: 120ms ease-out;
  &:hover { background: var(--accent-hover); }
`;

const Ghost = styled.button`
  appearance: none;
  background: transparent;
  color: var(--text-dim);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  &:hover { color: var(--text); border-color: var(--border-strong); }
`;

const STEPS: ReadonlyArray<{ eyebrow: string; title: string; body: React.ReactNode }> = [
  {
    eyebrow: 'Welcome',
    title: 'Atticus binary options',
    body: (
      <>
        Pick a direction, a strike, and a window. If BTC ends on your side, you collect.
        It's that simple.
      </>
    ),
  },
  {
    eyebrow: 'How it works',
    title: 'Stake → Win or Lose',
    body: (
      <>
        Pick <span className="up">UP</span> or <span className="down">DOWN</span>. Choose how
        far the price needs to move and the time window (30s to 1h). Stake any amount you like.
        We show your <strong>risk → win</strong> live before you confirm.
      </>
    ),
  },
  {
    eyebrow: 'Anytime exit',
    title: 'Sell back before expiry',
    body: (
      <>
        Every ticket has a live <strong>Sell back</strong> price. Lock in a profit early or cut
        a loss — you don't have to wait for expiry.
      </>
    ),
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onDontShowAgain }) => {
  const [step, setStep] = useState(0);
  if (!isOpen) return null;

  const last = step === STEPS.length - 1;
  const cur = STEPS[step]!;

  const handleNext = () => {
    if (last) {
      onDontShowAgain();
      onClose();
    } else {
      setStep(step + 1);
    }
  };

  return (
    <Backdrop onClick={onClose}>
      <Sheet onClick={e => e.stopPropagation()}>
        <StepEyebrow>{cur.eyebrow}</StepEyebrow>
        <Title>{cur.title}</Title>
        <Body>{cur.body}</Body>
        <Dots>
          {STEPS.map((_, i) => <Dot key={i} active={i === step} />)}
        </Dots>
        <Actions>
          <Ghost onClick={() => { onDontShowAgain(); onClose(); }}>Skip</Ghost>
          <Primary onClick={handleNext}>{last ? 'Try it' : 'Next'}</Primary>
        </Actions>
      </Sheet>
    </Backdrop>
  );
};
