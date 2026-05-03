/**
 * FirstTradeHint — light onboarding banner above the trade form.
 *
 * Only shown until the user places their first trade in this browser.
 * Single sentence, dismissable, no spotlight or animated arrow — adds
 * just enough scaffolding to avoid the empty-form-blank-stare without
 * pestering returning users.
 */

import React from 'react';
import styled from 'styled-components';
import { useFirstTradeHint } from '../hooks/useFirstTradeHint';

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(245,195,68,0.10);
  border: 1px solid rgba(245,195,68,0.32);
  border-radius: 12px;
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--text);
  line-height: 1.4;

  .em { color: var(--accent); font-weight: 700; }
  .icon {
    font-size: 16px;
    line-height: 1;
    flex-shrink: 0;
  }
`;

const DismissButton = styled.button`
  appearance: none;
  margin-left: auto;
  background: transparent;
  border: none;
  color: var(--text-dim);
  font-family: var(--font-sans);
  font-size: 16px;
  padding: 0 4px;
  line-height: 1;
  cursor: pointer;
  &:hover { color: var(--text); }
`;

export const FirstTradeHint: React.FC = () => {
  const { visible, dismiss } = useFirstTradeHint();
  if (!visible) return null;
  return (
    <Bar role="note" aria-live="polite">
      <span className="icon" aria-hidden>👋</span>
      <span>
        First time? Pick <span className="em">▲ UP</span> or <span className="em">▼ DOWN</span>,
        then how much it'll move, then how long.
      </span>
      <DismissButton onClick={dismiss} aria-label="Dismiss onboarding hint" type="button">×</DismissButton>
    </Bar>
  );
};

export default FirstTradeHint;
