import React, { useState } from 'react';
import styled from 'styled-components';
import { BitcoinWalletAuth } from './BitcoinWalletAuth';
import { EmailAuth } from './EmailAuth';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
`;

const ModalContainer = styled.div`
  background: var(--bg-panel);
  border-radius: 16px;
  border: 1px solid var(--border);
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
`;

const ModalHeader = styled.div`
  padding: 1.5rem 1.5rem 0 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text);
  }
`;

const TabContainer = styled.div`
  display: flex;
  margin: 1.5rem 1.5rem 0 1.5rem;
  border-bottom: 1px solid var(--border);
`;

const Tab = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  color: ${props => props.active ? 'var(--accent)' : 'var(--text-dim)'};
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  border-bottom: 2px solid ${props => props.active ? 'var(--accent)' : 'transparent'};
  transition: all 0.2s ease;
  
  &:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.05);
  }
`;

const TabContent = styled.div`
  padding: 0 1.5rem 1.5rem 1.5rem;
`;

const ErrorMessage = styled.div`
  padding: 0.75rem;
  background: rgba(255, 71, 87, 0.1);
  border: 1px solid var(--red);
  border-radius: 8px;
  color: var(--red);
  font-size: 0.9rem;
  text-align: center;
  margin-bottom: 1rem;
`;

const SuccessMessage = styled.div`
  padding: 0.75rem;
  background: rgba(0, 212, 170, 0.1);
  border: 1px solid var(--green);
  border-radius: 8px;
  color: var(--green);
  font-size: 0.9rem;
  text-align: center;
  margin-bottom: 1rem;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  z-index: 1000;
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid transparent;
  border-top: 3px solid var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  color: var(--text);
  font-size: 1rem;
  margin-top: 1rem;
  text-align: center;
`;

export type AuthTab = 'icp' | 'bitcoin' | 'email';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onICPSuccess: () => void;
  onBitcoinSuccess: (bitcoinAddress: string, walletType: string) => void;
  onEmailSuccess: (email: string, verificationCode?: string) => void;
  onEmailSendCode: (email: string) => void;
  onError: (error: string) => void;
  isLoading?: boolean;
  loadingMessage?: string;
  error?: string | null;
  success?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onICPSuccess,
  onBitcoinSuccess,
  onEmailSuccess,
  onEmailSendCode,
  onError,
  isLoading = false,
  loadingMessage = 'Authenticating...',
  error = null,
  success = null
}) => {
  const [activeTab, setActiveTab] = useState<AuthTab>('icp');

  if (!isOpen) return null;

  const handleTabChange = (tab: AuthTab) => {
    setActiveTab(tab);
    onError(''); // Clear any errors when switching tabs
  };

  const handleICPAuth = () => {
    onICPSuccess();
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Sign In</ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <TabContainer>
          <Tab active={activeTab === 'icp'} onClick={() => handleTabChange('icp')}>
            ICP Identity
          </Tab>
          <Tab active={activeTab === 'bitcoin'} onClick={() => handleTabChange('bitcoin')}>
            Bitcoin Wallet
          </Tab>
          <Tab active={activeTab === 'email'} onClick={() => handleTabChange('email')}>
            Email
          </Tab>
        </TabContainer>

        <TabContent>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          {success && <SuccessMessage>{success}</SuccessMessage>}

          {activeTab === 'icp' && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <h3 style={{ color: 'var(--text)', marginBottom: '1rem' }}>
                Internet Identity
              </h3>
              <p style={{ color: 'var(--text-dim)', marginBottom: '2rem', lineHeight: 1.5 }}>
                Sign in with your Internet Identity to access the platform securely.
                This is the recommended method for ICP users.
              </p>
              <button
                onClick={handleICPAuth}
                style={{
                  padding: '0.75rem 2rem',
                  background: 'linear-gradient(90deg, #f4d03f 0%, #87ceeb 100%)',
                  color: 'var(--bg-primary)',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
                disabled={isLoading}
              >
                {isLoading ? 'Connecting...' : 'Connect with ICP Identity'}
              </button>
            </div>
          )}

          {activeTab === 'bitcoin' && (
            <BitcoinWalletAuth
              onSuccess={onBitcoinSuccess}
              onError={onError}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'email' && (
            <EmailAuth
              onSuccess={onEmailSuccess}
              onError={onError}
              onSendCode={onEmailSendCode}
              isLoading={isLoading}
            />
          )}
        </TabContent>

        {isLoading && (
          <LoadingOverlay>
            <div style={{ textAlign: 'center' }}>
              <LoadingSpinner />
              <LoadingText>{loadingMessage}</LoadingText>
            </div>
          </LoadingOverlay>
        )}
      </ModalContainer>
    </ModalOverlay>
  );
};
