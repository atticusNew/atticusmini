/**
 * PresenceClient — online presence + direct invites over the relay.
 *
 * Connects to /presence, announces the player's card (online), and lets you
 * invite a specific player to a LIVE duel (swipe-to-challenge). On accept, the
 * relay emits 'matched' on both sides, which the app turns into a P2P match.
 *
 * Only meaningful when a relay is reachable (production / LAN / tunnel). On
 * local Vite dev there's no relay, so PresenceClient.available() is false and
 * the app falls back to bot matches for swipes.
 */

import { getRelayBase } from '../transport';

export interface PresenceCard { id: string; name: string; avatar: string }

export type PresenceEvent =
  | { type: 'invited'; inviteId: string; from: { id: string; name: string; avatar: string }; wager: number }
  | { type: 'invite_sent'; inviteId: string; toId: string }
  | { type: 'invite_declined'; inviteId: string }
  | { type: 'invite_expired'; inviteId: string }
  | { type: 'invite_failed'; reason: string }
  | { type: 'matched'; matchId: string; role: 'host' | 'guest'; liveStartAt: number; serverNow?: number; opponent: { name: string; avatar: string } };

type Handler = (e: PresenceEvent) => void;

export class PresenceClient {
  private base: string;
  private card: PresenceCard;
  private ws: WebSocket | null = null;
  private handlers = new Set<Handler>();
  private closing = false;
  private retries = 0;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(base: string, card: PresenceCard) {
    this.base = base.replace(/\/$/, '');
    this.card = card;
    this.connect();
  }

  static available(): boolean { return !!getRelayBase() && typeof WebSocket !== 'undefined'; }

  private connect(): void {
    if (this.closing) return;
    const ws = new WebSocket(`${this.base}/presence`);
    this.ws = ws;
    ws.onopen = () => {
      this.retries = 0;
      ws.send(JSON.stringify({ type: 'hello', card: this.card }));
      this.pingTimer = setInterval(() => { try { ws.send(JSON.stringify({ type: 'ping' })); } catch { /* ignore */ } }, 25_000);
    };
    ws.onmessage = (e: MessageEvent) => {
      let m: { type?: string };
      try { m = JSON.parse(String(e.data)); } catch { return; }
      if (!m || typeof m.type !== 'string' || m.type === 'pong' || m.type === 'presence_ok') return;
      this.handlers.forEach(h => { try { h(m as PresenceEvent); } catch { /* ignore */ } });
    };
    ws.onclose = () => {
      if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
      if (this.closing || this.retries >= 10) return;
      this.retries += 1;
      setTimeout(() => this.connect(), Math.min(3000, 400 * this.retries));
    };
    ws.onerror = () => { try { ws.close(); } catch { /* ignore */ } };
  }

  private send(obj: unknown): void {
    try { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(obj)); } catch { /* ignore */ }
  }

  updateCard(card: PresenceCard): void { this.card = card; this.send({ type: 'hello', card }); }
  invite(toId: string, wager: number, amount: number): void { this.send({ type: 'invite', toId, wager, amount }); }
  accept(inviteId: string, amount: number): void { this.send({ type: 'accept', inviteId, amount }); }
  decline(inviteId: string): void { this.send({ type: 'decline', inviteId }); }

  on(handler: Handler): () => void { this.handlers.add(handler); return () => this.handlers.delete(handler); }

  close(): void {
    this.closing = true;
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.handlers.clear();
    try { this.ws?.close(); } catch { /* ignore */ }
  }
}
