import React, { createContext, useContext, ReactNode } from 'react';
import { useUnifiedAuth } from '../hooks/useUnifiedAuth';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  user: any;
  principal: any;
  authMethod: any;
  signInWithICP: () => Promise<any>;
  signInWithTwitter: () => Promise<any>;
  signInWithGoogle: (credentialResponse: any) => Promise<any>;
  logout: () => Promise<void>;
  walletGenerating: boolean;
  walletReady: boolean;
  completeWalletGeneration: (success: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const authData = useUnifiedAuth();

  return (
    <AuthContext.Provider value={authData}>
      {children}
    </AuthContext.Provider>
  );
};
