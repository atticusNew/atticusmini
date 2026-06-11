// WebSocket match relay for Atticus Lite (bitMATCH) cross-device P2P.
//
// Two endpoints on the same origin as the app:
//   /matchmake        — pairs two waiting players, then tells each its role,
//                       the shared liveStartAt, and the opponent's name/avatar.
//   /room/:matchId    — relays RoomMessage JSON between the two paired players.
//
// This is a thin relay (not authoritative): the duel rules run client-side via
// matchEngine, identically on both peers. A future hardening step is to make
// settlement server-authoritative here using the same engine.

import { WebSocketServer } from 'ws';

const PREROLL_MS = 12_000; // shared arming buffer (≈10s pick + load), in server time

export function attachMatchRelay(server) {
  const wss = new WebSocketServer({ noServer: true });
  let waiting = null;            // { ws, seek } awaiting a partner
  const rooms = new Map();       // matchId -> Set<ws> (max 2)

  const send = (ws, obj) => { try { ws.send(JSON.stringify(obj)); } catch { /* ignore */ } };

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

      if (waiting && waiting.ws.readyState === 1) {
        const peer = waiting;
        waiting = null;
        const matchId = `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const liveStartAt = Date.now() + PREROLL_MS;
        send(peer.ws, { type: 'paired', matchId, role: 'host', liveStartAt, opponent: { name: seek.name, avatar: seek.avatar } });
        send(ws, { type: 'paired', matchId, role: 'guest', liveStartAt, opponent: { name: peer.seek.name, avatar: peer.seek.avatar } });
      } else {
        const me = { ws, seek };
        waiting = me;
        ws.on('close', () => { if (waiting === me) waiting = null; });
      }
    });
  }

  function onRoom(ws, matchId) {
    let set = rooms.get(matchId);
    if (!set) { set = new Set(); rooms.set(matchId, set); }
    if (set.size >= 2) { ws.close(); return; }
    set.add(ws);
    ws.on('message', data => {
      const text = data.toString();
      for (const peer of set) {
        if (peer !== ws && peer.readyState === 1) peer.send(text);
      }
    });
    const cleanup = () => { set.delete(ws); if (set.size === 0) rooms.delete(matchId); };
    ws.on('close', cleanup);
    ws.on('error', cleanup);
  }

  return wss;
}
