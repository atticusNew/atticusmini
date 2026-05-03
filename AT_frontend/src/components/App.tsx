import React from 'react';
import styled from 'styled-components';
import { TradingPanel } from './TradingPanel';
import { useAuth, AuthProvider } from '../contexts/AuthProvider';
import { CanisterProvider } from '../contexts/CanisterProvider';
import { BalanceProvider } from '../contexts/BalanceProvider';
import { ToastProvider } from './ToastProvider';
import { DemoBanner } from './DemoBanner';
import { AdminPage } from './admin/AdminPage';
import { GlobalTheme } from '../ui/GlobalTheme';

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 2rem;
`;

const LoadingSpinner = styled.div`
  width: 36px;
  height: 36px;
  border: 2px solid transparent;
  border-top: 2px solid var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
`;

const LoadingText = styled.p`
  color: var(--text-dim);
  font-size: 14px;
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
        <GlobalTheme />
        <DemoBanner />
        <AdminPage />
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <GlobalTheme />
        <DemoBanner />
        <LoadingContainer>
          <LoadingSpinner />
          <LoadingText>Loading Atticus…</LoadingText>
        </LoadingContainer>
      </>
    );
  }

  return (
    <>
      <GlobalTheme />
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
        <AppContent />
      </BalanceProvider>
    </AuthProvider>
  </CanisterProvider>
);
