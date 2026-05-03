/**
 * Atticus design tokens. Single source of truth for color, type, spacing.
 * Components consume CSS custom properties exposed by `GlobalTheme`.
 */

export const tokens = {
  color: {
    bg: '#0a0d12',
    bgElev: '#12161d',
    bgElev2: '#1a212b',
    border: '#222a35',
    borderStrong: '#2e3947',
    text: '#e9eef5',
    textDim: '#7d8a9c',
    textMuted: '#54606f',
    accent: '#f5c344',
    accentHover: '#fbd366',
    up: '#1bc47d',
    upDim: 'rgba(27, 196, 125, 0.15)',
    down: '#ff5d6c',
    downDim: 'rgba(255, 93, 108, 0.15)',
    overlay: 'rgba(10, 13, 18, 0.72)',
  },
  font: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    mono: "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace",
  },
  size: {
    label: '12px',
    body: '14px',
    bodyLg: '16px',
    price: '24px',
    cta: '17px',
  },
  radius: {
    sm: '6px',
    md: '10px',
    lg: '14px',
    pill: '999px',
  },
  space: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    7: '32px',
    8: '48px',
  },
  motion: {
    fast: '120ms ease-out',
    base: '180ms ease-out',
  },
  shadow: {
    card: '0 4px 16px rgba(0, 0, 0, 0.32)',
    cta: '0 6px 18px rgba(245, 195, 68, 0.28)',
  },
  z: {
    nav: 50,
    sticky: 60,
    overlay: 100,
    toast: 200,
  },
} as const;

export type Tokens = typeof tokens;
