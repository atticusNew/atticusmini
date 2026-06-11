// In-memory player directory for Atticus Lite (bitMATCH).
//
// When a player signs up / opens the app, their card is registered here; the
// swipe deck lists recently-seen players (excluding the viewer). This is a
// pragmatic production store (in-memory, TTL'd) — swap for a DB later without
// changing the HTTP contract in server.mjs.

const TTL_MS = Number(process.env.DIRECTORY_TTL_MS) || 24 * 60 * 60 * 1000;
const MAX_PLAYERS = Number(process.env.DIRECTORY_MAX) || 5000;
const MAX_AVATAR_CHARS = 300_000; // downscaled data URLs are well under this

const players = new Map(); // id -> { card, lastSeen }

const clamp = (s, n) => (typeof s === 'string' ? s.slice(0, n) : '');

export function registerPlayer(card) {
  if (!card || typeof card.id !== 'string' || !card.id || typeof card.name !== 'string' || !card.name) {
    return false;
  }
  const clean = {
    id: clamp(card.id, 64),
    name: clamp(card.name, 24),
    bio: clamp(card.bio, 120),
    avatar: clamp(card.avatar, MAX_AVATAR_CHARS),
    stats: {
      wins: Math.max(0, Number(card?.stats?.wins) || 0),
      losses: Math.max(0, Number(card?.stats?.losses) || 0),
      streak: Number(card?.stats?.streak) || 0,
    },
  };
  players.set(clean.id, { card: clean, lastSeen: Date.now() });
  prune();
  return true;
}

function prune() {
  const now = Date.now();
  for (const [id, v] of players) {
    if (now - v.lastSeen > TTL_MS) players.delete(id);
  }
  if (players.size > MAX_PLAYERS) {
    const oldest = [...players.entries()].sort((a, b) => a[1].lastSeen - b[1].lastSeen);
    for (let i = 0; i < players.size - MAX_PLAYERS; i++) players.delete(oldest[i][0]);
  }
}

export function listPlayers(excludeId = '', limit = 30) {
  const now = Date.now();
  return [...players.values()]
    .filter(v => now - v.lastSeen <= TTL_MS && v.card.id !== excludeId)
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, Math.max(0, limit))
    .map(v => v.card);
}
