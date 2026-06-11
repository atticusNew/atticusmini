/**
 * Lite-specific styled primitives. Reuses the main app's design tokens (CSS
 * custom properties from GlobalTheme) but leans bigger, rounder, and more
 * playful — this is the retail / social skin.
 */

import styled, { css, keyframes } from 'styled-components';

/** Phone-shaped, centered column so the social app reads as "mobile" even on desktop. */
export const Screen = styled.div`
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  position: relative;
`;

export const ScreenBody = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 18px 28px;
  min-height: 0;
`;

export const TopBar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  background: var(--bg);
  z-index: 10;
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 16px;
  letter-spacing: 0.01em;
  img { height: 26px; width: 26px; border-radius: 6px; object-fit: contain; }
  .lite {
    color: var(--accent);
    text-transform: uppercase;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.14em;
    border: 1px solid rgba(245,195,68,0.4);
    border-radius: 999px;
    padding: 2px 7px;
  }
`;

export const BalanceTag = styled.div`
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: 15px;
  background: var(--bg-elev-2);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 6px 12px;
`;

export const Title = styled.h1`
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.01em;
  margin: 0;
`;

export const Sub = styled.p`
  color: var(--text-dim);
  font-size: 14px;
  margin: 0;
  line-height: 1.45;
`;

export const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-dim);
`;

export const Input = styled.input`
  background: var(--bg-elev-2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 14px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  width: 100%;
  &:focus { border-color: var(--accent); }
`;

export const TextArea = styled.textarea`
  background: var(--bg-elev-2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px;
  font-size: 15px;
  color: var(--text);
  width: 100%;
  resize: none;
  min-height: 64px;
  &:focus { border-color: var(--accent); }
`;

export const BigButton = styled.button<{ tone?: 'primary' | 'ghost' | 'up' | 'down' }>`
  appearance: none;
  border: 1px solid transparent;
  border-radius: 14px;
  padding: 16px;
  font-family: var(--font-sans);
  font-weight: 800;
  font-size: 16px;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: 120ms ease-out;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  ${p => p.tone === 'ghost' && css`
    background: transparent;
    border-color: var(--border);
    color: var(--text);
  `}
  ${p => p.tone === 'up' && css`
    background: var(--up-dim);
    border-color: var(--up);
    color: var(--up);
  `}
  ${p => p.tone === 'down' && css`
    background: var(--down-dim);
    border-color: var(--down);
    color: var(--down);
  `}
  ${p => (!p.tone || p.tone === 'primary') && css`
    background: var(--accent);
    color: #1a1410;
    box-shadow: 0 6px 18px rgba(245,195,68,0.28);
  `}

  &:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
  @media (hover: hover) {
    &:hover:not(:disabled) { filter: brightness(1.05); }
  }
  &:active:not(:disabled) { transform: translateY(1px); }
`;

export const Avatar = styled.div<{ src?: string; size?: number }>`
  width: ${p => p.size ?? 44}px;
  height: ${p => p.size ?? 44}px;
  border-radius: 50%;
  background: ${p => (p.src ? `center/cover no-repeat url("${p.src}")` : 'var(--bg-elev-2)')};
  border: 2px solid var(--border-strong);
  flex-shrink: 0;
`;

export const StatRow = styled.div`
  display: flex;
  gap: 16px;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  color: var(--text-dim);
  .v { color: var(--text); font-weight: 700; }
`;

const pop = keyframes`
  0% { transform: scale(0.85); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
`;

export const Pop = styled.div`
  animation: ${pop} 220ms ease-out;
`;
