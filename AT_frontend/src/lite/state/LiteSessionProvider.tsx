import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  LiteProfile,
  MatchResult,
  MatchState,
  Opponent,
} from '../types';
import {
  clearProfile,
  createProfile,
  loadProfile,
  recordOutcome,
  saveProfile,
  type CreateProfileInput,
} from '../services/profileService';
import { liteWallet } from '../services/liteWallet';
import { drawOpponents } from '../services/opponentService';
import { registerCard, fetchPlayerCards } from '../services/directory';
import { PresenceClient, type PresenceEvent } from '../services/presence';
import { getMatchTransport, getRelayBase, type MatchmakeResult, type Room } from '../transport';
import {
  clampAmount,
  clampWager,
  createMatch,
} from '../services/matchEngine';

export type LiteScreen =
  | 'landing'
  | 'onboarding'
  | 'lobby'
  | 'swipe'
  | 'matchmaking'
  | 'match'
  | 'p2pmatch'
  | 'result';

interface LiteSessionValue {
  screen: LiteScreen;
  profile: LiteProfile | null;
  balance: number;
  wagerUSD: number;
  amountUSD: number;
  deck: Opponent[];
  opponent: Opponent | null;
  match: MatchState | null;
  /** Set during a live P2P duel: the realtime room + shared schedule. */
  peer: { room: Room; info: MatchmakeResult } | null;
  /** Which kind of opponent the matchmaking screen is finding. */
  matchmakeMode: 'p2p' | 'bot';
  /** An incoming live-duel invite awaiting your accept/decline. */
  incomingInvite: { inviteId: string; from: { id: string; name: string; avatar: string }; wager: number } | null;
  /** Status of an invite you sent by swiping a real player. */
  outgoingInvite: { status: 'waiting' | 'declined' | 'timeout'; oppName: string } | null;
  acceptInvite: () => void;
  declineInvite: () => void;
  cancelOutgoingInvite: () => void;

  start: () => void;
  signUp: () => void;
  completeOnboarding: (input: CreateProfileInput) => void;
  updateProfile: (patch: Partial<Pick<LiteProfile, 'name' | 'bio' | 'avatar'>>) => void;
  resetBalance: () => void;
  signOut: () => void;
  setWager: (n: number) => void;
  setAmount: (n: number) => void;
  deposit: (amountUSD: number) => void;
  goLobby: () => void;
  openSwipe: () => void;
  challenge: (opp: Opponent) => void;
  enterMatch: () => void;
  quickMatch: () => void;
  beginP2PMatch: (res: MatchmakeResult, room: Room) => void;
  beginBotFallback: () => void;
  startSolo: () => void;
  setMatch: (m: MatchState) => void;
  commitResult: (result: MatchResult) => void;
  rematch: () => void;
}

const LiteSessionContext = createContext<LiteSessionValue | undefined>(undefined);

export const useLiteSession = (): LiteSessionValue => {
  const ctx = useContext(LiteSessionContext);
  if (!ctx) throw new Error('useLiteSession must be used within LiteSessionProvider');
  return ctx;
};

let matchSeq = 0;
const nextMatchId = (): string => `match-${Date.now()}-${matchSeq++}`;

