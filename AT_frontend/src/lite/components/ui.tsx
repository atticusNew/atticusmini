/**
 * Lite-specific styled primitives — a retro, tactile, social-game look.
 *
 * Signatures of the style: warm cream surfaces, chunky navy outlines, hard
 * offset shadows that "press" on tap, a rounded display font for headings,
 * and bold teal/coral/gold accents. Independent from the main app's tokens.
 */

import styled, { css, keyframes } from 'styled-components';

/** Phone-shaped, centered column so the social app reads as "mobile" everywhere. */
export const Screen = styled.div`
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  color: var(--text);
  font-family: var(--font-sans);
  position: relative;
`;

export const ScreenBody = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 18px calc(28px + env(safe-area-inset-bottom));
  padding-left: max(18px, env(safe-area-inset-left));
  padding-right: max(18px, env(safe-area-inset-right));
  min-height: 0;
`;

export const TopBar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: calc(12px + env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 12px max(16px, env(safe-area-inset-left));
  border-bottom: 2px solid var(--border-strong);
  position: sticky;
  top: 0;
  background: var(--bg-elev);
  z-index: 10;
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 19px;
  letter-spacing: 0.01em;
  color: var(--text);
  img { height: 28px; width: 28px; border-radius: 8px; object-fit: contain; border: 2px solid var(--border-strong); }
  .lite {
    color: #fff;
    background: var(--down);
    text-transform: uppercase;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    border-radius: 999px;
    padding: 3px 9px;
    box-shadow: 2px 2px 0 var(--border-strong);
  }
`;

/** bitMATCH wordmark used in screen headers (top-left). */
export const Logo = styled.img`
  height: 28px;
  width: auto;
  display: block;
`;

export const BalanceTag = styled.div`
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: 15px;
  background: var(--accent);
  color: var(--text);
  border: 2px solid var(--border-strong);
  border-radius: 999px;
  padding: 6px 14px;
  box-shadow: 2px 2px 0 var(--border-strong);
  &::before { content: '₿ '; opacity: 0.7; }
`;

export const Title = styled.h1`
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.01em;
  margin: 0;
  color: var(--text);
`;

export const Sub = styled.p`
  color: var(--text-dim);
  font-size: 14px;
  margin: 0;
  line-height: 1.45;
  font-weight: 500;
`;

export const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-dim);
`;

export const Input = styled.input`
  background: var(--bg-elev);
  border: 2px solid var(--border-strong);
  border-radius: 14px;
  padding: 14px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  width: 100%;
  box-shadow: var(--shadow-hard);
  transition: 120ms ease-out;
  &::placeholder { color: var(--text-muted); font-weight: 500; }
  &:focus { border-color: var(--accent); box-shadow: 3px 3px 0 var(--accent); }
`;

export const TextArea = styled.textarea`
  background: var(--bg-elev);
  border: 2px solid var(--border-strong);
  border-radius: 14px;
  padding: 14px;
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
  width: 100%;
  resize: none;
  min-height: 64px;
  box-shadow: var(--shadow-hard);
  transition: 120ms ease-out;
  &::placeholder { color: var(--text-muted); }
  &:focus { border-color: var(--accent); box-shadow: 3px 3px 0 var(--accent); }
`;

export const BigButton = styled.button<{ tone?: 'primary' | 'ghost' | 'up' | 'down' }>`
  appearance: none;
  border: 2px solid var(--border-strong);
  border-radius: 16px;
  padding: 16px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 17px;
  letter-spacing: 0.01em;
  color: var(--text);
  cursor: pointer;
  transition: transform 90ms ease-out, box-shadow 90ms ease-out, filter 120ms ease-out;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: var(--shadow-hard-lg);

  ${p => p.tone === 'ghost' && css`background: var(--bg-elev);`}
  ${p => p.tone === 'up' && css`background: var(--up); color: #fff;`}
  ${p => p.tone === 'down' && css`background: var(--down); color: #fff;`}
  ${p => (!p.tone || p.tone === 'primary') && css`background: var(--accent);`}

  &:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: 2px 2px 0 var(--border-strong); }
  @media (hover: hover) {
    &:hover:not(:disabled) { filter: brightness(1.04); }
  }
  &:active:not(:disabled) {
    transform: translate(4px, 4px);
    box-shadow: 1px 1px 0 var(--border-strong);
  }
`;

export const Avatar = styled.div<{ src?: string; size?: number }>`
  width: ${p => p.size ?? 44}px;
  height: ${p => p.size ?? 44}px;
  border-radius: 50%;
  background: ${p => (p.src ? `center/cover no-repeat url("${p.src}")` : 'var(--bg-elev-2)')};
  border: 3px solid var(--border-strong);
  box-shadow: 2px 2px 0 var(--border-strong);
  flex-shrink: 0;
`;

export const StatRow = styled.div`
  display: flex;
  gap: 14px;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dim);
  .v { color: var(--text); font-weight: 800; }
`;

const pop = keyframes`
  0% { transform: scale(0.7) rotate(-6deg); opacity: 0; }
  60% { transform: scale(1.08) rotate(2deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
`;

export const Pop = styled.div`
  animation: ${pop} 320ms cubic-bezier(.2,.9,.3,1.4);
`;
