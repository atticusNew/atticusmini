import React, { useState } from 'react';
import styled from 'styled-components';

const AuthContainer = styled.div`
  text-align: center;
  padding: 2rem 0;
`;

const AuthTitle = styled.h3`
  color: var(--text);
  margin-bottom: 1rem;
  font-size: 1.25rem;
  font-weight: 600;
`;

const AuthDescription = styled.p`
  color: var(--text-dim);
  margin-bottom: 2rem;
  line-height: 1.5;
`;

const AuthButton = styled.button<{ isLoading?: boolean }>`
  padding: 0.75rem 2rem;
  background: linear-gradient(90deg, #1DA1F2 0%, #0d8bd9 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin: 0 auto;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: linear-gradient(90deg, #0d8bd9 0%, #0a6bb3 100%);
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const TwitterIcon = styled.div`
  width: 20px;
  height: 20px;
  background: currentColor;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z'/%3E%3C/svg%3E") no-repeat center;
  mask-size: contain;
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

interface TwitterAuthProps {
  onSuccess: (user: any) => void;
  onError: (error: string) => void;
  isLoading?: boolean;
}

export const TwitterAuth: React.FC<TwitterAuthProps> = ({
  onSuccess,
  onError,
  isLoading = false
}) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleTwitterAuth = async () => {
    try {
      setIsConnecting(true);
      onError(''); // Clear any previous errors
      
      // Simulate OAuth flow
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful authentication
      const mockUser = {
        principal: 'mock-principal',
        twitterId: 'twitter_12345',
        username: 'twitteruser',
        name: 'Twitter User',
        email: 'user@twitter.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=twitteruser'
      };
      
      onSuccess(mockUser);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Twitter authentication failed';
      onError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <AuthContainer>
      <AuthTitle>Sign in with Twitter/X</AuthTitle>
      <AuthDescription>
        Connect your Twitter/X account to access the platform.
        Your Twitter identity will be linked to a secure ICP Principal.
      </AuthDescription>
      
      <AuthButton 
        onClick={handleTwitterAuth}
        disabled={isLoading || isConnecting}
        isLoading={isLoading || isConnecting}
      >
        {isLoading || isConnecting ? (
          <>
            <LoadingSpinner />
            Connecting...
          </>
        ) : (
          <>
            <TwitterIcon />
            Connect with Twitter/X
          </>
        )}
      </AuthButton>
    </AuthContainer>
  );
};




























