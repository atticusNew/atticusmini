// Authoritative WebSocket relay for Atticus Lite (bitMATCH) P2P.
//
// Endpoints (same origin as the app):
//   /matchmake      — pairs two waiting players of the SAME wager (quick match).
//   /presence       — online presence + direct invites (swipe-to-challenge a
//                     specific player to a LIVE duel). On accept, both players
//                     are matched and routed into a room.
//   /room/:matchId  — the duel channel. The relay forwards peer messages AND is
//                     AUTHORITATIVE: it owns the BTC price, captures entry at
//                     the shared start, locks sells at receipt, and computes the
//                     winner at expiry from its own price. Disconnect → forfeit
//                     (after a reconnect grace window).
//
// PnL/winner math mirrors src/lite/services/matchEngine.ts.

import { WebSocketServer } from 'ws';
import { registerPlayer } from './directory.mjs';

const PREROLL_MS = Number(process.env.RELAY_PREROLL_MS) || 9_000;
const DURATION_MS = Number(process.env.RELAY_DURATION_MS) || 30_000;
const LEVERAGE = 120;
const PUSH_EPS = 0.01;
const SETTLE_GRACE_MS = 600;
const RECONNECT_GRACE_MS = Number(process.env.RELAY_RECONNECT_GRACE_MS) || 6_000;
const INVITE_TTL_MS = Number(process.env.RELAY_INVITE_TTL_MS) || 20_000;
const MAX_CONN_PER_IP = Number(process.env.RELAY_MAX_CONN_PER_IP) || 60;
const CONN_WINDOW_MS = 10_000;
const MAX_WAITING = 1000;
const MAX_ROOMS = 5000;

// ---- authoritative price feed -------------------------------------------------
let spot = 0;
const PRICE_SOURCES = [
  async () => {
    const r = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
    const j = await r.json();
    return parseFloat(j?.data?.amount);
  },
  async () => {
    const r = await fetch('https://api.kraken.com/0/public/Ticker?pair=XBTUSD');
    const j = await r.json();
    const k = j?.result && Object.keys(j.result)[0];
    return parseFloat(j?.result?.[k]?.c?.[0]);
  },
];
async function pollSpot() {
  for (const src of PRICE_SOURCES) {
    try {
      const p = await src();
      if (Number.isFinite(p) && p > 0) { spot = p; return; }
    } catch { /* next */ }
  }
}

function legPnl(dir, entry, px, amount) {
  if (!dir || !entry || entry <= 0) return 0;
  const ret = (px - entry) / entry;
  const raw = amount * LEVERAGE * (dir === 'up' ? 1 : -1) * ret;
  return Math.max(-amount, raw);
}

