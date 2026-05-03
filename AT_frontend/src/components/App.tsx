import React, { useState, useEffect } from 'react';
import { createGlobalStyle } from 'styled-components';
import styled from 'styled-components';
import { LandingPage } from './LandingPage';
import { TradingPanel } from './TradingPanel';
import { AdminPanel } from './AdminPanel';
import { useAuth, AuthProvider } from '../contexts/AuthProvider';
import { TradeProvider } from '../contexts/TradeContext';
import { CanisterProvider } from '../contexts/CanisterProvider';
import { BalanceProvider } from '../contexts/BalanceProvider';
// ✅ REMOVED: WebSocketProvider - now using global price feed manager
import { ToastProvider } from './ToastProvider';

const GlobalStyle = createGlobalStyle`
  :root {
    --bg-primary: #0f1419;
    --bg-panel: #1a2332;
    --accent: #f4d03f;
    --green: #00d4aa;
    --red: #ff4757;
    --text: #ffffff;
    --text-dim: #8b95a1;
    --border: #2a3441;
    --shadow: rgba(0, 0, 0, 0.3);
    --bg-button: #2a3441;
    --bg-button-hover: #3a4451;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', sans-serif;
    background: var(--bg-primary);
    color: var(--text);
    overflow-x: hidden;
    overflow-y: auto;
  }

  #root {
    min-height: 100vh;
    width: 100vw;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: var(--bg-primary);
  padding: 2rem;
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid transparent;
  border-top: 3px solid var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  color: var(--text-dim);
  font-size: 1rem;
  text-align: center;
  margin-bottom: 1rem;
`;

const LiquidityBadge = styled.div`
  background: rgba(0, 212, 170, 0.1);
  border: 1px solid var(--green);
  color: var(--green);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  text-align: center;
  margin-top: 1rem;
  &::before {
    content: '🌊 ';
    margin-right: 0.5rem;
  }
`;

const AppContent: React.FC = () => {
  const { 
    isAuthenticated, 
    isLoading, 
    user,
    principal,
    signInWithICP,
    signInWithTwitter,
    signInWithGoogle,
    logout
  } = useAuth();

  // ✅ EMAIL SERVICE NOW HANDLED BY BACKEND - NO FRONTEND INITIALIZATION NEEDED
  React.useEffect(() => {
    console.log('🚀 Email service will be handled by backend canister');
  }, []);

  // Handle Google OAuth callback from redirect (authorization code flow)
  React.useEffect(() => {
    const handleGoogleCallback = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');
      
      if (error) {
        console.error('❌ Google OAuth error:', error);
        return;
      }
      
      if (code && state) {
        console.log('🔍 Google OAuth authorization code callback received:', { code, state });
        
        // Store callback data for processing
        const callbackData = {
          code,
          state,
          timestamp: Date.now()
        };
        sessionStorage.setItem('google_oauth_callback', JSON.stringify(callbackData));
        
        // Clean up the URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // The unifiedAuth.initialize() will pick this up and process it
        console.log('✅ Google OAuth callback stored, will be processed on next page load');
      }
    };
    
    handleGoogleCallback();
  }, []);
  
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isAdminRoute, setIsAdminRoute] = useState(false);

  // Check if we're on the admin route
  useEffect(() => {
    const path = window.location.pathname;
    const isAdmin = path.includes('admin.html') || path.includes('admin');
    setIsAdminRoute(isAdmin);
    console.log('🔍 Route detection:', { path, isAdmin });
  }, []);

  const handleGetStarted = async () => {
    try {
      await signInWithICP();
      setIsDemoMode(false); // Exit demo when connecting
    } catch (err) {
      console.error('ICP login failed:', err);
    }
  };

  const handleTryDemo = () => {
    setIsDemoMode(true);
  };

  const handleTwitterSignIn = async () => {
    try {
      await signInWithTwitter();
      setIsDemoMode(false);
    } catch (err) {
      console.error('Twitter login failed:', err);
    }
  };

  const handleGoogleSignIn = async (credentialResponse: any) => {
    try {
      console.log('🔧 App: handleGoogleSignIn called with:', credentialResponse);
      await signInWithGoogle(credentialResponse);
      console.log('🔧 App: signInWithGoogle completed successfully');
      
      // Wait for React state to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('🔧 App: Current auth state after Google login (after delay):', { isAuthenticated, user, principal });
      setIsDemoMode(false);
    } catch (err) {
      console.error('🔧 App: Google login failed:', err);
    }
  };




  // ✅ STREAMLINED FLOW: Only 4 states needed
  
  // 0. Admin route - handle first
  if (isAdminRoute) {
    // Check for admin access code in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const adminCode = urlParams.get('code');
    const validAdminCode = '040617081822010316';
    
    // If no code or wrong code, show access denied
    if (!adminCode || adminCode !== validAdminCode) {
      return (
        <>
          <GlobalStyle />
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: '#0f1419',
            color: '#ffffff',
            fontFamily: 'Inter, sans-serif',
            textAlign: 'center',
            padding: '2rem'
          }}>
            <h1 style={{ color: '#ff4444', fontSize: '2rem', marginBottom: '1rem' }}>🔒 Access Denied</h1>
            <p style={{ color: '#cccccc', fontSize: '1.1rem', marginBottom: '2rem', maxWidth: '600px', lineHeight: '1.6' }}>
              This admin panel requires proper authorization. 
              Please contact the system administrator for access credentials.
            </p>
            <p style={{ fontSize: '0.9rem', color: '#888' }}>
              Unauthorized access attempts are logged and monitored.
            </p>
          </div>
        </>
      );
    }
    
    // Valid code - show admin panel
    return (
      <>
        <GlobalStyle />
        <AdminPanel />
      </>
    );
  }
  
  // 1. Initial loading
  if (isLoading) {
    return (
      <>
        <GlobalStyle />
        <LoadingContainer>
          <LoadingSpinner />
          <LoadingText>Connecting to Bitcoin Options Platform...</LoadingText>
          <LiquidityBadge>Liquidity Pool Model</LiquidityBadge>
        </LoadingContainer>
      </>
    );
  }

  // 2. Landing page for unauthenticated users (not in demo mode)
  if (!isAuthenticated && !isDemoMode) {
    return (
      <>
        <GlobalStyle />
        <LandingPage 
          onGetStarted={handleGetStarted} 
          onTryDemo={handleTryDemo}
          onTwitterSignIn={handleTwitterSignIn}
          onGoogleSignIn={handleGoogleSignIn}
        />
      </>
    );
  }

      // 3. Main trading interface (authenticated OR demo mode)
      console.log('🚀 Rendering main trading interface!');
      console.log('🔧 App: Auth state when rendering trading interface:', { isAuthenticated, user, principal });
      return (
        <>
          <GlobalStyle />
          <ToastProvider />
          <TradingPanel 
            onLogout={async () => {
              await logout();
              setIsDemoMode(false); // Reset demo mode on logout
            }} 
            isDemoMode={isDemoMode}
            onConnectWallet={handleGetStarted}
          />
        </>
      );
};

export const App: React.FC = () => {
  return (
    <CanisterProvider>
      <AuthProvider>
        <BalanceProvider>
          <TradeProvider>
            <AppContent />
          </TradeProvider>
        </BalanceProvider>
      </AuthProvider>
    </CanisterProvider>
  );
};