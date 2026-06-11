import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
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

  start: () => void;
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

  const start = useCallback(() => {
    setScreen(loadProfile() ? 'lobby' : 'onboarding');
  }, []);

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

  const goLobby = useCallback(() => {
    setOpponent(null);
    setMatchState(null);
    setScreen('lobby');
  }, []);

  const openSwipe = useCallback(() => {
    setDeck(drawOpponents());
    setScreen('swipe');
  }, []);

  const buildMatch = useCallback(
    (mode: 'pvp' | 'solo', opp: Opponent | null): MatchState =>
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

  const challenge = useCallback(
    (opp: Opponent) => {
      setOpponent(opp);
      setMatchState(buildMatch('pvp', opp));
      setScreen('matchmaking');
    },
    [buildMatch],
  );

  const enterMatch = useCallback(() => setScreen('match'), []);

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
      setScreen('result');
    },
    [],
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
      start,
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
      startSolo,
      setMatch,
      commitResult,
      rematch,
    }),
    [
      screen, profile, balance, wagerUSD, amountUSD, deck, opponent, match,
      start, completeOnboarding, updateProfile, resetBalance, signOut,
      setWager, setAmount, deposit, goLobby, openSwipe,
      challenge, enterMatch, startSolo, setMatch, commitResult, rematch,
    ],
  );

  return (
    <LiteSessionContext.Provider value={value}>{children}</LiteSessionContext.Provider>
  );
};
