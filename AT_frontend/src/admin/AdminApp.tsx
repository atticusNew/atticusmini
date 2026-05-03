import React, { useState, useEffect } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { ImprovedAdminPanel } from '../components/ImprovedAdminPanel';
import { useCanister } from '../contexts/CanisterProvider';

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
    --bg-button: #1a2332;
    --bg-button-hover: #2a3441;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: var(--bg-primary);
    color: var(--text);
    min-height: 100vh;
  }

  code {
    font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace;
  }
`;

const AdminContainer = styled.div`
  min-height: 100vh;
  background: var(--bg-primary);
  padding: 2rem;
`;

const AdminHeader = styled.div`
  text-align: center;
  margin-bottom: 2rem;
  padding: 2rem;
  background: var(--bg-panel);
  border-radius: 16px;
  border: 2px solid var(--accent);
`;

const AdminTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 0.5rem;
`;

const AdminSubtitle = styled.p`
  color: var(--text-dim);
  font-size: 1rem;
`;

const SecurityWarning = styled.div`
  background: rgba(255, 71, 87, 0.1);
  border: 2px solid var(--red);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  text-align: center;
`;

const WarningTitle = styled.h2`
  color: var(--red);
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
`;

const WarningText = styled.p`
  color: var(--text);
  font-size: 0.875rem;
  line-height: 1.5;
`;

const ConnectionStatus = styled.div<{ connected: boolean }>`
  background: ${props => props.connected ? 'rgba(0, 212, 170, 0.1)' : 'rgba(255, 71, 87, 0.1)'};
  border: 1px solid ${props => props.connected ? 'var(--green)' : 'var(--red)'};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  text-align: center;
  color: ${props => props.connected ? 'var(--green)' : 'var(--red)'};
  font-weight: 600;
`;


export const AdminApp: React.FC = () => {
  const { tradingCanister, isConnected } = useCanister();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (tradingCanister && isConnected) {
      setIsInitialized(true);
    }
  }, [tradingCanister, isConnected]);

  return (
    <>
      <GlobalStyle />
      <AdminContainer>
        <AdminHeader>
          <AdminTitle>🏦 Atticus Admin Panel</AdminTitle>
          <AdminSubtitle>Platform Wallet & Liquidity Management</AdminSubtitle>
        </AdminHeader>

        <SecurityWarning>
          <WarningTitle>🔒 ADMIN ACCESS ONLY</WarningTitle>
          <WarningText>
            This interface is for authorized administrators only. All actions are logged and monitored.
            Unauthorized access is prohibited and will be reported.
          </WarningText>
        </SecurityWarning>

        <ConnectionStatus connected={isConnected}>
          {isConnected ? '✅ Connected to ICP Backend' : '❌ Disconnected from ICP Backend'}
        </ConnectionStatus>

        {isInitialized ? (
          <ImprovedAdminPanel />
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
            <p>Loading admin interface...</p>
          </div>
        )}
      </AdminContainer>
    </>
  );
};
