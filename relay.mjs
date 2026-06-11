// Authoritative WebSocket match relay for Atticus Lite (bitMATCH) P2P.
//
// Endpoints (same origin as the app):
//   /matchmake        — pairs two waiting players of the SAME wager, then sends
//                       each its role, the shared liveStartAt, and opponent info.
//   /room/:matchId    — the duel channel. The relay both forwards peer messages
//                       (entry/sell) AND is AUTHORITATIVE: it owns the BTC price,
//                       captures each leg's entry at the shared start, locks
//                       sells at receipt time, and computes the winner at expiry
//                       from its own price — so neither client can cheat the
//                       result. Disconnect before settlement = forfeit.
//
// The PnL/winner math mirrors src/lite/services/matchEngine.ts (strike == entry,
// leverage 120, capped downside, most-profit-wins, push within epsilon).

import { WebSocketServer } from 'ws';

const PREROLL_MS = Number(process.env.RELAY_PREROLL_MS) || 12_000;
const DURATION_MS = Number(process.env.RELAY_DURATION_MS) || 30_000;
const LEVERAGE = 120;
const PUSH_EPS = 0.01;
const SETTLE_GRACE_MS = 600; // let a last-instant sell land before settling

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
    } catch { /* try next */ }
  }
}

// ---- pure PnL (mirror of matchEngine) ----------------------------------------
function legPnl(dir, entry, px, amount) {
  if (!dir || !entry || entry <= 0) return 0;
  const ret = (px - entry) / entry;
  const raw = amount * LEVERAGE * (dir === 'up' ? 1 : -1) * ret;
  return Math.max(-amount, raw);
}

