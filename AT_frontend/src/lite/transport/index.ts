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

let active: MatchTransport | null = null;

export const getMatchTransport = (): MatchTransport => {
  if (active) return active;
  const wsUrl = webSocketBaseUrl();
  active = wsUrl ? new WebSocketTransport(wsUrl) : new BroadcastChannelTransport();
  return active;
};

export const setMatchTransport = (t: MatchTransport): void => { active = t; };

export type {
  MatchTransport, MatchmakeArgs, MatchmakeResult, Room, RoomMessage,
} from './types';
