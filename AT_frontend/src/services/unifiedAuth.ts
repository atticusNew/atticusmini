import { Principal } from '@dfinity/principal';
import { AuthClient } from '@dfinity/auth-client';
import { twitterAuth } from './twitterAuth';
import { googleAuth } from './googleAuth';
import { GoogleCredentialResponse } from '@react-oauth/google';

export type AuthMethod = 'icp' | 'twitter' | 'google';

export interface UnifiedUser {
  principal: Principal;
  authMethod: AuthMethod;
  isAuthenticated: boolean;
  // Additional data based on auth method
  twitterId?: string;
  username?: string;
  googleId?: string;
  email?: string;
  name?: string;
  avatar?: string;
}

export class UnifiedAuth {
  private user: UnifiedUser | null = null;
  private authClient: AuthClient | null = null;
  private currentAuthMethod: AuthMethod | null = null;
  private isInitialized: boolean = false;
  public shouldStartWalletGeneration: boolean = false;

  /**
   * Initialize authentication client
   */
  async initialize(): Promise<void> {
    // Prevent multiple initializations
    if (this.isInitialized) {
      console.log('✅ Unified auth already initialized, skipping...');
      return;
    }

    try {
      // Configure auth client for off-chain frontend
      this.authClient = await AuthClient.create();
      
      // Check for mobile OAuth callbacks
      console.log('🔍 Checking for mobile OAuth callbacks...');
      
      // Check Twitter OAuth callback
      const mobileTwitterCallback = await twitterAuth.checkMobileCallback();
      if (mobileTwitterCallback) {
        console.log('📱 Mobile Twitter callback user found:', mobileTwitterCallback);
        this.user = {
          principal: mobileTwitterCallback.principal,
          authMethod: 'twitter',
          isAuthenticated: true,
          twitterId: mobileTwitterCallback.twitterId,
          username: mobileTwitterCallback.username,
          name: mobileTwitterCallback.name || '',
          avatar: mobileTwitterCallback.avatar || ''
        };
        this.currentAuthMethod = 'twitter';
        console.log('✅ Mobile Twitter OAuth callback processed, user set:', this.user);
        
        // ✅ FIXED: Set a flag to indicate wallet generation should start
        this.shouldStartWalletGeneration = true;
        console.log('🏦 Mobile Twitter callback - wallet generation should start');
      } else {
        console.log('🔍 No mobile Twitter OAuth callback found');
      }
      
      // Check Google OAuth callback (redirect, popup, and session storage)
      const mobileGoogleCallback = await this.checkGoogleCallback();
      const popupGoogleCallback = await this.checkGooglePopupCallback();
      const sessionGoogleCallback = await this.checkGoogleSessionCallback();
      
      if (mobileGoogleCallback) {
        console.log('📱 Mobile Google callback user found:', mobileGoogleCallback);
        this.user = mobileGoogleCallback;
        this.currentAuthMethod = 'google';
        console.log('✅ Mobile Google OAuth callback processed, user set:', this.user);
        
        // ✅ FIXED: Set a flag to indicate wallet generation should start
        this.shouldStartWalletGeneration = true;
        console.log('🏦 Mobile Google callback - wallet generation should start');
      } else if (popupGoogleCallback) {
        console.log('📱 Popup Google callback user found:', popupGoogleCallback);
        this.user = popupGoogleCallback;
        this.currentAuthMethod = 'google';
        console.log('✅ Popup Google OAuth callback processed, user set:', this.user);
        
        // ✅ FIXED: Set a flag to indicate wallet generation should start
        this.shouldStartWalletGeneration = true;
        console.log('🏦 Popup Google callback - wallet generation should start');
      } else if (sessionGoogleCallback) {
        console.log('📱 Session Google callback user found:', sessionGoogleCallback);
        this.user = sessionGoogleCallback;
        this.currentAuthMethod = 'google';
        console.log('✅ Session Google OAuth callback processed, user set:', this.user);
        
        // ✅ FIXED: Set a flag to indicate wallet generation should start
        this.shouldStartWalletGeneration = true;
        console.log('🏦 Session Google callback - wallet generation should start');
      } else {
        console.log('🔍 No Google OAuth callback found');
      }
      
      this.isInitialized = true;
      console.log('✅ Unified auth initialized');
    } catch (error) {
      console.error('❌ Failed to initialize unified auth:', error);
      throw error;
    }
  }