export const LiteSessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const initialProfile = loadProfile();
  const [profile, setProfile] = useState<LiteProfile | null>(initialProfile);
  const [balance, setBalance] = useState<number>(() => liteWallet.getBalance());
  const [wagerUSD, setWagerState] = useState(25);
  const [amountUSD, setAmountState] = useState(10);
  const [screen, setScreen] = useState<LiteScreen>('landing');
  const [deck, setDeck] = useState<Opponent[]>([]);
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [match, setMatchState] = useState<MatchState | null>(null);
  const [peer, setPeer] = useState<{ room: Room; info: MatchmakeResult } | null>(null);
  const [matchmakeMode, setMatchmakeMode] = useState<'p2p' | 'bot'>('bot');
  const [incomingInvite, setIncomingInvite] = useState<LiteSessionValue['incomingInvite']>(null);
  const [outgoingInvite, setOutgoingInvite] = useState<LiteSessionValue['outgoingInvite']>(null);
  const presenceRef = useRef<PresenceClient | null>(null);
  const pendingInviteOppRef = useRef<Opponent | null>(null);

  const start = useCallback(() => {
    setScreen(loadProfile() ? 'lobby' : 'onboarding');
  }, []);

  // Auth is partner-owned and not built yet; sign-up routes to profile creation.
  const signUp = useCallback(() => setScreen('onboarding'), []);

  const completeOnboarding = useCallback((input: CreateProfileInput) => {
    const p = createProfile(input);
    setProfile(p);
    setScreen('lobby');
  }, []);

  const updateProfile = useCallback(
    (patch: Partial<Pick<LiteProfile, 'name' | 'bio' | 'avatar'>>) => {
      setProfile(prev => {
        if (!prev) return prev;
        const next: LiteProfile = {
          ...prev,
          ...(patch.name !== undefined ? { name: patch.name.trim().slice(0, 24) || prev.name } : {}),
          ...(patch.bio !== undefined ? { bio: patch.bio.trim().slice(0, 120) } : {}),
          ...(patch.avatar !== undefined ? { avatar: patch.avatar } : {}),
        };
        saveProfile(next);
        return next;
      });
    },
    [],
  );

  const resetBalance = useCallback(() => {
    liteWallet.reset();
    setBalance(liteWallet.getBalance());
  }, []);

  const signOut = useCallback(() => {
    clearProfile();
    setProfile(null);
    setOpponent(null);
    setMatchState(null);
    setScreen('onboarding');
  }, []);

  const setWager = useCallback((n: number) => setWagerState(clampWager(n)), []);
  const setAmount = useCallback((n: number) => setAmountState(clampAmount(n)), []);

  const deposit = useCallback((amount: number) => {
    setBalance(liteWallet.deposit(amount));
  }, []);

  const closePeer = useCallback(() => {
    setPeer(prev => { if (prev) { try { prev.room.close(); } catch { /* ignore */ } } return null; });
  }, []);

  const goLobby = useCallback(() => {
    setOpponent(null);
    setMatchState(null);
    closePeer();
    setScreen('lobby');
  }, [closePeer]);

  // Keep the player's card in the production directory so others can find them.
  useEffect(() => {
    if (profile) registerCard(profile);
  }, [profile]);

  const openSwipe = useCallback(() => {
    setDeck(drawOpponents()); // immediate demo roster so the deck isn't empty
    setScreen('swipe');
    const id = profile?.id ?? '';
    fetchPlayerCards(id)
      .then(real => {
        if (real && real.length) setDeck([...real, ...drawOpponents()]);
      })
      .catch(() => {});
  }, [profile]);

  const buildMatch = useCallback(
    (mode: 'pvp' | 'solo', opp: { name: string; avatar: string } | null): MatchState =>
      createMatch({
        id: nextMatchId(),
        mode,
        wagerUSD,
        you: {
          name: profile?.name ?? 'You',
          avatar: profile?.avatar ?? '',
          amountUSD,
        },
        opp: {
          name: opp?.name ?? 'Solo',
          avatar: opp?.avatar ?? '',
          amountUSD,
        },
      }),
    [wagerUSD, amountUSD, profile],
  );

  const startBotMatch = useCallback(
    (opp: Opponent) => {
      setMatchmakeMode('bot');
      setOpponent(opp);
      setPeer(null);
      setMatchState(buildMatch('pvp', opp));
      setScreen('matchmaking');
    },
    [buildMatch],
  );

  const beginP2PMatch = useCallback(
    (res: MatchmakeResult, room: Room) => {
      setPeer({ room, info: res });
      setMatchState(buildMatch('pvp', res.opponent));
      setScreen('p2pmatch');
    },
    [buildMatch],
  );

  // Swipe-to-challenge: invite a real, online player to a LIVE duel; otherwise
  // (demo bot card, or no relay) play a bot match.
  const challenge = useCallback(
    (opp: Opponent) => {
      const client = presenceRef.current;
      const isRealPlayer = opp.id.startsWith('lite-');
      if (client && isRealPlayer) {
        pendingInviteOppRef.current = opp;
        setOutgoingInvite({ status: 'waiting', oppName: opp.name });
        client.invite(opp.id, wagerUSD, amountUSD);
      } else {
        startBotMatch(opp);
      }
    },
    [wagerUSD, amountUSD, startBotMatch],
  );

  const handlePresence = useCallback(
    (ev: PresenceEvent) => {
      switch (ev.type) {
        case 'invited':
          setIncomingInvite({ inviteId: ev.inviteId, from: ev.from, wager: ev.wager });
          break;
        case 'invite_declined':
          setOutgoingInvite(prev => (prev ? { ...prev, status: 'declined' } : prev));
          break;
        case 'invite_expired':
          setOutgoingInvite(prev => (prev ? { ...prev, status: 'timeout' } : prev));
          break;
        case 'invite_failed': {
          setOutgoingInvite(null);
          const opp = pendingInviteOppRef.current;
          if (opp) startBotMatch(opp); // they're offline → play a bot instead
          break;
        }
        case 'matched': {
          setIncomingInvite(null);
          setOutgoingInvite(null);
          const offset = typeof ev.serverNow === 'number' ? ev.serverNow - Date.now() : 0;
          beginP2PMatch(
            { matchId: ev.matchId, role: ev.role, liveStartAt: ev.liveStartAt, clockOffsetMs: offset, opponent: ev.opponent },
            getMatchTransport().openRoom(ev.matchId),
          );
          break;
        }
        default:
          break;
      }
    },
    [beginP2PMatch, startBotMatch],
  );

  // Maintain a presence connection (production / relay only) so others can
  // invite this player and vice-versa.
  useEffect(() => {
    if (!profile || !PresenceClient.available()) return;
    const base = getRelayBase();
    if (!base) return;
    const client = new PresenceClient(base, { id: profile.id, name: profile.name, avatar: profile.avatar });
    presenceRef.current = client;
    const off = client.on(handlePresence);
    return () => { off(); client.close(); presenceRef.current = null; };
    // Reconnect only when identity changes (name/avatar refresh via updateCard).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, handlePresence]);

  // Keep presence card fresh on profile edits.
  useEffect(() => {
    if (profile && presenceRef.current) {
      presenceRef.current.updateCard({ id: profile.id, name: profile.name, avatar: profile.avatar });
    }
  }, [profile?.name, profile?.avatar]);

  const acceptInvite = useCallback(() => {
    const inv = incomingInvite;
    if (inv && presenceRef.current) presenceRef.current.accept(inv.inviteId, amountUSD);
    setIncomingInvite(null);
  }, [incomingInvite, amountUSD]);

  const declineInvite = useCallback(() => {
    const inv = incomingInvite;
    if (inv && presenceRef.current) presenceRef.current.decline(inv.inviteId);
    setIncomingInvite(null);
  }, [incomingInvite]);

  const cancelOutgoingInvite = useCallback(() => setOutgoingInvite(null), []);

  const enterMatch = useCallback(() => setScreen('match'), []);

  /** Online P2P quick match — the matchmaking screen drives the transport. */
  const quickMatch = useCallback(() => {
    setMatchmakeMode('p2p');
    setOpponent(null);
    setPeer(null);
    setMatchState(null);
    setScreen('matchmaking');
  }, []);

  /** No human found in time — fall back to a bot so the queue never feels dead. */
  const beginBotFallback = useCallback(() => {
    const opp = drawOpponents(1)[0] ?? null;
    setMatchmakeMode('bot');
    setOpponent(opp);
    setPeer(null);
    setMatchState(buildMatch('pvp', opp));
    setScreen('match');
  }, [buildMatch]);

  const startSolo = useCallback(() => {
    setOpponent(null);
    setMatchState(buildMatch('solo', null));
    setScreen('match');
  }, [buildMatch]);

  const setMatch = useCallback((m: MatchState) => setMatchState(m), []);

  const commitResult = useCallback(
    (result: MatchResult) => {
      setBalance(liteWallet.applyMatchResult(result.youNetUSD));
      setProfile(prev => {
        if (!prev) return prev;
        const outcome =
          result.outcome === 'you' ? 'win' : result.outcome === 'opp' ? 'loss' : 'push';
        return recordOutcome(prev, outcome);
      });
      closePeer();
      setScreen('result');
    },
    [closePeer],
  );

  const rematch = useCallback(() => {
    setMatchState(buildMatch(opponent ? 'pvp' : 'solo', opponent));
    setScreen('match');
  }, [buildMatch, opponent]);

  const value = useMemo<LiteSessionValue>(
    () => ({
      screen,
      profile,
      balance,
      wagerUSD,
      amountUSD,
      deck,
      opponent,
      match,
      peer,
      matchmakeMode,
      incomingInvite,
      outgoingInvite,
      acceptInvite,
      declineInvite,
      cancelOutgoingInvite,
      start,
      signUp,
      completeOnboarding,
      updateProfile,
      resetBalance,
      signOut,
      setWager,
      setAmount,
      deposit,
      goLobby,
      openSwipe,
      challenge,
      enterMatch,
      quickMatch,
      beginP2PMatch,
      beginBotFallback,
      startSolo,
      setMatch,
      commitResult,
      rematch,
    }),
    [
      screen, profile, balance, wagerUSD, amountUSD, deck, opponent, match,
      peer, matchmakeMode, incomingInvite, outgoingInvite,
      acceptInvite, declineInvite, cancelOutgoingInvite,
      start, signUp, completeOnboarding, updateProfile, resetBalance, signOut,
      setWager, setAmount, deposit, goLobby, openSwipe,
      challenge, enterMatch, quickMatch, beginP2PMatch, beginBotFallback,
      startSolo, setMatch, commitResult, rematch,
    ],
  );

  return (
    <LiteSessionContext.Provider value={value}>{children}</LiteSessionContext.Provider>
  );
};
