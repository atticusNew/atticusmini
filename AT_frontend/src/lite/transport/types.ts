/**
 * Realtime transport for P2P duels.
 *
 * Two responsibilities:
 *   1. Matchmaking — pair this client with another real player.
 *   2. Room — a duplex channel between the two paired clients for the match.
 *
 * Implementations:
 *   - BroadcastChannelTransport: real cross-tab P2P on the same origin/device
 *     (no server). Great for demo + local testing of the full flow.
 *   - WebSocketTransport: cross-device production (needs a small relay server);
 *     activated when VITE_MATCH_WS_URL is set.
 *
 * The match RULES stay in matchEngine (pure), so both clients — and a future
 * authoritative server — compute identical outcomes.
 */

import type { Direction } from '../types';

export interface MatchmakeArgs {
  profile: { name: string; avatar: string };
  wager: number;
  amount: number;
  /** Flip to true to abort an in-flight search. */
  signal: { cancelled: boolean };
  timeoutMs: number;
}

export interface MatchmakeResult {
  matchId: string;
  role: 'host' | 'guest';
  /** Shared wall-clock ms when the live 30s window begins (arming ends). */
  liveStartAt: number;
  opponent: { name: string; avatar: string };
}

/** Messages exchanged between the two paired clients during a duel. */
export type RoomMessage =
  | { t: 'entry'; dir: Direction; entrySpot: number; at: number }
  | { t: 'sell'; spot: number; at: number }
  | { t: 'hello'; name: string; avatar: string }
  | { t: 'bye' };

export interface Room {
  send(msg: RoomMessage): void;
  subscribe(cb: (msg: RoomMessage) => void): () => void;
  close(): void;
}

export interface MatchTransport {
  readonly kind: string;
  isAvailable(): boolean;
  matchmake(args: MatchmakeArgs): Promise<MatchmakeResult | null>;
  openRoom(matchId: string): Room;
}

/** Deterministic host selection: lower id hosts. Both peers agree without a coordinator. */
export const selectHost = (idA: string, idB: string): string => (idA < idB ? idA : idB);
