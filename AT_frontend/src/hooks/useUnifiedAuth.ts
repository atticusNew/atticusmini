import { useState, useCallback, useEffect } from 'react';
import { getPartnerExchange } from '../services/partner';

/**
 * useUnifiedAuth — temporary stub.
 *
 * The white-label partner exchange will own KYC + auth. Until that integration
 * lands, this hook returns a single demo user so the rest of the app boots.
 *
 * PR #3 will replace this with a thin session-token reader that takes the
 * partner's signed JWT and exposes (userId, displayName) only.
 */

export interface UnifiedUser {
  principal: string;
  authMethod: 'partner';
  displayName?: string;
  countryCode?: string;
  isLive: boolean;
}

export const useUnifiedAuth = () => {
  const [user, setUser] = useState<UnifiedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPartnerExchange()
      .getSession()
      .then(session => {
        if (cancelled || !session) return;
        setUser({
          principal: session.partnerUserId,
          authMethod: 'partner',
          displayName: session.displayName,
          countryCode: session.countryCode,
          isLive: session.isLive,
        });
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const signIn = useCallback(async () => {
    const session = await getPartnerExchange().getSession();
    if (!session) return null;
    const next: UnifiedUser = {
      principal: session.partnerUserId,
      authMethod: 'partner',
      displayName: session.displayName,
      countryCode: session.countryCode,
      isLive: session.isLive,
    };
    setUser(next);
    return next;
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
  }, []);

  return {
    user,
    isLoading,
    error,
    authMethod: user?.authMethod ?? null,
    isAuthenticated: !!user,
    principal: user?.principal ?? null,
    signInWithICP: signIn,
    signInWithTwitter: signIn,
    signInWithGoogle: async (_credentialResponse?: any) => signIn(),
    signInWithBitcoinWallet: async (_addr: string, _walletType?: string) => signIn(),
    signInWithEmail: async (_email: string, _code?: string) => signIn(),
    sendEmailVerificationCode: async (_email: string) => undefined,
    logout,
    walletGenerating: false,
    walletReady: true,
    completeWalletGeneration: (_success: boolean) => {},
  };
};
