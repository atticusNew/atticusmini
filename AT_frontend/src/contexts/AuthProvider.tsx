import React, { createContext, useContext, ReactNode } from 'react';
import { useUnifiedAuth, UnifiedUser } from '../hooks/useUnifiedAuth';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  user: UnifiedUser | null;
  principal: string | null;
  authMethod: 'demo' | null;
  signInWithICP: () => Promise<UnifiedUser | null>;
  signInWithTwitter: () => Promise<UnifiedUser | null>;
  signInWithGoogle: (credentialResponse?: any) => Promise<UnifiedUser | null>;
  logout: () => Promise<void>;
  walletGenerating: boolean;
  walletReady: boolean;
  completeWalletGeneration: (success: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useUnifiedAuth();
  return <AuthContext.Provider value={auth as unknown as AuthContextType}>{children}</AuthContext.Provider>;
};
