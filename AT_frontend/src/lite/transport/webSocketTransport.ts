/**
 * WebSocketTransport — cross-device P2P via a thin relay server.
 *
 * Activated only when VITE_MATCH_WS_URL is set; otherwise inert. It needs a
 * small server implementing this protocol (matchmaking + per-room relay):
 *
 *   Matchmaking socket  ->  `${base}/matchmake`
 *     client → { type:'seek', name, avatar, wager, amount }
 *     server → { type:'paired', matchId, role:'host'|'guest', liveStartAt,
 *                opponent:{ name, avatar } }
 *
 *   Room socket         ->  `${base}/room/${matchId}`
 *     Both peers send/receive RoomMessage JSON; the server relays each message
 *     to the OTHER peer in the room.
 *
 * A future authoritative server can additionally validate entries/sells and
 * compute settlement with the same matchEngine rules.
 */

import type {
  MatchTransport, MatchmakeArgs, MatchmakeResult, Room, RoomMessage,
} from './types';

const BASE_URL: string | undefined =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_MATCH_WS_URL?.trim() || undefined;

class WebSocketRoom implements Room {
  private ws: WebSocket;
  private subs = new Set<(m: RoomMessage) => void>();
  private queue: RoomMessage[] = [];
  private open = false;
  constructor(base: string, matchId: string) {
    this.ws = new WebSocket(`${base.replace(/\/$/, '')}/room/${encodeURIComponent(matchId)}`);
    this.ws.onopen = () => { this.open = true; this.queue.forEach(m => this.ws.send(JSON.stringify(m))); this.queue = []; };
    this.ws.onmessage = (e: MessageEvent) => {
      try {
        const m = JSON.parse(String(e.data)) as RoomMessage;
        this.subs.forEach(cb => { try { cb(m); } catch { /* ignore */ } });
      } catch { /* ignore */ }
    };
  }
  send(msg: RoomMessage): void {
    if (this.open) this.ws.send(JSON.stringify(msg)); else this.queue.push(msg);
  }
  subscribe(cb: (m: RoomMessage) => void): () => void {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  }
  close(): void {
    try { this.send({ t: 'bye' }); } catch { /* ignore */ }
    this.subs.clear();
    try { this.ws.close(); } catch { /* ignore */ }
  }
}

export class WebSocketTransport implements MatchTransport {
  readonly kind = 'websocket';
  private base: string;
  constructor(base: string) { this.base = base; }

  isAvailable(): boolean { return !!this.base && typeof WebSocket !== 'undefined'; }

  matchmake(args: MatchmakeArgs): Promise<MatchmakeResult | null> {
    if (!this.isAvailable()) return Promise.resolve(null);
    return new Promise<MatchmakeResult | null>(resolve => {
      let done = false;
      const settle = (r: MatchmakeResult | null) => { if (done) return; done = true; try { ws.close(); } catch { /* ignore */ } resolve(r); };
      const ws = new WebSocket(`${this.base.replace(/\/$/, '')}/matchmake`);
      const timeout = setTimeout(() => settle(null), args.timeoutMs);
      const cancelTimer = setInterval(() => { if (args.signal.cancelled) { clearInterval(cancelTimer); settle(null); } }, 200);
      ws.onopen = () => ws.send(JSON.stringify({ type: 'seek', name: args.profile.name, avatar: args.profile.avatar, wager: args.wager, amount: args.amount }));
      ws.onerror = () => { clearTimeout(timeout); clearInterval(cancelTimer); settle(null); };
      ws.onmessage = (e: MessageEvent) => {
        try {
          const m = JSON.parse(String(e.data)) as { type: string } & Partial<MatchmakeResult>;
          if (m.type === 'paired' && m.matchId && m.role && m.liveStartAt && m.opponent) {
            clearTimeout(timeout); clearInterval(cancelTimer);
            settle({ matchId: m.matchId, role: m.role, liveStartAt: m.liveStartAt, opponent: m.opponent });
          }
        } catch { /* ignore */ }
      };
    });
  }

  openRoom(matchId: string): Room {
    return new WebSocketRoom(this.base, matchId);
  }
}

export const webSocketBaseUrl = (): string | undefined => BASE_URL;
