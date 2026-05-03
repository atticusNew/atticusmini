import styled, { css } from 'styled-components';

export const Card = styled.div`
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 14px;
`;

export const Surface = styled.div`
  background: var(--bg-elev-2);
  border: 1px solid var(--border);
  border-radius: 10px;
`;

export const Stack = styled.div<{ gap?: number; horizontal?: boolean }>`
  display: flex;
  flex-direction: ${p => (p.horizontal ? 'row' : 'column')};
  gap: ${p => `${p.gap ?? 12}px`};
`;

export const Spacer = styled.div<{ size?: number }>`
  height: ${p => `${p.size ?? 8}px`};
`;

const buttonReset = css`
  appearance: none;
  border: none;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-family: inherit;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: background 120ms ease-out, color 120ms ease-out, border-color 120ms ease-out, transform 120ms ease-out;
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

/**
 * Hover styles only apply on devices with a real hover pointer.
 * Touch devices keep the `:hover` state stuck after a tap until the
 * next tap, which made the v3 chips look like they had two competing
 * highlights (the actual selection in accent vs the stuck hover in
 * border-strong). Wrapping the hover rule in `@media (hover: hover)`
 * eliminates the bug on touch.
 */
export const Button = styled.button<{ variant?: 'primary' | 'ghost' | 'subtle'; size?: 'sm' | 'md' | 'lg' }>`
  ${buttonReset};
  border-radius: 12px;
  padding: ${p => (p.size === 'sm' ? '8px 12px' : p.size === 'lg' ? '16px 20px' : '12px 16px')};
  font-size: ${p => (p.size === 'sm' ? '13px' : p.size === 'lg' ? '17px' : '14px')};

  ${p =>
    p.variant === 'primary' &&
    css`
      background: var(--accent);
      color: #1a1410;
      box-shadow: 0 6px 18px rgba(245, 195, 68, 0.28);
      @media (hover: hover) {
        &:hover:not(:disabled) { background: var(--accent-hover); }
      }
      &:active:not(:disabled) { transform: translateY(1px); }
    `}

  ${p =>
    (p.variant === 'subtle' || !p.variant) &&
    css`
      background: var(--bg-elev-2);
      color: var(--text);
      border: 1px solid var(--border);
      @media (hover: hover) {
        &:hover:not(:disabled) { border-color: var(--border-strong); }
      }
    `}

  ${p =>
    p.variant === 'ghost' &&
    css`
      background: transparent;
      color: var(--text-dim);
      @media (hover: hover) {
        &:hover:not(:disabled) { color: var(--text); }
      }
    `}
`;

export const Chip = styled.button<{ active?: boolean; tone?: 'up' | 'down' | 'accent' }>`
  ${buttonReset};
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  background: ${p => (p.active ? 'var(--bg-elev-2)' : 'transparent')};
  border: 1.5px solid ${p => {
    if (!p.active) return 'var(--border)';
    if (p.tone === 'up') return 'var(--up)';
    if (p.tone === 'down') return 'var(--down)';
    return 'var(--accent)';
  }};
  color: ${p => {
    if (!p.active) return 'var(--text-dim)';
    if (p.tone === 'up') return 'var(--up)';
    if (p.tone === 'down') return 'var(--down)';
    return 'var(--text)';
  }};
  font-weight: ${p => (p.active ? 700 : 600)};
  @media (hover: hover) {
    &:hover:not(:disabled) { color: var(--text); }
  }
`;

export const Pill = styled.span<{ tone?: 'neutral' | 'up' | 'down' | 'accent' | 'demo' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: ${p => {
    switch (p.tone) {
      case 'up': return 'var(--up-dim)';
      case 'down': return 'var(--down-dim)';
      case 'accent': return 'rgba(245,195,68,0.16)';
      case 'demo': return 'rgba(245,195,68,0.18)';
      default: return 'var(--bg-elev-2)';
    }
  }};
  color: ${p => {
    switch (p.tone) {
      case 'up': return 'var(--up)';
      case 'down': return 'var(--down)';
      case 'accent':
      case 'demo': return 'var(--accent)';
      default: return 'var(--text-dim)';
    }
  }};
  border: 1px solid ${p => {
    switch (p.tone) {
      case 'up': return 'rgba(27,196,125,0.32)';
      case 'down': return 'rgba(255,93,108,0.32)';
      case 'accent':
      case 'demo': return 'rgba(245,195,68,0.32)';
      default: return 'var(--border)';
    }
  }};
`;

export const Label = styled.label`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-dim);
`;

export const Price = styled.span`
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
`;

export const Divider = styled.div`
  height: 1px;
  background: var(--border);
`;

export const Hairline = styled.div`
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--border), transparent);
`;

/**
 * v3 form layout primitive: label on the left, control on the right.
 * Stack vertically with hairline dividers for a settings-like list.
 */
export const FormRow = styled.div`
  display: grid;
  grid-template-columns: minmax(70px, auto) 1fr;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  min-height: 44px;

  & + & {
    border-top: 1px solid var(--border);
  }
`;

export const FormRowLabel = styled.div`
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dim);
  letter-spacing: 0.02em;
`;

export const FormRowControl = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  min-width: 0;
`;
