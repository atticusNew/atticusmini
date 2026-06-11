/**
 * opponentService — supplies the swipe-deck roster.
 *
 * Demo backing is a static, deterministic roster of bots. A real
 * implementation would call the partner/backend matchmaking endpoint to
 * return live opponents near the trader's wager + skill band. The shape of
 * `Opponent` is what a real matchmaking response should map onto.
 */

import type { Opponent } from '../types';

/**
 * Inline SVG avatars (data URLs) so the demo has no external image
 * dependency and works offline. Each is a flat-color disc with initials.
 */
const avatar = (initials: string, bg: string): string => {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>` +
    `<rect width='240' height='240' fill='${bg}'/>` +
    `<text x='50%' y='52%' font-family='Inter,sans-serif' font-size='96' ` +
    `font-weight='700' fill='#0a0d12' text-anchor='middle' ` +
    `dominant-baseline='middle'>${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const ROSTER: Opponent[] = [
  { id: 'op-willdro', name: 'Willdro', bio: 'Scalps the wicks. Never folds.', avatar: avatar('W', '#f5c344'), stats: { streak: 4, wins: 38, losses: 21 }, skill: 0.72 },
  { id: 'op-singdoo', name: 'SingDoo', bio: '30 seconds is all I need.', avatar: avatar('SD', '#1bc47d'), stats: { streak: -2, wins: 12, losses: 15 }, skill: 0.4 },
  { id: 'op-nova', name: 'Nova', bio: 'Momentum or nothing.', avatar: avatar('N', '#ff5d6c'), stats: { streak: 7, wins: 61, losses: 33 }, skill: 0.83 },
  { id: 'op-kato', name: 'Kato', bio: 'Buy the dip, sell the rip.', avatar: avatar('K', '#5b8def'), stats: { streak: 1, wins: 22, losses: 19 }, skill: 0.55 },
  { id: 'op-mina', name: 'Mina', bio: 'Patient. Then ruthless.', avatar: avatar('M', '#c77dff'), stats: { streak: 3, wins: 44, losses: 40 }, skill: 0.6 },
  { id: 'op-rook', name: 'Rook', bio: 'New here. Easy money?', avatar: avatar('R', '#ffa14a'), stats: { streak: 0, wins: 3, losses: 4 }, skill: 0.25 },
];

/** Return a fresh shuffled deck of opponents to swipe through. */
export const drawOpponents = (count = ROSTER.length): Opponent[] => {
  const pool = [...ROSTER];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = pool[i]!;
    const b = pool[j]!;
    pool[i] = b;
    pool[j] = a;
  }
  return pool.slice(0, Math.min(count, pool.length));
};

export const getOpponent = (id: string): Opponent | undefined =>
  ROSTER.find(o => o.id === id);