export function attachMatchRelay(server) {
  const wss = new WebSocketServer({ noServer: true });
  const waitingByWager = new Map(); // wager -> { ws, seek }
  const matches = new Map();        // matchId -> match

  pollSpot();
  const priceTimer = setInterval(pollSpot, 1200);
  if (priceTimer.unref) priceTimer.unref();

  const send = (ws, obj) => { try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); } catch { /* ignore */ } };
  const other = role => (role === 'host' ? 'guest' : 'host');

  server.on('upgrade', (req, socket, head) => {
    let pathname;
    try { pathname = new URL(req.url, 'http://localhost').pathname; } catch { socket.destroy(); return; }
    if (pathname === '/matchmake') {
      wss.handleUpgrade(req, socket, head, ws => onMatchmake(ws));
    } else if (pathname.startsWith('/room/')) {
      const matchId = decodeURIComponent(pathname.slice('/room/'.length));
      if (!matchId) { socket.destroy(); return; }
      wss.handleUpgrade(req, socket, head, ws => onRoom(ws, matchId));
    } else {
      socket.destroy();
    }
  });

  function onMatchmake(ws) {
    ws.on('error', () => {});
    ws.once('message', data => {
      let seek;
      try { seek = JSON.parse(data.toString()); } catch { ws.close(); return; }
      if (!seek || seek.type !== 'seek') { ws.close(); return; }
      const wager = Number(seek.wager) || 0;
      const amount = Number(seek.amount) || 1;
      const bucket = waitingByWager.get(wager);

      if (bucket && bucket.ws.readyState === 1) {
        waitingByWager.delete(wager);
        const peer = bucket;
        const matchId = `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const liveStartAt = Date.now() + PREROLL_MS;
        const expiryAt = liveStartAt + DURATION_MS;
        const match = {
          matchId, wager, amount, liveStartAt, expiryAt, entrySpot: 0, settled: false,
          sides: {
            host: { name: peer.seek.name, avatar: peer.seek.avatar, dir: null, realizedPnl: null, sold: false, connected: false },
            guest: { name: seek.name, avatar: seek.avatar, dir: null, realizedPnl: null, sold: false, connected: false },
          },
          sockets: { host: null, guest: null },
          timers: {},
        };
        matches.set(matchId, match);
        send(peer.ws, { type: 'paired', matchId, role: 'host', liveStartAt, opponent: { name: seek.name, avatar: seek.avatar } });
        send(ws, { type: 'paired', matchId, role: 'guest', liveStartAt, opponent: { name: peer.seek.name, avatar: peer.seek.avatar } });

        // Capture the authoritative entry price at the shared start.
        match.timers.start = setTimeout(() => { match.entrySpot = spot; }, Math.max(0, liveStartAt - Date.now()));
        // Settle authoritatively a hair after expiry.
        match.timers.expiry = setTimeout(() => settle(match, 'expiry'), Math.max(0, expiryAt + SETTLE_GRACE_MS - Date.now()));
      } else {
        const me = { ws, seek: { name: seek.name, avatar: seek.avatar }, wager, amount };
        waitingByWager.set(wager, me);
        ws.on('close', () => { if (waitingByWager.get(wager) === me) waitingByWager.delete(wager); });
      }
    });
  }

  function onRoom(ws, matchId) {
    const match = matches.get(matchId);
    if (!match) { ws.close(); return; }
    ws.on('error', () => {});

    ws.on('message', data => {
      let msg;
      try { msg = JSON.parse(data.toString()); } catch { return; }

      if (msg.t === 'join' && (msg.role === 'host' || msg.role === 'guest')) {
        ws._role = msg.role;
        match.sockets[msg.role] = ws;
        match.sides[msg.role].connected = true;
        return;
      }
      const role = ws._role;
      if (!role) return;

      if (msg.t === 'entry') {
        if (msg.dir === 'up' || msg.dir === 'down') match.sides[role].dir = msg.dir;
        send(match.sockets[other(role)], msg); // forward for opponent's live view
      } else if (msg.t === 'sell') {
        const side = match.sides[role];
        if (!side.sold && side.dir) {
          side.sold = true;
          side.realizedPnl = legPnl(side.dir, match.entrySpot, spot, match.amount);
        }
        send(match.sockets[other(role)], msg);
      } else if (msg.t === 'hello' || msg.t === 'bye') {
        send(match.sockets[other(role)], msg);
      }
    });

    ws.on('close', () => {
      const role = ws._role;
      if (role) {
        match.sides[role].connected = false;
        if (match.sockets[role] === ws) match.sockets[role] = null;
        // Forfeit: if the match isn't settled and a player drops, the other wins.
        if (!match.settled) settle(match, 'forfeit', other(role));
      }
    });
  }

  function settle(match, reason, forfeitWinner) {
    if (match.settled) return;
    match.settled = true;
    if (match.timers.start) clearTimeout(match.timers.start);
    if (match.timers.expiry) clearTimeout(match.timers.expiry);

    const finalSpot = spot;
    const entry = match.entrySpot || finalSpot;
    const pnlOf = role => {
      const s = match.sides[role];
      if (s.sold && s.realizedPnl != null) return s.realizedPnl;
      return legPnl(s.dir, entry, finalSpot, match.amount);
    };
    const pnl = { host: pnlOf('host'), guest: pnlOf('guest') };

    const winnerByPnl = Math.abs(pnl.host - pnl.guest) <= PUSH_EPS
      ? null
      : (pnl.host > pnl.guest ? 'host' : 'guest');
    const winner = forfeitWinner ?? winnerByPnl;

    for (const role of ['host', 'guest']) {
      const ws = match.sockets[role];
      if (!ws) continue;
      const youPnl = pnl[role];
      const oppPnl = pnl[other(role)];
      const outcome = winner == null ? 'push' : (winner === role ? 'you' : 'opp');
      const transfer = outcome === 'you' ? match.wager : outcome === 'opp' ? -match.wager : 0;
      send(ws, {
        t: 'settle', outcome,
        youPnlUSD: youPnl, oppPnlUSD: oppPnl, youNetUSD: youPnl + transfer,
        wagerUSD: match.wager, finalSpot, reason,
      });
    }
    setTimeout(() => matches.delete(match.matchId), 5_000);
  }

  return wss;
}
