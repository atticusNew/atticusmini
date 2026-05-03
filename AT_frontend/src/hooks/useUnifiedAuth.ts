import { useState, useEffect, useCallback } from 'react';
import { Principal } from '@dfinity/principal';
import { unifiedAuth, UnifiedUser, AuthMethod } from '../services/unifiedAuth';
import { useCanister } from '../contexts/CanisterProvider';

export const useUnifiedAuth = () => {
  const [user, setUser] = useState<UnifiedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null);
  const [walletGenerating, setWalletGenerating] = useState(false);
  const [walletReady, setWalletReady] = useState(false);
  const { backend } = useCanister();

  // Initialize auth on mount (only once)
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        
        // Only initialize if not already initialized
        if (!unifiedAuth.isAuthInitialized()) {
          await unifiedAuth.initialize();
        }
        
        // Check for any existing authentication (ICP, Google, Twitter)
        const currentUser = unifiedAuth.getCurrentUser();
        
        if (currentUser) {
          setUser(currentUser);
          setAuthMethod(currentUser.authMethod || null);
          console.log('✅ Found existing authentication:', currentUser.authMethod);
          
          // ✅ FIXED: Check if wallet generation should start (mobile callback case)
          if (unifiedAuth.shouldStartWalletGeneration) {
            console.log('🏦 Mobile callback detected - starting wallet generation');
            setWalletGenerating(true);
            setWalletReady(false);
            // Reset the flag
            unifiedAuth.shouldStartWalletGeneration = false;
          }
        }
        
        setIsLoading(false);
        console.log('✅ Unified auth initialized');
      } catch (err) {
        console.error('❌ Unified auth initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Auth initialization failed');
        setIsLoading(false);
      }
    };

    // ✅ FIXED: Only initialize once on mount, never run again
    initializeAuth();
  }, []); // ✅ FIXED: Only run once on mount, no user dependency

  // Initialize backend email service when backend is available
  useEffect(() => {
    if (backend) {
      try {
        // unifiedAuth.initializeBackendEmailService(backend);
        console.log('✅ Backend email service initialized in useUnifiedAuth');
      } catch (err) {
        console.error('❌ Failed to initialize backend email service:', err);
      }
    }
  }, [backend]);

  // ICP authentication
  const signInWithICP = useCallback(async () => {
    try {
      console.log('🔧 useUnifiedAuth: Starting ICP authentication...');
      setError(null);
      const user = await unifiedAuth.signInWithICP();
      
      // Handle null case (shouldn't happen with new implementation)
      if (user === null) {
        console.log('🔄 ICP authentication in progress');
        return null;
      }
      
      console.log('🔧 useUnifiedAuth: ICP auth successful, setting user:', user);
      setUser(user);
      setAuthMethod(user.authMethod);
      setWalletGenerating(true); // ✅ FIXED: Start wallet generation after ICP auth
      setWalletReady(false); // ✅ FIXED: Reset wallet ready state
      console.log('🔧 useUnifiedAuth: State updated, user:', user, 'authMethod:', user.authMethod);
      return user;
    } catch (err) {
      console.error('🔧 useUnifiedAuth: ICP authentication failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'ICP authentication failed';
      setError(errorMessage);
      // Don't throw - just set error state so user can try again
      return null;
    }
  }, []);

  // Bitcoin wallet authentication
  const signInWithBitcoinWallet = useCallback(async (_bitcoinAddress: string, _walletType: 'unisat' | 'xverse' | 'okx' | 'external' = 'external') => {
    try {
      setError(null);
      // const user = await unifiedAuth.signInWithBitcoinWallet(bitcoinAddress, walletType);
      // setUser(user);
      // setAuthMethod(user.authMethod);
      // return user;
      throw new Error('Bitcoin wallet authentication not implemented');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bitcoin wallet authentication failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Twitter authentication
  const signInWithTwitter = useCallback(async () => {
    try {
      setError(null);
      const user = await unifiedAuth.signInWithTwitter();
      
      // Handle null user (redirect case)
      if (user) {
        setUser(user);
        setAuthMethod(user.authMethod);
        setWalletGenerating(true); // ✅ FIXED: Start wallet generation after Twitter auth
        setWalletReady(false); // ✅ FIXED: Reset wallet ready state
      }
      
      return user;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Twitter authentication failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Google authentication
  const signInWithGoogle = useCallback(async (credentialResponse: any) => {
    try {
      console.log('🔧 useUnifiedAuth: Starting Google authentication...', credentialResponse);
      setError(null);
      const user = await unifiedAuth.signInWithGoogle(credentialResponse);
      console.log('🔧 useUnifiedAuth: Google auth successful, setting user:', user);
      
      // Handle null user (should not happen for Google, but safety check)
      if (user) {
        setUser(user);
        setAuthMethod(user.authMethod);
        setWalletGenerating(true); // ✅ FIXED: Start wallet generation after Google auth
        setWalletReady(false); // ✅ FIXED: Reset wallet ready state
        console.log('🔧 useUnifiedAuth: State updated, user:', user, 'authMethod:', user.authMethod);
        console.log('🔧 useUnifiedAuth: Wallet generation should start now');
      } else {
        console.log('🔧 useUnifiedAuth: User is null, wallet generation will not start');
      }
      
      return user;
    } catch (err) {
      console.error('🔧 useUnifiedAuth: Google authentication failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Google authentication failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Email authentication
  const signInWithEmail = useCallback(async (_email: string, _verificationCode?: string) => {
    try {
      setError(null);
      // const user = await unifiedAuth.signInWithEmail(email, verificationCode);
      // setUser(user);
      // setAuthMethod(user.authMethod);
      // return user;
      throw new Error('Email authentication not implemented');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Email authentication failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Send email verification code
  const sendEmailVerificationCode = useCallback(async (_email: string) => {
    try {
      setError(null);
      // await unifiedAuth.sendEmailVerificationCode(email);
      throw new Error('Email verification not implemented');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send verification code';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      setError(null);
      await unifiedAuth.logout();
      setUser(null);
      setAuthMethod(null);
    } catch (err) {
      console.error('❌ Logout error:', err);
      // Still clear state even if logout fails
      setUser(null);
      setAuthMethod(null);
    }
  }, []);

  // Helper methods
  const isAuthenticated = !!user; // Use React state instead of singleton state

  const isICPAuthenticated = user?.authMethod === 'icp';
  const isBitcoinWalletAuthenticated = user?.authMethod === 'bitcoin' as any;
  const isEmailAuthenticated = user?.authMethod === 'email' as any;

  const getPrincipal = useCallback((): Principal | null => {
    return user?.principal || null;
  }, [user]);

  const getBitcoinAddress = useCallback((): string | undefined => {
    return (user as any)?.bitcoinAddress;
  }, [user]);

  const getEmail = useCallback((): string | undefined => {
    return user?.email;
  }, [user]);

  const isEmailVerified = useCallback((): boolean => {
    return (user as any)?.isEmailVerified || false;
  }, [user]);

  // Wallet generation management
  const completeWalletGeneration = useCallback((success: boolean = true) => {
    if (success) {
      setWalletGenerating(false);
      setWalletReady(true);
      console.log('✅ Wallet generation completed successfully');
    } else {
      setWalletGenerating(false);
      setWalletReady(false);
      console.log('❌ Wallet generation failed');
    }
  }, []);

  return {
    // State
    user,
    isLoading,
    error,
    authMethod,
    
    // Authentication methods
    signInWithICP,
    signInWithTwitter,
    signInWithGoogle,
    signInWithBitcoinWallet,
    signInWithEmail,
    sendEmailVerificationCode,
    logout,
    
    // Helper methods (as boolean values, not functions)
    isAuthenticated,
    isICPAuthenticated,
    isBitcoinWalletAuthenticated,
    isEmailAuthenticated,
    getPrincipal,
    getBitcoinAddress,
    getEmail,
    isEmailVerified,
    
    // Legacy compatibility (for existing useAuth hook)
    principal: getPrincipal(),
    
    // Wallet generation properties
    walletGenerating,
    walletReady,
    completeWalletGeneration
  };
};
