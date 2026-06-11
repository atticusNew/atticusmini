/**
 * Single entry point for the realtime match transport.
 *
 * Selection:
 *   - If VITE_MATCH_WS_URL is set → WebSocketTransport (cross-device prod).
 *   - Else → BroadcastChannelTransport (real cross-tab P2P, no server).
 *
 * Call sites depend only on the MatchTransport interface, so swapping the
 * production relay in is a config change, not a code change.
 */

import type { MatchTransport } from './types';
import { BroadcastChannelTransport } from './broadcastChannelTransport';
import { WebSocketTransport, webSocketBaseUrl } from './webSocketTransport';

/**
 * Resolve the relay base URL:
 *   1. explicit VITE_MATCH_WS_URL (e.g., a dedicated relay host), else
 *   2. same origin in any non-localhost deploy (server.mjs hosts the relay),
 *      so cross-device P2P "just works" in production, else
 *   3. undefined → local dev uses cross-tab BroadcastChannel.
 */
export const getRelayBase = (): string | undefined => {
  const env = webSocketBaseUrl();
  if (env) return env;
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname, host } = window.location;
    const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';
    if (!isLocalDev && host) {
      return `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}`;
    }
  }
  return undefined;
};

let active: MatchTransport | null = null;

export const getMatchTransport = (): MatchTransport => {
  if (active) return active;
  const base = getRelayBase();
  active = base ? new WebSocketTransport(base) : new BroadcastChannelTransport();
  return active;
};

export const setMatchTransport = (t: MatchTransport): void => { active = t; };

export type {
  MatchTransport, MatchmakeArgs, MatchmakeResult, Room, RoomMessage,
} from './types';