const randId = p => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function attachMatchRelay(server) {
  const wss = new WebSocketServer({ noServer: true });
  const waitingByWager = new Map(); // wager -> { ws, info }
  const matches = new Map();        // matchId -> match
  const presence = new Map();       // playerId -> { ws, card }
  const invites = new Map();        // inviteId -> { fromId, toId, wager, amount, timer }
  const ipHits = new Map();

  pollSpot();
  const priceTimer = setInterval(pollSpot, 1200);
  if (priceTimer.unref) priceTimer.unref();

  const send = (ws, obj) => { try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); } catch { /* ignore */ } };
  const other = role => (role === 'host' ? 'guest' : 'host');

  const rateLimited = req => {
    const ip = req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const hits = (ipHits.get(ip) || []).filter(t => now - t < CONN_WINDOW_MS);
    if (hits.length >= MAX_CONN_PER_IP) { ipHits.set(ip, hits); return true; }
    hits.push(now); ipHits.set(ip, hits); return false;
  };

  server.on('upgrade', (req, socket, head) => {
    let pathname;
    try { pathname = new URL(req.url, 'http://localhost').pathname; } catch { socket.destroy(); return; }
    if (rateLimited(req)) { socket.destroy(); return; }
    if (pathname === '/matchmake') {
      wss.handleUpgrade(req, socket, head, ws => onMatchmake(ws));
    } else if (pathname === '/presence') {
      wss.handleUpgrade(req, socket, head, ws => onPresence(ws));
    } else if (pathname.startsWith('/room/')) {
      const matchId = decodeURIComponent(pathname.slice('/room/'.length));
      if (!matchId) { socket.destroy(); return; }
      wss.handleUpgrade(req, socket, head, ws => onRoom(ws, matchId));
    } else {
      socket.destroy();
    }
  });

  // Create the authoritative match record + schedule. Caller notifies players.
  function setupMatch(hostInfo, guestInfo) {
    const matchId = randId('m');
    const liveStartAt = Date.now() + PREROLL_MS;
    const expiryAt = liveStartAt + DURATION_MS;
    const match = {
      matchId, wager: hostInfo.wager, liveStartAt, expiryAt, entrySpot: 0, settled: false,
      sides: {
        host: { name: hostInfo.name, avatar: hostInfo.avatar, amount: hostInfo.amount, dir: null, realizedPnl: null, sold: false, connected: false },
        guest: { name: guestInfo.name, avatar: guestInfo.avatar, amount: guestInfo.amount, dir: null, realizedPnl: null, sold: false, connected: false },
      },
      sockets: { host: null, guest: null },
      timers: {},
    };
    matches.set(matchId, match);
    match.timers.start = setTimeout(() => { match.entrySpot = spot; }, Math.max(0, liveStartAt - Date.now()));
    match.timers.expiry = setTimeout(() => settle(match, 'expiry'), Math.max(0, expiryAt + SETTLE_GRACE_MS - Date.now()));
    return { matchId, liveStartAt };
  }

  // ---- quick matchmaking (random, wager-bucketed) -----------------------------
  function onMatchmake(ws) {
    ws.on('error', () => {});
    ws.once('message', data => {
      let seek; try { seek = JSON.parse(data.toString()); } catch { ws.close(); return; }
      if (!seek || seek.type !== 'seek') { ws.close(); return; }
      const wager = Number(seek.wager) || 0;
      const amount = Number(seek.amount) || 1;
      const bucket = waitingByWager.get(wager);
      if (bucket && bucket.ws.readyState === 1) {
        if (matches.size >= MAX_ROOMS) { ws.close(); return; }
        waitingByWager.delete(wager);
        const peer = bucket;
        const { matchId, liveStartAt } = setupMatch(
          { name: peer.info.name, avatar: peer.info.avatar, wager, amount: peer.info.amount },
          { name: seek.name, avatar: seek.avatar, wager, amount },
        );
        const now = Date.now();
        send(peer.ws, { type: 'paired', matchId, role: 'host', liveStartAt, serverNow: now, opponent: { name: seek.name, avatar: seek.avatar } });
        send(ws, { type: 'paired', matchId, role: 'guest', liveStartAt, serverNow: now, opponent: { name: peer.info.name, avatar: peer.info.avatar } });
      } else {
        if (waitingByWager.size >= MAX_WAITING) { ws.close(); return; }
        const me = { ws, info: { name: seek.name, avatar: seek.avatar, amount } };
        waitingByWager.set(wager, me);
        ws.on('close', () => { if (waitingByWager.get(wager) === me) waitingByWager.delete(wager); });
      }
    });
  }

  // ---- presence + invites -----------------------------------------------------
  function onPresence(ws) {
    ws._playerId = null;
    ws.on('error', () => {});
    ws.on('message', data => {
      let m; try { m = JSON.parse(data.toString()); } catch { return; }
      if (m.type === 'hello' && m.card && typeof m.card.id === 'string' && m.card.id) {
        ws._playerId = String(m.card.id).slice(0, 64);
        presence.set(ws._playerId, { ws, card: m.card });
        try { registerPlayer(m.card); } catch { /* ignore */ }
        send(ws, { type: 'presence_ok' });
      } else if (m.type === 'ping') {
        send(ws, { type: 'pong' });
      } else if (m.type === 'invite') {
        onInvite(ws, m);
      } else if (m.type === 'accept') {
        onAccept(ws, m);
      } else if (m.type === 'decline') {
        onDecline(ws, m);
      }
    });
    ws.on('close', () => {
      if (ws._playerId && presence.get(ws._playerId)?.ws === ws) presence.delete(ws._playerId);
    });
  }

  function onInvite(fromWs, m) {
    const fromId = fromWs._playerId;
    if (!fromId) return;
    const toId = String(m.toId || '');
    const target = presence.get(toId);
    const fromCard = presence.get(fromId)?.card || {};
    if (!target || target.ws.readyState !== 1) {
      send(fromWs, { type: 'invite_failed', toId, reason: 'offline' });
      return;
    }
    const inviteId = randId('i');
    const wager = Number(m.wager) || 0;
    const amount = Number(m.amount) || 1;
    const timer = setTimeout(() => {
      if (invites.delete(inviteId)) send(fromWs, { type: 'invite_expired', inviteId, toId });
    }, INVITE_TTL_MS);
    invites.set(inviteId, { fromId, toId, wager, fromAmount: amount, timer });
    send(target.ws, { type: 'invited', inviteId, from: { id: fromId, name: fromCard.name, avatar: fromCard.avatar }, wager });
    send(fromWs, { type: 'invite_sent', inviteId, toId });
  }

  function onAccept(toWs, m) {
    const inv = invites.get(m.inviteId);
    if (!inv) { send(toWs, { type: 'invite_gone', inviteId: m.inviteId }); return; }
    clearTimeout(inv.timer);
    invites.delete(m.inviteId);
    const fromP = presence.get(inv.fromId);
    const toP = presence.get(inv.toId);
    if (!fromP || !toP || fromP.ws.readyState !== 1 || toP.ws.readyState !== 1) {
      if (fromP) send(fromP.ws, { type: 'invite_failed', reason: 'offline' });
      return;
    }
    const guestAmount = Number(m.amount) || inv.fromAmount;
    const { matchId, liveStartAt } = setupMatch(
      { name: fromP.card.name, avatar: fromP.card.avatar, wager: inv.wager, amount: inv.fromAmount },
      { name: toP.card.name, avatar: toP.card.avatar, wager: inv.wager, amount: guestAmount },
    );
    const now = Date.now();
    send(fromP.ws, { type: 'matched', matchId, role: 'host', liveStartAt, serverNow: now, opponent: { name: toP.card.name, avatar: toP.card.avatar } });
    send(toP.ws, { type: 'matched', matchId, role: 'guest', liveStartAt, serverNow: now, opponent: { name: fromP.card.name, avatar: fromP.card.avatar } });
  }

  function onDecline(toWs, m) {
    const inv = invites.get(m.inviteId);
    if (!inv) return;
    clearTimeout(inv.timer);
    invites.delete(m.inviteId);
    const fromP = presence.get(inv.fromId);
    if (fromP) send(fromP.ws, { type: 'invite_declined', inviteId: m.inviteId });
  }

  // ---- room (the duel) --------------------------------------------------------
  function onRoom(ws, matchId) {
    const match = matches.get(matchId);
    if (!match) { ws.close(); return; }
    ws.on('error', () => {});
    ws.on('message', data => {
      let msg; try { msg = JSON.parse(data.toString()); } catch { return; }
      if (msg.t === 'join' && (msg.role === 'host' || msg.role === 'guest')) {
        const ftKey = `forfeit_${msg.role}`;
        if (match.timers[ftKey]) { clearTimeout(match.timers[ftKey]); delete match.timers[ftKey]; }
        ws._role = msg.role;
        match.sockets[msg.role] = ws;
        match.sides[msg.role].connected = true;
        return;
      }
      const role = ws._role;
      if (!role) return;
      if (msg.t === 'entry') {
        if (msg.dir === 'up' || msg.dir === 'down') match.sides[role].dir = msg.dir;
        send(match.sockets[other(role)], msg);
      } else if (msg.t === 'sell') {
        const side = match.sides[role];
        if (!side.sold && side.dir) { side.sold = true; side.realizedPnl = legPnl(side.dir, match.entrySpot, spot, side.amount); }
        send(match.sockets[other(role)], msg);
      } else if (msg.t === 'hello' || msg.t === 'bye') {
        send(match.sockets[other(role)], msg);
      }
    });
    ws.on('close', () => {
      const role = ws._role;
      if (!role) return;
      match.sides[role].connected = false;
      if (match.sockets[role] === ws) match.sockets[role] = null;
      if (match.settled) return;
      match.timers[`forfeit_${role}`] = setTimeout(() => settle(match, 'forfeit', other(role)), RECONNECT_GRACE_MS);
    });
  }

  function settle(match, reason, forfeitWinner) {
    if (match.settled) return;
    match.settled = true;
    for (const key of ['start', 'expiry', 'forfeit_host', 'forfeit_guest']) {
      if (match.timers[key]) clearTimeout(match.timers[key]);
    }
    const finalSpot = spot;
    const entry = match.entrySpot || finalSpot;
    const pnlOf = role => {
      const s = match.sides[role];
      if (s.sold && s.realizedPnl != null) return s.realizedPnl;
      return legPnl(s.dir, entry, finalSpot, s.amount);
    };
    const pnl = { host: pnlOf('host'), guest: pnlOf('guest') };
    const winnerByPnl = Math.abs(pnl.host - pnl.guest) <= PUSH_EPS ? null : (pnl.host > pnl.guest ? 'host' : 'guest');
    const winner = forfeitWinner ?? winnerByPnl;
    for (const role of ['host', 'guest']) {
      const ws = match.sockets[role];
      if (!ws) continue;
      const youPnl = pnl[role];
      const oppPnl = pnl[other(role)];
      const outcome = winner == null ? 'push' : (winner === role ? 'you' : 'opp');
      const transfer = outcome === 'you' ? match.wager : outcome === 'opp' ? -match.wager : 0;
      send(ws, { t: 'settle', outcome, youPnlUSD: youPnl, oppPnlUSD: oppPnl, youNetUSD: youPnl + transfer, wagerUSD: match.wager, finalSpot, reason });
    }
    setTimeout(() => matches.delete(match.matchId), 5_000);
  }

  return wss;
}
