/**
 * Pure helpers for the Positions / History tab.
 *
 * Filters, summary stats, and tone mapping are kept here so the React
 * component is render-only and the logic can be unit tested without a DOM.
 */

import { Decimal } from 'decimal.js';
import type { PartnerTicket } from '../services/partner';

export type HistoryRange = 'all' | '24h' | '7d';

export interface PositionsSummary {
  count: number;
  wins: number;
  losses: number;
  ties: number;
  cancelled: number;
  /** Net realized USD (payout - premium for wins, -premium for losses, 0 for ties, refund-premium for cancels). */
  netUSD: number;
  /** Win rate over decisive (win + loss) tickets, 0..1. Undefined when no decisive tickets. */
  winRate: number | null;
}

export const partitionByStatus = (tickets: PartnerTicket[]) => ({
  active: tickets.filter(t => t.status === 'active'),
  history: tickets.filter(t => t.status !== 'active'),
});

const RANGE_MS: Record<HistoryRange, number | null> = {
  all: null,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

export const filterByRange = (
  tickets: PartnerTicket[],
  range: HistoryRange,
  now: number = Date.now(),
): PartnerTicket[] => {
  const window = RANGE_MS[range];
  if (window === null) return tickets;
  const cutoff = now - window;
  return tickets.filter(t => (t.settledAt ?? t.openedAt) >= cutoff);
};

export const settledPnlUSD = (t: PartnerTicket): number => {
  const premium = t.premiumUSD.toNumber();
  if (t.status === 'cancelled') return (t.payoutUSD?.toNumber() ?? 0) - premium;
  if (t.outcome === 'win') return (t.payoutUSD?.toNumber() ?? 0) - premium;
  if (t.outcome === 'tie') return 0;
  return -premium;
};

export const summarize = (tickets: PartnerTicket[]): PositionsSummary => {
  let wins = 0, losses = 0, ties = 0, cancelled = 0;
  let net = new Decimal(0);
  for (const t of tickets) {
    if (t.status === 'cancelled') cancelled += 1;
    else if (t.outcome === 'win') wins += 1;
    else if (t.outcome === 'tie') ties += 1;
    else if (t.outcome === 'loss') losses += 1;
    net = net.plus(settledPnlUSD(t));
  }
  const decisive = wins + losses;
  return {
    count: tickets.length,
    wins,
    losses,
    ties,
    cancelled,
    netUSD: net.toNumber(),
    winRate: decisive > 0 ? wins / decisive : null,
  };
};

export const sortHistoryDesc = (tickets: PartnerTicket[]): PartnerTicket[] =>
  [...tickets].sort((a, b) => (b.settledAt ?? b.openedAt) - (a.settledAt ?? a.openedAt));

export const sortActiveDesc = (tickets: PartnerTicket[]): PartnerTicket[] =>
  [...tickets].sort((a, b) => b.openedAt - a.openedAt);
