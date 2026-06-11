import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useLiteSession } from '../state/LiteSessionProvider';
import { Screen, TopBar, Logo, BalanceTag } from './ui';
import type { Opponent } from '../types';

const DeckArea = styled.div`
  flex: 1;
  position: relative;
  margin: 16px 18px;
  min-height: 0;
`;

const Card = styled.div<{ x: number; rot: number; dragging: boolean; depth: number }>`
  position: absolute;
  inset: 0;
  border-radius: 24px;
  overflow: hidden;
  background: var(--bg-elev);
  border: 3px solid var(--border-strong);
  box-shadow: var(--shadow-hard-lg);
  transform: translateX(${p => p.x}px) rotate(${p => p.rot}deg) scale(${p => 1 - p.depth * 0.04}) translateY(${p => p.depth * 10}px);
  transition: ${p => (p.dragging ? 'none' : 'transform 240ms ease-out')};
  touch-action: pan-y;
  user-select: none;
`;

const Photo = styled.div<{ src: string }>`
  height: 62%;
  background: center/cover no-repeat url("${p => p.src}"), var(--bg-elev-2);
`;

const CardBody = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--bg-elev);
  .namerow { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .name { font-family: var(--font-display); font-size: 26px; font-weight: 700; }
  .wager {
    font-family: var(--font-display); font-weight: 700; font-size: 16px; color: var(--text);
    background: var(--accent); border: 2px solid var(--border-strong); border-radius: 999px;
    padding: 4px 12px; box-shadow: 2px 2px 0 var(--border-strong); white-space: nowrap;
  }
  .bio { color: var(--text-dim); font-size: 14px; font-weight: 500; }
`;

const CardStats = styled.div`
  display: flex;
  gap: 18px;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  color: var(--text-dim);
  margin-top: 4px;
  .v { color: var(--text); font-weight: 800; }
`;

const Stamp = styled.div<{ side: 'like' | 'nope'; show: number }>`
  position: absolute;
  top: 24px;
  ${p => (p.side === 'like' ? 'left: 20px;' : 'right: 20px;')}
  transform: rotate(${p => (p.side === 'like' ? -14 : 14)}deg);
  border: 4px solid ${p => (p.side === 'like' ? 'var(--up)' : 'var(--down)')};
  color: ${p => (p.side === 'like' ? 'var(--up)' : 'var(--down)')};
  border-radius: 10px;
  padding: 4px 12px;
  font-weight: 900;
  font-size: 26px;
  letter-spacing: 0.08em;
  opacity: ${p => p.show};
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
  padding: 12px 0 26px;
`;

const Action = styled.button<{ tone: 'nope' | 'solo' | 'like' }>`
  appearance: none;
  cursor: pointer;
  width: ${p => (p.tone === 'solo' ? 58 : 70)}px;
  height: ${p => (p.tone === 'solo' ? 58 : 70)}px;
  border-radius: 50%;
  font-size: 28px;
  font-weight: 800;
  background: ${p => (p.tone === 'like' ? 'var(--up)' : p.tone === 'nope' ? 'var(--down)' : 'var(--accent)')};
  border: 3px solid var(--border-strong);
  color: ${p => (p.tone === 'solo' ? 'var(--text)' : '#fff')};
  box-shadow: var(--shadow-hard);
  display: flex; align-items: center; justify-content: center;
  transition: 90ms ease-out;
  &:active:not(:disabled) { transform: translate(3px,3px); box-shadow: none; }
  &:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
`;

const Empty = styled.div`
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; color: var(--text-dim); text-align: center; padding: 24px;
  button {
    appearance: none; cursor: pointer; background: var(--accent); color: var(--text);
    border: 2px solid var(--border-strong); border-radius: 14px; padding: 12px 20px;
    font-family: var(--font-display); font-weight: 700; box-shadow: var(--shadow-hard);
  }
  button:active { transform: translate(2px,2px); box-shadow: none; }
`;

const THRESHOLD = 110;

export const SwipeDeck: React.FC = () => {
  const { deck, balance, challenge, startSolo, openSwipe, goLobby } = useLiteSession();
  const [stack, setStack] = useState<Opponent[]>(deck);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);

  useEffect(() => { setStack(deck); }, [deck]);

  const top = stack[0];

  const commit = (dir: 'like' | 'nope') => {
    if (!top) return;
    const fly = dir === 'like' ? 1 : -1;
    setDrag(fly * 600);
    const chosen = top;
    setTimeout(() => {
      setStack(prev => prev.slice(1));
      setDrag(0);
      if (dir === 'like') challenge(chosen);
    }, 220);
  };

  const onDown = (clientX: number) => { startX.current = clientX; setDragging(true); };
  const onMove = (clientX: number) => { if (dragging) setDrag(clientX - startX.current); };
  const onUp = () => {
    setDragging(false);
    if (drag > THRESHOLD) commit('like');
    else if (drag < -THRESHOLD) commit('nope');
    else setDrag(0);
  };

  return (
    <Screen>
      <TopBar>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span onClick={goLobby} style={{ cursor: 'pointer', fontSize: 20, fontWeight: 700 }}>←</span>
          <Logo src="/images/lite-logo.png" alt="bitMATCH" />
        </div>
        <BalanceTag>${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</BalanceTag>
      </TopBar>

      <DeckArea>
        {stack.length === 0 && (
          <Empty>
            <div>No more opponents nearby.</div>
            <button onClick={openSwipe}>Refresh deck</button>
          </Empty>
        )}
        {stack.slice(0, 3).map((op, i) => {
          const isTop = i === 0;
          const x = isTop ? drag : 0;
          const rot = isTop ? drag / 18 : 0;
          return (
            <Card
              key={op.id}
              x={x}
              rot={rot}
              dragging={isTop && dragging}
              depth={i}
              style={{ zIndex: 10 - i }}
              onMouseDown={isTop ? e => onDown(e.clientX) : undefined}
              onMouseMove={isTop ? e => onMove(e.clientX) : undefined}
              onMouseUp={isTop ? onUp : undefined}
              onMouseLeave={isTop && dragging ? onUp : undefined}
              onTouchStart={isTop ? e => { const t = e.touches[0]; if (t) onDown(t.clientX); } : undefined}
              onTouchMove={isTop ? e => { const t = e.touches[0]; if (t) onMove(t.clientX); } : undefined}
              onTouchEnd={isTop ? onUp : undefined}
            >
              <Photo src={op.avatar} />
              {isTop && <Stamp side="like" show={Math.max(0, Math.min(1, drag / THRESHOLD))}>CHALLENGE</Stamp>}
              {isTop && <Stamp side="nope" show={Math.max(0, Math.min(1, -drag / THRESHOLD))}>SKIP</Stamp>}
              <CardBody>
                <div className="namerow">
                  <span className="name">{op.name}</span>
                  <span className="wager">${op.wager}</span>
                </div>
                <span className="bio">{op.bio}</span>
                <CardStats>
                  <span>streak <span className="v">{op.stats.streak}</span></span>
                  <span>W <span className="v">{op.stats.wins}</span></span>
                  <span>L <span className="v">{op.stats.losses}</span></span>
                </CardStats>
              </CardBody>
            </Card>
          );
        })}
      </DeckArea>

      <Actions>
        <Action tone="nope" onClick={() => commit('nope')} disabled={!top} aria-label="Skip">✕</Action>
        <Action tone="solo" onClick={startSolo} aria-label="Solo trade">$</Action>
        <Action tone="like" onClick={() => commit('like')} disabled={!top} aria-label="Challenge">✓</Action>
      </Actions>
    </Screen>
  );
};