  /**
   * Sign in with ICP Identity (using redirect - no popups)
   */
  async signInWithICP(): Promise<UnifiedUser | null> {
    console.log('🔧 Starting ICP Identity authentication...');
    
    try {
      if (!this.authClient) {
        await this.initialize();
      }

      // Check if already authenticated (returning from Internet Identity)
      const isAuthenticated = await this.authClient!.isAuthenticated();
      console.log('🔍 Already authenticated?', isAuthenticated);
      
      if (isAuthenticated) {
        const identity = this.authClient!.getIdentity();
        const principal = identity.getPrincipal();
        
        console.log('🔍 Principal:', principal.toString());
        console.log('🔍 Is anonymous?', principal.isAnonymous());
        
        if (!principal.isAnonymous()) {
          // Real authenticated principal
          this.user = {
            principal,
            authMethod: 'icp',
            isAuthenticated: true
          };

          this.currentAuthMethod = 'icp';

          console.log('✅ ICP Identity authentication successful');
          return this.user;
        } else {
          // Clear anonymous session
          await this.authClient!.logout();
        }
      }
      
      // Start authentication - this will redirect to Internet Identity
      console.log('🔄 Redirecting to Internet Identity...');
      
      // Trigger login - this redirects the page
      this.authClient!.login({
        identityProvider: 'https://identity.ic0.app',
        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days
        onSuccess: () => {
          console.log('✅ ICP login success callback');
        }
      });
      
      // Return null since we're redirecting
      return null;
      
    } catch (error) {
      console.error('❌ ICP Identity authentication error:', error);
      throw error instanceof Error ? error : new Error('ICP Identity authentication failed');
    }
  }

  /**
   * Sign in with Twitter/X
   */
  async signInWithTwitter(): Promise<UnifiedUser> {
    try {
      const twitterUser = await twitterAuth.signInWithTwitter();

      this.user = {
        principal: twitterUser.principal,
        authMethod: 'twitter',
        isAuthenticated: true,
        twitterId: twitterUser.twitterId,
        username: twitterUser.username,
        ...(twitterUser.name && { name: twitterUser.name }),
        ...(twitterUser.email && { email: twitterUser.email }),
        ...(twitterUser.avatar && { avatar: twitterUser.avatar })
      };

      this.currentAuthMethod = 'twitter';

      console.log('✅ Twitter authentication successful:', {
        principal: twitterUser.principal.toString(),
        authMethod: 'twitter',
        twitterId: twitterUser.twitterId,
        username: twitterUser.username
      });

      return this.user!;
    } catch (error) {
      // Handle redirect case gracefully
      if (error.message && error.message.includes('Redirecting to Twitter OAuth')) {
        console.log('🔄 Twitter OAuth redirect initiated, user will be redirected back');
        // Don't throw error for redirect case, just return null
        // The callback will be handled by checkMobileCallback()
        return null as any;
      }
      
      console.error('❌ Twitter authentication failed:', error);
      throw error;
    }
  }



  /**
   * Check for Google OAuth callback from session storage (redirect callback)
   */
  async checkGoogleSessionCallback(): Promise<UnifiedUser | null> {
    const callbackData = sessionStorage.getItem('google_oauth_callback');
    if (!callbackData) {
      return null;
    }
    
    try {
      const { code, state } = JSON.parse(callbackData);
      
      // Verify state parameter
      const storedState = sessionStorage.getItem('google_oauth_state');
      if (state !== storedState) {
        console.error('❌ Invalid state parameter');
        return null;
      }
      
      console.log('📱 Google OAuth session callback received');
      
      // Exchange authorization code for access token
      const tokenResponse = await this.exchangeCodeForToken(code);
      
      if (tokenResponse) {
        // Create a mock credential response for compatibility
        const credentialResponse: GoogleCredentialResponse = {
          credential: tokenResponse.id_token
        };
        
        const googleUser = await googleAuth.signInWithGoogle(credentialResponse);
        
        const user: UnifiedUser = {
          principal: googleUser.principal,
          authMethod: 'google',
          isAuthenticated: true,
          googleId: googleUser.googleId,
          email: googleUser.email,
          ...(googleUser.name && { name: googleUser.name }),
          ...(googleUser.picture && { avatar: googleUser.picture })
        };
        
        console.log('✅ Google OAuth session callback processed successfully:', user);
        
        // Clean up session storage
        sessionStorage.removeItem('google_oauth_callback');
        sessionStorage.removeItem('google_oauth_state');
        
        return user;
      }
    } catch (error) {
      console.error('❌ Failed to process Google OAuth session callback:', error);
    }
    
    return null;
  }

