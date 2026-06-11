// Player directory for Atticus Lite (bitMATCH) — the swipe-deck of real players.
//
// In-memory cache for fast reads, with a durable backend so cards survive
// restarts:
//   - Postgres if DATABASE_URL is set (production durable store), else
//   - a JSON file (DIRECTORY_FILE, default ./data/players.json).
//
// registerPlayer() updates the cache immediately and write-throughs to the
// durable backend (best-effort). listPlayers() reads the cache.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const TTL_MS = Number(process.env.DIRECTORY_TTL_MS) || 24 * 60 * 60 * 1000;
const MAX_PLAYERS = Number(process.env.DIRECTORY_MAX) || 5000;
const MAX_AVATAR_CHARS = 300_000;
const FILE_PATH = process.env.DIRECTORY_FILE || './data/players.json';

const cache = new Map(); // id -> { card, lastSeen }
let durable = null;
let saveTimer = null;

const clamp = (s, n) => (typeof s === 'string' ? s.slice(0, n) : '');

function sanitize(card) {
  if (!card || typeof card.id !== 'string' || !card.id || typeof card.name !== 'string' || !card.name) return null;
  return {
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
}

function prune() {
  const now = Date.now();
  for (const [id, v] of cache) if (now - v.lastSeen > TTL_MS) cache.delete(id);
  if (cache.size > MAX_PLAYERS) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].lastSeen - b[1].lastSeen);
    for (let i = 0; i < cache.size - MAX_PLAYERS; i++) cache.delete(oldest[i][0]);
  }
}

// ---- durable backends ---------------------------------------------------------
function fileBackend() {
  return {
    kind: 'file',
    async load() {
      try {
        const raw = await readFile(FILE_PATH, 'utf8');
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
      } catch { return []; }
    },
    // Debounced full snapshot write (data set is small).
    scheduleSave() {
      if (saveTimer) return;
      saveTimer = setTimeout(async () => {
        saveTimer = null;
        const rows = [...cache.values()].map(v => ({ card: v.card, lastSeen: v.lastSeen }));
        try { await mkdir(dirname(FILE_PATH), { recursive: true }); await writeFile(FILE_PATH, JSON.stringify(rows)); }
        catch { /* ignore */ }
      }, 1500);
      if (saveTimer.unref) saveTimer.unref();
    },
  };
}

function pgBackend(url) {
  let pool = null;
  let ready = null;
  const init = async () => {
    const { default: pg } = await import('pg');
    pool = new pg.Pool({ connectionString: url, max: 4 });
    await pool.query(`CREATE TABLE IF NOT EXISTS lite_players (
      id text PRIMARY KEY, name text, bio text, avatar text,
      stats jsonb, last_seen bigint
    )`);
  };
  return {
    kind: 'postgres',
    async load() {
      try {
        ready = ready || init();
        await ready;
        const cutoff = Date.now() - TTL_MS;
        const { rows } = await pool.query('SELECT id,name,bio,avatar,stats,last_seen FROM lite_players WHERE last_seen >= $1', [cutoff]);
        return rows.map(r => ({ card: { id: r.id, name: r.name, bio: r.bio, avatar: r.avatar, stats: r.stats }, lastSeen: Number(r.last_seen) }));
      } catch { return []; }
    },
    scheduleSave() {
      if (saveTimer) return;
      saveTimer = setTimeout(async () => {
        saveTimer = null;
        try {
          ready = ready || init();
          await ready;
          // Upsert every cached row (small set; simple + correct).
          for (const v of cache.values()) {
            const c = v.card;
            await pool.query(
              `INSERT INTO lite_players (id,name,bio,avatar,stats,last_seen) VALUES ($1,$2,$3,$4,$5,$6)
               ON CONFLICT (id) DO UPDATE SET name=$2,bio=$3,avatar=$4,stats=$5,last_seen=$6`,
              [c.id, c.name, c.bio, c.avatar, JSON.stringify(c.stats), v.lastSeen],
            );
          }
        } catch { /* ignore; cache still serves */ }
      }, 2000);
      if (saveTimer.unref) saveTimer.unref();
    },
  };
}

function getDurable() {
  if (durable) return durable;
  durable = process.env.DATABASE_URL ? pgBackend(process.env.DATABASE_URL) : fileBackend();
  return durable;
}

// Load persisted cards into the cache on boot (best-effort).
(async () => {
  try {
    const rows = await getDurable().load();
    const now = Date.now();
    for (const r of rows) {
      const card = sanitize(r.card);
      if (card && now - (r.lastSeen || 0) <= TTL_MS) cache.set(card.id, { card, lastSeen: r.lastSeen || now });
    }
    prune();
  } catch { /* ignore */ }
})();

// ---- public API ---------------------------------------------------------------
export function registerPlayer(card) {
  const clean = sanitize(card);
  if (!clean) return false;
  cache.set(clean.id, { card: clean, lastSeen: Date.now() });
  prune();
  try { getDurable().scheduleSave(); } catch { /* ignore */ }
  return true;
}

export function listPlayers(excludeId = '', limit = 30) {
  const now = Date.now();
  return [...cache.values()]
    .filter(v => now - v.lastSeen <= TTL_MS && v.card.id !== excludeId)
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, Math.max(0, limit))
    .map(v => v.card);
}
