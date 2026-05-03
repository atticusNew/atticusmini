import React from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { TradingPanel } from './TradingPanel';
import { useAuth, AuthProvider } from '../contexts/AuthProvider';
import { TradeProvider } from '../contexts/TradeContext';
import { CanisterProvider } from '../contexts/CanisterProvider';
import { BalanceProvider } from '../contexts/BalanceProvider';
import { ToastProvider } from './ToastProvider';
import { DemoBanner } from './DemoBanner';
import { AdminPage } from './admin/AdminPage';

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

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Inter', sans-serif;
    background: var(--bg-primary);
    color: var(--text);
    overflow-x: hidden;
    overflow-y: auto;
  }

  #root { min-height: 100vh; width: 100vw; }
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
`;

const isAdminRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.replace(/\/+$/, '') === '/admin';
};

const AppContent: React.FC = () => {
  const { isLoading, logout } = useAuth();

  if (isAdminRoute()) {
    return (
      <>
        <GlobalStyle />
        <DemoBanner />
        <AdminPage />
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <GlobalStyle />
        <DemoBanner />
        <LoadingContainer>
          <LoadingSpinner />
          <LoadingText>Loading Atticus...</LoadingText>
        </LoadingContainer>
      </>
    );
  }

  return (
    <>
      <GlobalStyle />
      <DemoBanner />
      <ToastProvider />
      <TradingPanel
        onLogout={async () => { await logout(); }}
        isDemoMode={true}
        onConnectWallet={async () => {}}
      />
    </>
  );
};

export const App: React.FC = () => (
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