  /**
   * Check for Google OAuth callback from popup
   */
  async checkGooglePopupCallback(): Promise<UnifiedUser | null> {
    const callbackData = sessionStorage.getItem('google_oauth_callback');
    if (!callbackData) {
      return null;
    }
    
    try {
      const { code, state } = JSON.parse(callbackData);
      
      // Verify state parameter
      const storedState = sessionStorage.getItem('google_oauth_state');
      if (state !== storedState) {
        console.error('❌ Invalid state parameter');
        return null;
      }
      
      console.log('📱 Google OAuth popup callback received');
      
      // Exchange authorization code for access token
      const tokenResponse = await this.exchangeCodeForToken(code);
      
      if (tokenResponse) {
        // Create a mock credential response for compatibility
        const credentialResponse: GoogleCredentialResponse = {
          credential: tokenResponse.id_token
        };
        
        const googleUser = await googleAuth.signInWithGoogle(credentialResponse);
        
        const user: UnifiedUser = {
          principal: googleUser.principal,
          authMethod: 'google',
          isAuthenticated: true,
          googleId: googleUser.googleId,
          email: googleUser.email,
          ...(googleUser.name && { name: googleUser.name }),
          ...(googleUser.picture && { avatar: googleUser.picture })
        };
        
        console.log('✅ Google OAuth popup callback processed successfully:', user);
        return user;
      }
    } catch (error) {
      console.error('❌ Failed to process Google OAuth popup callback:', error);
    }
    
    return null;
  }

  /**
   * Check for Google OAuth callback in URL parameters
   */
  async checkGoogleCallback(): Promise<UnifiedUser | null> {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    
    console.log('🔍 Checking for Google OAuth callback:', { code, state, error });
    
    if (error) {
      console.error('❌ Google OAuth error:', error);
      return null;
    }
    
    if (code && state) {
      try {
        // Verify state parameter
        const storedState = sessionStorage.getItem('google_oauth_state');
        if (state !== storedState) {
          console.error('❌ Invalid state parameter');
          return null;
        }
        
        console.log('📱 Google OAuth callback via authorization code');
        
        // Exchange authorization code for access token
        const tokenResponse = await this.exchangeCodeForToken(code);
        
        if (tokenResponse) {
          // Create a mock credential response for compatibility
          const credentialResponse: GoogleCredentialResponse = {
            credential: tokenResponse.id_token
          };
          
          const googleUser = await googleAuth.signInWithGoogle(credentialResponse);
          
          const user: UnifiedUser = {
            principal: googleUser.principal,
            authMethod: 'google',
            isAuthenticated: true,
            googleId: googleUser.googleId,
            email: googleUser.email,
            ...(googleUser.name && { name: googleUser.name }),
            ...(googleUser.picture && { avatar: googleUser.picture })
          };
          
          console.log('✅ Google OAuth callback processed successfully:', user);
          return user;
        }
      } catch (error) {
        console.error('❌ Failed to process Google OAuth callback:', error);
        return null;
      }
    }
    
    return null;
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForToken(code: string): Promise<any> {
    try {
      console.log('🔄 Exchanging authorization code for token...');
      
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const googleClientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
      const redirectUri = window.location.origin;
      
      console.log('🔧 Google OAuth Debug Info:', {
        hasClientId: !!googleClientId,
        hasClientSecret: !!googleClientSecret,
        clientId: googleClientId ? `${googleClientId.substring(0, 20)}...` : 'Not set',
        redirectUri,
        code: code.substring(0, 10) + '...'
      });
      
      if (!googleClientSecret) {
        throw new Error('Google Client Secret not configured');
      }
      
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Token exchange failed:', response.status, errorText);
        throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
      }
      
      const tokenData = await response.json();
      console.log('✅ Token exchange successful:', tokenData);
      
      return tokenData;
    } catch (error) {
      console.error('❌ Token exchange failed:', error);
      throw error;
    }
  }

