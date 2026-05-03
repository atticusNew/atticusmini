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
      &:hover:not(:disabled) { background: var(--accent-hover); }
      &:active:not(:disabled) { transform: translateY(1px); }
    `}

  ${p =>
    (p.variant === 'subtle' || !p.variant) &&
    css`
      background: var(--bg-elev-2);
      color: var(--text);
      border: 1px solid var(--border);
      &:hover:not(:disabled) { border-color: var(--border-strong); }
    `}

  ${p =>
    p.variant === 'ghost' &&
    css`
      background: transparent;
      color: var(--text-dim);
      &:hover:not(:disabled) { color: var(--text); }
    `}
`;

export const Chip = styled.button<{ active?: boolean; tone?: 'up' | 'down' | 'accent' }>`
  ${buttonReset};
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  background: ${p => (p.active ? 'var(--bg-elev-2)' : 'transparent')};
  border: 1px solid ${p => {
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
  &:hover:not(:disabled) { color: var(--text); }
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
