import { Principal } from '@dfinity/principal';
import { GoogleCredentialResponse } from '@react-oauth/google';

export interface GoogleUser {
  principal: Principal; // ICP Principal required for backend compatibility
  googleId: string;
  email: string;
  name?: string;
  picture?: string;
  isAuthenticated: boolean;
}

export class GoogleAuth {
  private user: GoogleUser | null = null;

  /**
   * Sign in with Google OAuth using real Google API
   */
  async signInWithGoogle(credentialResponse: GoogleCredentialResponse): Promise<GoogleUser> {
    try {
      console.log('🔍 Starting real Google OAuth flow...');
      console.log('🔧 Google OAuth credential response:', credentialResponse);
      console.log('🔧 CredentialResponse type:', typeof credentialResponse);
      console.log('🔧 CredentialResponse keys:', Object.keys(credentialResponse || {}));
      
      if (!credentialResponse || !credentialResponse.credential) {
        console.error('❌ No credential received from Google');
        console.error('❌ CredentialResponse:', credentialResponse);
        throw new Error('No credential received from Google');
      }

      console.log('🔧 Credential length:', credentialResponse.credential.length);
      console.log('🔧 Credential preview:', credentialResponse.credential.substring(0, 50) + '...');

      // Decode the JWT token to get user info
      console.log('🔧 Decoding JWT token...');
      const userInfo = this.decodeJWT(credentialResponse.credential);
      console.log('🔧 Decoded user info:', userInfo);
      
      if (!userInfo.sub || !userInfo.email) {
        console.error('❌ Invalid Google credential data:', userInfo);
        throw new Error('Invalid Google credential data');
      }

      // Generate deterministic Principal from Google ID and email
      console.log('🔧 GoogleAuth: Generating Principal from:', { googleId: userInfo.sub, email: userInfo.email });
      const principal = this.generatePrincipalFromGoogleData(userInfo.sub, userInfo.email);
      console.log('🔧 GoogleAuth: Generated Principal:', principal.toString());

      this.user = {
        principal,
        googleId: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name || undefined,
        picture: userInfo.picture || undefined,
        isAuthenticated: true
      };

      console.log('✅ Real Google authentication successful:', {
        principal: principal.toString(),
        googleId: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name
      });

      return this.user;
    } catch (error) {
      console.error('❌ Google authentication failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        credentialResponse: credentialResponse
      });
      
      // Provide more specific error messages
      if (error.message.includes('Invalid JWT token')) {
        throw new Error('Google OAuth token is invalid or expired. Please try again.');
      } else if (error.message.includes('No credential received')) {
        throw new Error('Google OAuth was cancelled or failed. Please try again.');
      } else {
        throw new Error(`Google authentication failed: ${error.message}`);
      }
    }
  }

  /**
   * Decode JWT token to extract user information
   */
  private decodeJWT(token: string): any {
    try {
      console.log('🔧 Decoding JWT token, length:', token.length);
      
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('❌ Invalid JWT token format, parts:', parts.length);
        throw new Error('Invalid JWT token format');
      }
      
      const base64Url = parts[1];
      if (!base64Url) {
        console.error('❌ Missing JWT payload');
        throw new Error('Invalid JWT token format');
      }
      
      console.log('🔧 JWT payload (base64url):', base64Url.substring(0, 50) + '...');
      
      // Add padding if needed
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const paddedBase64 = base64 + '='.repeat((4 - base64.length % 4) % 4);
      
      console.log('🔧 Padded base64:', paddedBase64.substring(0, 50) + '...');
      
      const jsonPayload = atob(paddedBase64);
      console.log('🔧 Decoded payload:', jsonPayload);
      
      const userInfo = JSON.parse(jsonPayload);
      console.log('🔧 Parsed user info:', userInfo);
      
      return userInfo;
    } catch (error) {
      console.error('❌ Failed to decode JWT token:', error);
      console.error('❌ Token parts:', token.split('.').map((part, i) => `${i}: ${part.substring(0, 20)}...`));
      throw new Error('Invalid JWT token');
    }
  }

  /**
   * Generate a valid ICP Principal from Google OAuth data
   * Backend requires Principal for wallet creation and user management
   */
  private generatePrincipalFromGoogleData(googleId: string, email: string): Principal {
    try {
      console.log('🔧 Generating Principal from Google data:', { googleId, email });
      
      // Create a deterministic seed from Google ID and email
      const seed = `google:${googleId}:${email}:icp-derivation-mainnet`;
      console.log('🔧 Seed string:', seed);
      
      const seedHash = this.hashString(seed);
      console.log('🔧 Seed hash:', seedHash);
      
      // Convert hash to a shorter byte array (8 bytes for shorter Principal)
      const seedBytes = new Uint8Array(8);
      for (let i = 0; i < 8; i++) {
        seedBytes[i] = (seedHash >> (i * 8)) & 0xFF;
      }
      
      console.log('🔧 Seed bytes:', Array.from(seedBytes));
      
      // Generate Principal from shorter bytes - this should create a valid, shorter Principal
      const principal = Principal.fromUint8Array(seedBytes);
      console.log('🔧 Generated Principal:', principal.toString());
      
      return principal;
    } catch (error) {
      console.error('❌ Failed to generate Principal from Google data:', error);
      // Fallback to a simple Principal
      return Principal.anonymous();
    }
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get current Google user
   */
  getCurrentUser(): GoogleUser | null {
    return this.user;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.user?.isAuthenticated || false;
  }

  /**
   * Logout Google user
   */
  logout(): void {
    this.user = null;
    console.log('🔌 Google user logged out');
  }
}

// Export singleton instance
export const googleAuth = new GoogleAuth();