  /**
   * Sign in with Google using real OAuth
   */
  async signInWithGoogle(credentialResponse: GoogleCredentialResponse): Promise<UnifiedUser> {
    try {
      // Check if this is a mock Google OAuth
      if (credentialResponse.credential && credentialResponse.credential.startsWith('mock_google_token_')) {
        console.log('🔍 Processing mock Google OAuth');
        
        // Create a mock Google user
        const mockGoogleUser = {
          principal: 'mock_principal_' + Date.now(),
          googleId: 'mock_google_id_' + Date.now(),
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://via.placeholder.com/150'
        };
        
        this.user = {
          principal: mockGoogleUser.principal,
          authMethod: 'google',
          isAuthenticated: true,
          googleId: mockGoogleUser.googleId,
          email: mockGoogleUser.email,
          name: mockGoogleUser.name,
          avatar: mockGoogleUser.picture
        };

        this.currentAuthMethod = 'google';
        
        console.log('✅ Mock Google authentication successful:', {
          principal: mockGoogleUser.principal,
          authMethod: 'google',
          googleId: mockGoogleUser.googleId,
          email: mockGoogleUser.email
        });

        return this.user!;
      }
      
      // Check if this is a popup callback
      if (credentialResponse.credential && credentialResponse.credential.startsWith('popup_callback_')) {
        console.log('🔍 Processing popup callback for Google OAuth');
        
        // Get the callback data from sessionStorage
        const callbackData = sessionStorage.getItem('google_oauth_callback');
        if (!callbackData) {
          throw new Error('No popup callback data found');
        }
        
        const { code, state } = JSON.parse(callbackData);
        
        // Verify state parameter
        const storedState = sessionStorage.getItem('google_oauth_state');
        if (state !== storedState) {
          throw new Error('Invalid state parameter');
        }
        
        // Exchange authorization code for access token
        const tokenResponse = await this.exchangeCodeForToken(code);
        
        if (!tokenResponse) {
          throw new Error('Failed to exchange code for token');
        }
        
        // Create a proper credential response for googleAuth
        const properCredentialResponse: GoogleCredentialResponse = {
          credential: tokenResponse.id_token
        };
        
        const googleUser = await googleAuth.signInWithGoogle(properCredentialResponse);
        
        this.user = {
          principal: googleUser.principal,
          authMethod: 'google',
          isAuthenticated: true,
          googleId: googleUser.googleId,
          email: googleUser.email,
          ...(googleUser.name && { name: googleUser.name }),
          ...(googleUser.picture && { avatar: googleUser.picture })
        };

        this.currentAuthMethod = 'google';
        
        // Clean up session storage
        sessionStorage.removeItem('google_oauth_callback');
        sessionStorage.removeItem('google_oauth_state');
        
        console.log('✅ Google popup authentication successful:', {
          principal: googleUser.principal.toString(),
          authMethod: 'google',
          googleId: googleUser.googleId,
          email: googleUser.email
        });

        return this.user!;
      }
      
      // Regular credential-based authentication
      const googleUser = await googleAuth.signInWithGoogle(credentialResponse);

      this.user = {
        principal: googleUser.principal,
        authMethod: 'google',
        isAuthenticated: true,
        googleId: googleUser.googleId,
        email: googleUser.email,
        ...(googleUser.name && { name: googleUser.name }),
        ...(googleUser.picture && { avatar: googleUser.picture })
      };

      this.currentAuthMethod = 'google';

      console.log('✅ Google authentication successful:', {
        principal: googleUser.principal.toString(),
        authMethod: 'google',
        googleId: googleUser.googleId,
        email: googleUser.email
      });

      return this.user!;
    } catch (error) {
      console.error('❌ Google authentication failed:', error);
      throw error;
    }
  }


  /**
   * Get current user
   */
  getCurrentUser(): UnifiedUser | null {
    return this.user;
  }

  /**
   * Check if auth is initialized
   */
  isAuthInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.user?.isAuthenticated || false;
  }

  /**
   * Get current authentication method
   */
  getCurrentAuthMethod(): AuthMethod | null {
    return this.currentAuthMethod;
  }

  /**
   * Check if authenticated with ICP
   */
  isICPAuthenticated(): boolean {
    return this.currentAuthMethod === 'icp' && this.isAuthenticated();
  }

  /**
   * Check if authenticated with Twitter
   */
  isTwitterAuthenticated(): boolean {
    return this.currentAuthMethod === 'twitter' && this.isAuthenticated();
  }

  /**
   * Check if authenticated with Google
   */
  isGoogleAuthenticated(): boolean {
    return this.currentAuthMethod === 'google' && this.isAuthenticated();
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      // Logout from current auth method
      switch (this.currentAuthMethod) {
        case 'icp':
          if (this.authClient) {
            await this.authClient.logout();
          }
          break;
        case 'twitter':
          twitterAuth.logout();
          break;
        case 'google':
          googleAuth.logout();
          break;
      }

      // Clear user state
      this.user = null;
      this.currentAuthMethod = null;

      console.log('🔌 User logged out from all authentication methods');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Still clear state even if logout fails
      this.user = null;
      this.currentAuthMethod = null;
    }
  }

  /**
   * Check if already authenticated with ICP
   */
  async checkExistingICPAuth(): Promise<boolean> {
    if (!this.authClient) {
      return false;
    }

    try {
      const authenticated = await this.authClient.isAuthenticated();
      if (authenticated) {
        const identity = this.authClient.getIdentity();
        const principal = identity.getPrincipal();

        this.user = {
          principal,
          authMethod: 'icp',
          isAuthenticated: true
        };

        this.currentAuthMethod = 'icp';

        console.log('✅ Found existing ICP authentication:', {
          principal: principal.toString(),
          authMethod: 'icp'
        });

        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error checking ICP authentication:', error);
      return false;
    }
  }
}

// Export singleton instance
export const unifiedAuth = new UnifiedAuth();
