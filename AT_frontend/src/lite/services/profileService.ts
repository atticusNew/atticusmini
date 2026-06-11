/**
 * profileService — persists the trader's Lite profile.
 *
 * Demo/dev backing is localStorage; the interface is intentionally narrow so
 * a partner-exchange / backend implementation can swap in without touching
 * call sites. KYC/AML onboarding (deck step 1a) is owned by the partner and
 * is out of scope here — we only store the social profile (pic, name, bio).
 */

import type { LiteProfile, ProfileStats, RegistrationMethod } from '../types';

const STORAGE_KEY = 'atticus.lite.profile.v1';

const emptyStats = (): ProfileStats => ({ streak: 0, wins: 0, losses: 0 });

const isBrowser = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export interface CreateProfileInput {
  name: string;
  bio: string;
  avatar: string;
  registrationMethod: RegistrationMethod;
}

export const loadProfile = (): LiteProfile | null => {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LiteProfile;
    if (!parsed?.id || !parsed?.name) return null;
    return { ...parsed, stats: { ...emptyStats(), ...parsed.stats } };
  } catch {
    return null;
  }
};

export const saveProfile = (profile: LiteProfile): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    /* storage full / disabled — non-fatal for the demo */
  }
};

export const createProfile = (input: CreateProfileInput): LiteProfile => {
  const profile: LiteProfile = {
    id: `lite-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    name: input.name.trim().slice(0, 24) || 'Trader',
    bio: input.bio.trim().slice(0, 120),
    avatar: input.avatar,
    registrationMethod: input.registrationMethod,
    createdAt: Date.now(),
    stats: emptyStats(),
  };
  saveProfile(profile);
  return profile;
};

/** Apply a finished duel to the trader's social stats (win streak etc.). */
export const recordOutcome = (
  profile: LiteProfile,
  outcome: 'win' | 'loss' | 'push',
): LiteProfile => {
  const stats = { ...profile.stats };
  if (outcome === 'win') {
    stats.wins += 1;
    stats.streak = Math.max(1, stats.streak + 1);
  } else if (outcome === 'loss') {
    stats.losses += 1;
    stats.streak = Math.min(-1, stats.streak - 1);
  }
  const next = { ...profile, stats };
  saveProfile(next);
  return next;
};

export const clearProfile = (): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

export const winRate = (stats: ProfileStats): number => {
  const total = stats.wins + stats.losses;
  return total === 0 ? 0 : stats.wins / total;
};
