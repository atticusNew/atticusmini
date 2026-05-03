/*  admin.tsx  – ENTRY FILE FOR THE ADMIN BUNDLE  */
/*  polyfills must be imported BEFORE anything else  */
import './polyfills';

import React from 'react';
import ReactDOM from 'react-dom/client';
import styled from 'styled-components';
import { ImprovedAdminPanel } from './components/ImprovedAdminPanel';
import { CanisterProvider } from './contexts/CanisterProvider';

const AppContainer = styled.div`
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
`;

const AccessDeniedContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #0f1419;
  color: #ffffff;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  text-align: center;
  padding: 2rem;
`;

const AccessDeniedTitle = styled.h1`
  color: #ff4444;
  font-size: 2rem;
  margin-bottom: 1rem;
`;

const AccessDeniedText = styled.p`
  color: #cccccc;
  font-size: 1.1rem;
  margin-bottom: 2rem;
  max-width: 600px;
  line-height: 1.6;
`;

const AdminApp: React.FC = () => {
  // Check for admin access code in URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const adminCode = urlParams.get('code');
  const validAdminCode = '040617081822010316'; // Change this to your desired code
  
  // If no code or wrong code, show access denied
  if (!adminCode || adminCode !== validAdminCode) {
    return (
      <AccessDeniedContainer>
        <AccessDeniedTitle>🔒 Access Denied</AccessDeniedTitle>
        <AccessDeniedText>
          This admin panel requires proper authorization. 
          Please contact the system administrator for access credentials.
        </AccessDeniedText>
        <AccessDeniedText style={{ fontSize: '0.9rem', color: '#888' }}>
          Unauthorized access attempts are logged and monitored.
        </AccessDeniedText>
      </AccessDeniedContainer>
    );
  }
  
  // Valid code - show admin panel
  return (
    <AppContainer>
      <CanisterProvider>
        <ImprovedAdminPanel />
      </CanisterProvider>
    </AppContainer>
  );
};

// Render the admin app
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>,
);
