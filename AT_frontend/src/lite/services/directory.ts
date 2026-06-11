/**
 * Player directory client — registers the trader's card with the server on
 * sign-up and fetches other players' cards for the swipe deck.
 *
 * In production (any non-localhost origin) this talks to the same-origin
 * /api/players endpoints served by server.mjs. In local Vite dev there's no
 * such server, so it no-ops and the deck falls back to the demo roster.
 */

import type { LiteProfile, Opponent } from '../types';

interface PlayerCard {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  wager?: number;
  stats: { wins: number; losses: number; streak: number };
}

/** Same-origin API base in prod; null in local dev (→ mock roster fallback). */
const apiBase = (): string | null => {
  if (typeof window === 'undefined' || !window.location) return null;
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return null;
  return '';
};

export const registerCard = async (profile: LiteProfile, wager: number): Promise<void> => {
  const base = apiBase();
  if (base === null) return;
  try {
    await fetch(`${base}/api/players`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: profile.id,
        name: profile.name,
        bio: profile.bio,
        avatar: profile.avatar,
        wager,
        stats: profile.stats,
      }),
    });
  } catch {
    /* best-effort; deck still works with the demo roster */
  }
};

export const cardToOpponent = (c: PlayerCard): Opponent => ({
  id: c.id,
  name: c.name,
  bio: c.bio,
  avatar: c.avatar,
  stats: { wins: c.stats.wins, losses: c.stats.losses, streak: c.stats.streak },
  wager: Math.max(1, Math.min(100, Number(c.wager) || 25)),
  skill: 0.5,
});

export const fetchPlayerCards = async (excludeId: string): Promise<Opponent[] | null> => {
  const base = apiBase();
  if (base === null) return null;
  try {
    const r = await fetch(`${base}/api/players?exclude=${encodeURIComponent(excludeId)}`);
    if (!r.ok) return null;
    const j = (await r.json()) as { players?: PlayerCard[] };
    if (!Array.isArray(j.players)) return null;
    return j.players.filter(c => c && c.id && c.name).map(cardToOpponent);
  } catch {
    return null;
  }
};
