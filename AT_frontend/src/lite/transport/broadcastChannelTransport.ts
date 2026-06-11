/**
 * BroadcastChannelTransport — real P2P across browser tabs on the same origin
 * (and device). No server required: matchmaking + the match room both ride
 * BroadcastChannel, which delivers messages to OTHER same-origin contexts but
 * not back to the sender — exactly the peer semantics we need.
 *
 * Open two tabs on /lite, hit "Quick Match" in both, and they pair + duel live.
 * For cross-device play, swap in the WebSocketTransport (same interface).
 */

import {
  selectHost,
  type MatchTransport,
  type MatchmakeArgs,
  type MatchmakeResult,
  type Room,
  type RoomMessage,
} from './types';

const MM_CHANNEL = 'bitmatch:mm:v1';
const PREROLL_MS = 9_000; // arming buffer (load + pick)
const SEEK_EVERY_MS = 600;

type SeekMsg = { k: 'seek'; clientId: string; name: string; avatar: string };
type PairMsg = {
  k: 'pair';
  matchId: string;
  hostId: string;
  guestId: string;
  liveStartAt: number;
  hostName: string; hostAvatar: string;
  guestName: string; guestAvatar: string;
};
type MmMsg = SeekMsg | PairMsg;

const randId = (): string =>
  `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

const hasBC = (): boolean => typeof window !== 'undefined' && 'BroadcastChannel' in window;

class BroadcastRoom implements Room {
  private ch: BroadcastChannel;
  private subs = new Set<(m: RoomMessage) => void>();
  constructor(matchId: string) {
    this.ch = new BroadcastChannel(`bitmatch:room:${matchId}`);
    this.ch.onmessage = (e: MessageEvent) => {
      const m = e.data as RoomMessage;
      this.subs.forEach(cb => { try { cb(m); } catch { /* ignore */ } });
    };
  }
  send(msg: RoomMessage): void { this.ch.postMessage(msg); }
  subscribe(cb: (m: RoomMessage) => void): () => void {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  }
  close(): void {
    try { this.ch.postMessage({ t: 'bye' } as RoomMessage); } catch { /* ignore */ }
    this.subs.clear();
    this.ch.close();
  }
}

export class BroadcastChannelTransport implements MatchTransport {
  readonly kind = 'broadcast-channel';

  isAvailable(): boolean { return hasBC(); }

  matchmake(args: MatchmakeArgs): Promise<MatchmakeResult | null> {
    if (!hasBC()) return Promise.resolve(null);

    return new Promise<MatchmakeResult | null>(resolve => {
      const me = randId();
      const ch = new BroadcastChannel(MM_CHANNEL);
      let done = false;
      let seekTimer: ReturnType<typeof setInterval> | null = null;
      let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
      let cancelTimer: ReturnType<typeof setInterval> | null = null;

      const cleanup = () => {
        if (seekTimer) clearInterval(seekTimer);
        if (timeoutTimer) clearTimeout(timeoutTimer);
        if (cancelTimer) clearInterval(cancelTimer);
        ch.onmessage = null;
        ch.close();
      };
      const settle = (r: MatchmakeResult | null) => {
        if (done) return;
        done = true;
        cleanup();
        resolve(r);
      };

      const seek: SeekMsg = { k: 'seek', clientId: me, name: args.profile.name, avatar: args.profile.avatar };
      const postSeek = () => { if (!done) ch.postMessage(seek); };

      ch.onmessage = (e: MessageEvent) => {
        if (done) return;
        const msg = e.data as MmMsg;
        if (msg.k === 'seek' && msg.clientId !== me) {
          // I see another seeker — the lower id hosts and issues the pairing.
          if (selectHost(me, msg.clientId) === me) {
            const matchId = `m-${me}-${msg.clientId}`;
            const liveStartAt = Date.now() + PREROLL_MS;
            const pair: PairMsg = {
              k: 'pair', matchId, hostId: me, guestId: msg.clientId, liveStartAt,
              hostName: args.profile.name, hostAvatar: args.profile.avatar,
              guestName: msg.name, guestAvatar: msg.avatar,
            };
            ch.postMessage(pair);
            // Same device → no clock skew.
            settle({ matchId, role: 'host', liveStartAt, clockOffsetMs: 0, opponent: { name: msg.name, avatar: msg.avatar } });
          }
          // else: I'm the guest — wait for the host's pair message.
        } else if (msg.k === 'pair' && msg.guestId === me) {
          settle({
            matchId: msg.matchId, role: 'guest', liveStartAt: msg.liveStartAt, clockOffsetMs: 0,
            opponent: { name: msg.hostName, avatar: msg.hostAvatar },
          });
        }
      };

      postSeek();
      seekTimer = setInterval(postSeek, SEEK_EVERY_MS);
      timeoutTimer = setTimeout(() => settle(null), args.timeoutMs);
      cancelTimer = setInterval(() => { if (args.signal.cancelled) settle(null); }, 200);
    });
  }

  openRoom(matchId: string): Room {
    return new BroadcastRoom(matchId);
  }
}
