/**
 * InfoTooltip — tiny "?" popover with strict singleton + click-outside.
 *
 * Behavior contract:
 *  - Tap the "?" → this tooltip opens, any other open tooltip closes.
 *  - Tap anywhere else, or press Escape → it closes.
 *  - Tap the same "?" again → it toggles closed.
 *  - Works on touch and mouse without sticky-hover state.
 *
 * Implementation: a module-level ID broker (open id + listeners)
 * coordinates singleton behavior across instances without React
 * context. Each instance subscribes to the broker and updates its
 * local `open` state when another instance opens. Click-outside is
 * one document listener attached only while *some* tooltip is open.
 */

import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

let nextId = 1;
const listeners = new Set<(openId: number | null) => void>();
const broadcast = (id: number | null) => {
  for (const l of listeners) l(id);
};

const Wrap = styled.span`
  position: relative;
  display: inline-block;
  margin-left: 4px;
  vertical-align: middle;
`;

const Trigger = styled.button<{ open: boolean }>`
  appearance: none;
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: ${p => (p.open ? 'var(--bg-elev)' : 'var(--bg-elev-2)')};
  border: 1px solid ${p => (p.open ? 'var(--accent)' : 'var(--border)')};
  color: ${p => (p.open ? 'var(--accent)' : 'var(--text-dim)')};
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 800;
  line-height: 14px;
  text-align: center;
  padding: 0;
  cursor: pointer;
  user-select: none;
  transition: 120ms ease-out;
  @media (hover: hover) {
    &:hover { color: var(--text); border-color: var(--border-strong); }
  }
`;

const Popover = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 50;
  width: min(260px, calc(100vw - 32px));
  padding: 10px 12px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--text);
  white-space: normal;
`;

interface InfoTooltipProps {
  label: string;
  children: React.ReactNode;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ label, children }) => {
  const idRef = useRef<number>(0);
  if (idRef.current === 0) idRef.current = nextId++;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement | null>(null);

  // Subscribe to broker so when another tooltip opens, this one closes.
  useEffect(() => {
    const onChange = (openId: number | null) => {
      setOpen(openId === idRef.current);
    };
    listeners.add(onChange);
    return () => { listeners.delete(onChange); };
  }, []);

  // Click-outside + Escape, only attached while THIS tooltip is open.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        broadcast(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') broadcast(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    broadcast(open ? null : idRef.current);
  };

  return (
    <Wrap ref={wrapRef}>
      <Trigger
        type="button"
        open={open}
        aria-label={label}
        aria-expanded={open}
        title={label}
        onClick={toggle}
      >
        ?
      </Trigger>
      {open && <Popover role="tooltip" onClick={e => e.stopPropagation()}>{children}</Popover>}
    </Wrap>
  );
};

/** Test-only helper: reset the broker between tests. */
export const __resetTooltipBrokerForTests = (): void => {
  listeners.clear();
  nextId = 1;
};

export default InfoTooltip;
