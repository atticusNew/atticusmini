/**
 * Trade-flow toasts.
 *
 * Centralizes the toast styling for the four moments traders care about:
 * placed, won, lost, sold-back. Borders use the theme up/down tokens so
 * the toast feels native to the rest of the app instead of the deposit
 * flow's stale `--green`/`--red` references.
 */

import { toast } from 'react-hot-toast';

/**
 * Pure formatters for trade-flow toast copy. Extracted so they can be unit
 * tested without spinning up `react-hot-toast`'s singleton + Toaster DOM.
 */
export const formatPlacedMsg = (args: {
  direction: 'call' | 'put'; stake: number; tenor: string;
}): string =>
  `${args.direction === 'call' ? '↑' : '↓'} ${args.direction.toUpperCase()} placed · ` +
  `$${formatUSD(args.stake)} · ${args.tenor}`;

export const formatWonMsg = (args: { profit: number; payout: number }): string =>
  `Win  +$${formatUSD(args.profit)}  ·  paid $${formatUSD(args.payout)}`;

export const formatLostMsg = (args: { loss: number }): string =>
  `Loss  −$${formatUSD(Math.abs(args.loss))}`;

export const formatTieMsg = (args: { refund: number }): string =>
  `Tie  ·  refunded $${formatUSD(args.refund)}`;

export const formatSoldBackMsg = (args: { refund: number; pnl: number }): string => {
  const pos = args.pnl >= 0;
  return `Sold back  $${formatUSD(args.refund)}  ·  ${pos ? '+' : '−'}$${formatUSD(Math.abs(args.pnl))}`;
};

const baseStyle = {
  background: 'var(--bg-elev)',
  color: 'var(--text)',
  borderRadius: '12px',
  padding: '12px 14px',
  fontFamily: 'var(--font-sans)',
  fontSize: '13px',
  fontWeight: 600,
  letterSpacing: '0.02em',
  maxWidth: '360px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.32)',
};

const formatUSD = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const toastTradePlaced = (args: {
  direction: 'call' | 'put'; stake: number; tenor: string;
}): void => {
  toast.success(formatPlacedMsg(args), {
    duration: 2200,
    style: { ...baseStyle, border: '1px solid var(--accent)' },
    iconTheme: { primary: 'var(--accent)', secondary: 'var(--bg-elev)' },
  });
};

export const toastTradeWon = (args: { profit: number; payout: number }): void => {
  toast.success(formatWonMsg(args), {
    duration: 4000,
    style: { ...baseStyle, border: '1px solid var(--up)', color: 'var(--up)' },
    iconTheme: { primary: 'var(--up)', secondary: 'var(--bg-elev)' },
  });
};

export const toastTradeLost = (args: { loss: number }): void => {
  toast(formatLostMsg(args), {
    duration: 3500,
    style: { ...baseStyle, border: '1px solid var(--down)', color: 'var(--down)' },
    icon: '✕',
  });
};

export const toastTradeTie = (args: { refund: number }): void => {
  toast(formatTieMsg(args), {
    duration: 3500,
    style: { ...baseStyle, border: '1px solid var(--border-strong)' },
  });
};

export const toastSoldBack = (args: { refund: number; pnl: number }): void => {
  const pos = args.pnl >= 0;
  toast(formatSoldBackMsg(args), {
    duration: 3500,
    style: {
      ...baseStyle,
      border: `1px solid ${pos ? 'var(--up)' : 'var(--down)'}`,
      color: pos ? 'var(--up)' : 'var(--down)',
    },
    icon: '↩',
  });
};

export const toastTradeError = (message: string): void => {
  toast.error(message, {
    duration: 4500,
    style: { ...baseStyle, border: '1px solid var(--down)' },
    iconTheme: { primary: 'var(--down)', secondary: 'var(--bg-elev)' },
  });
};
