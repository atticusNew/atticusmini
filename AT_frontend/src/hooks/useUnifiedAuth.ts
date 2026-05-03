import { useState, useCallback, useEffect } from 'react';
import { mockPartnerExchange } from '../services/MockPartnerExchange';

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
  authMethod: 'demo';
  displayName?: string;
}

const DEMO_USER: UnifiedUser = {
  principal: 'demo-user',
  authMethod: 'demo',
  displayName: 'Demo Trader',
};

export const useUnifiedAuth = () => {
  const [user, setUser] = useState<UnifiedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    mockPartnerExchange.ensureUser(DEMO_USER.principal).finally(() => {
      setUser(DEMO_USER);
      setIsLoading(false);
    });
  }, []);

  const signIn = useCallback(async () => {
    await mockPartnerExchange.ensureUser(DEMO_USER.principal);
    setUser(DEMO_USER);
    return DEMO_USER;
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
