import React, { useState, useEffect, ChangeEvent } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthProvider';
import { useCanister } from '../contexts/CanisterProvider';

// ✅ Keep all your styled components (same as before)
const WalletContainer = styled.div`
  background: var(--bg-panel);
  border: 2px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 4px 20px var(--shadow);
`;

const WalletHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const WalletTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
`;

const ConnectionStatus = styled.div<{ connected: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  background: ${props => props.connected ? 'rgba(0, 212, 170, 0.1)' : 'rgba(255, 71, 87, 0.1)'};
  color: ${props => props.connected ? 'var(--green)' : 'var(--red)'};
  border: 1px solid ${props => props.connected ? 'var(--green)' : 'var(--red)'};
`;

const WalletInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
  &:last-child {
    border-bottom: none;
  }
`;

const InfoLabel = styled.span`
  font-size: 0.875rem;
  color: var(--text-dim);
  font-weight: 500;
`;

const AddressContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 300px;
`;

const AddressValue = styled.span`
  font-size: 0.75rem;
  color: var(--accent);
  font-family: 'Monaco', 'Menlo', monospace;
  word-break: break-all;
  text-align: right;
  flex: 1;
  background: rgba(244, 208, 63, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
`;

const CopyButton = styled.button`
  background: var(--bg-button);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text);
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    background: var(--bg-button-hover);
    border-color: var(--green);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid ${props => props.variant === 'primary' ? 'var(--accent)' : 'var(--border)'};
  background: ${props => props.variant === 'primary' ? 'var(--accent)' : 'transparent'};
  color: ${props => props.variant === 'primary' ? 'var(--bg-primary)' : 'var(--text)'};
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    background: ${props => props.variant === 'primary' ? 'var(--green)' : 'var(--border)'};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  background: var(--bg-primary);
  border: 2px solid var(--border);
  color: var(--text);
  border-radius: 8px;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  &:focus {
    outline: none;
    border-color: var(--accent);
  }
`;

const ErrorMessage = styled.div`
  padding: 0.75rem;
  background: rgba(255, 71, 87, 0.1);
  border: 1px solid var(--red);
  border-radius: 8px;
  color: var(--red);
  font-size: 0.875rem;
  margin-bottom: 1rem;
`;

const SuccessMessage = styled.div`
  padding: 0.75rem;
  background: rgba(0, 212, 170, 0.1);
  border: 1px solid var(--green);
  border-radius: 8px;
  color: var(--green);
  font-size: 0.875rem;
  margin-bottom: 1rem;
`;

const CustodialNotice = styled.div`
  background: rgba(0, 212, 170, 0.1);
  border: 1px solid var(--green);
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
`;

const NoticeTitle = styled.h4`
  color: var(--green);
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
`;

const NoticeText = styled.p`
  color: var(--text);
  font-size: 0.75rem;
  margin: 0;
  line-height: 1.4;
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top: 2px solid var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const BalanceCard = styled.div`
  background: rgba(244, 208, 63, 0.1);
  border: 1px solid var(--accent);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
`;

const BalanceAmount = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  text-align: center;
`;

const BalanceLabel = styled.div`
  font-size: 0.875rem;
  color: var(--text-dim);
  text-align: center;
  margin-top: 0.5rem;
`;

export const WalletConnection: React.FC = () => {
  const { user, isAuthenticated, walletGenerating, completeWalletGeneration } = useAuth();
  const { atticusService, treasuryService, isConnected: canisterConnected } = useCanister();
  const [copySuccess, setCopySuccess] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [operationStatus, setOperationStatus] = useState<string | null>(null);
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [platformBalance, setPlatformBalance] = useState(0);
  const [isGeneratingWallet, setIsGeneratingWallet] = useState(false);

  // ✅ ENHANCED WALLET GENERATION WITH PROPER ERROR HANDLING
  useEffect(() => {
    const autoGenerateWallet = async () => {
      console.log('🔍 Wallet generation check:', {
        isAuthenticated,
        hasUser: !!user,
        canisterConnected,
        walletGenerating,
        hasDepositAddress: !!depositAddress,
        isGeneratingWallet
      });
      
      if (isAuthenticated && user && canisterConnected && walletGenerating && !depositAddress && !isGeneratingWallet) {
        try {
          setIsGeneratingWallet(true);
          console.log('🏦 === Starting Wallet Generation ===');
          console.log('🔧 WalletConnection: Wallet generation conditions met:', {
            isAuthenticated,
            hasUser: !!user,
            canisterConnected,
            walletGenerating,
            hasDepositAddress: !!depositAddress,
            isGeneratingWallet
          });

          if (!atticusService) {
            throw new Error('Atticus service not available');
          }

          console.log('🔍 User object for wallet generation:', user);
          console.log('🔍 User type:', typeof user);
          console.log('🔍 User principal:', user?.principal);
          
          // ✅ FIXED: Extract principal properly from user object
          if (!user?.principal) {
            throw new Error('User principal not available');
          }
          
          const userPrincipal = user.principal;
          console.log('🔍 Using principal:', userPrincipal.toString());
          
          // ✅ STEP 1: Create user in canister first
          console.log('👤 Creating user in canister...');
          await atticusService.createUser(userPrincipal.toString());
          console.log('✅ User created successfully');
          
          // ✅ STEP 2: Generate wallet for user
          console.log('🏦 Generating wallet for user...');
          const result = await treasuryService.generateUserWallet(userPrincipal.toString());
          console.log('📥 Backend Response:', result);

          if (result) {
            const userDepositAddress = result;
            setDepositAddress(userDepositAddress);
            console.log('✅ Deposit address generated:', userDepositAddress);

            // ✅ FIXED: Get balance with proper null checks
            try {
              const userData = await atticusService.getUser(userPrincipal.toString());
              if (userData) {
                setPlatformBalance(userData.balance || 0);
              } else {
                setPlatformBalance(0);
              }
            } catch (balanceError) {
              console.warn('Failed to get initial balance:', balanceError);
              setPlatformBalance(0);
            }

            if (completeWalletGeneration) {
              completeWalletGeneration(true);
            }
            console.log('🎉 Wallet setup completed successfully!');
          } else if (result && 'err' in result) {
            console.error('❌ Wallet generation failed:', result.err);
            setOperationStatus(`❌ Wallet generation failed: ${result.err}`);
            if (completeWalletGeneration) {
              completeWalletGeneration(false);
            }
          } else {
            console.error('❌ Unexpected result format:', result);
            setOperationStatus(`❌ Unexpected wallet generation response`);
            if (completeWalletGeneration) {
              completeWalletGeneration(false);
            }
          }
        } catch (error) {
          console.error('❌ === Wallet Generation Error ===', error);
          setOperationStatus(`❌ Wallet generation error: ${error instanceof Error ? error.message : String(error)}`);
          if (completeWalletGeneration) {
            completeWalletGeneration(false);
          }
        } finally {
          setIsGeneratingWallet(false);
        }
      };
    };

    autoGenerateWallet();
  }, [isAuthenticated, user, canisterConnected, walletGenerating, isGeneratingWallet, treasuryService, completeWalletGeneration]);

  // ✅ MANUAL WALLET GENERATION
  const handleManualWalletGeneration = async () => {
    if (!user || !treasuryService) {
      setOperationStatus('❌ User or canister not ready');
      return;
    }

    try {
      setIsGeneratingWallet(true);
      setOperationStatus('🔧 Generating custodial wallet...');
      const result = await treasuryService.generateDepositAddress(user.principal.toString());

      if (result) {
        const userDepositAddress = result;
        setDepositAddress(userDepositAddress);

        // ✅ FIXED: Get balance with proper null checks
        try {
          const userData = await atticusService.getUser(user.principal.toString());
          if (userData && userData.balance !== undefined) {
            setPlatformBalance(userData.balance);
          }
        } catch (balanceError) {
          console.warn('Failed to get balance:', balanceError);
          setPlatformBalance(0);
        }

        if (completeWalletGeneration) {
          completeWalletGeneration(true);
        }
        setOperationStatus('✅ Custodial wallet generated successfully!');
      } else {
        throw new Error(result && 'err' in result ? result.err : 'Unknown error');
      }
    } catch (error) {
      console.error('❌ Manual wallet generation failed:', error);
      setOperationStatus(`❌ Manual generation failed: ${error instanceof Error ? error.message : String(error)}`);
      if (completeWalletGeneration) {
        completeWalletGeneration(false);
      }
    } finally {
      setIsGeneratingWallet(false);
    }
  };

  // ✅ REFRESH BALANCE WITH PROPER ERROR HANDLING
  const handleRefreshBalance = async () => {
    if (!user || !atticusService) return;

    try {
      const userData = await atticusService.getUser(user.principal.toString());
      if (userData && userData.balance !== undefined) {
        setPlatformBalance(userData.balance);
        console.log('✅ Platform balance refreshed:', userData.balance);
      } else {
        setPlatformBalance(0);
      }
    } catch (error) {
      console.error('❌ Failed to refresh balance:', error);
    }
  };

  // ✅ WITHDRAWAL WITH PROPER ERROR HANDLING
  const handleWithdrawal = async () => {
    if (!withdrawAmount || !withdrawAddress || !user || !atticusService) {
      setOperationStatus('❌ Please enter withdrawal amount, address, and ensure you are logged in');
      return;
    }

    setIsProcessing(true);
    setOperationStatus('💸 Processing withdrawal from liquidity pool...');

    try {
      const amount = parseFloat(withdrawAmount);
      if (amount <= 0) {
        throw new Error('Withdrawal amount must be greater than 0');
      }

      if (amount > platformBalance) {
        throw new Error('Insufficient platform balance');
      }

      // ✅ FIXED: Convert to BigInt
      const amountSatoshis = BigInt(Math.floor(amount * 100000000));
      // Note: Withdrawal functionality needs to be implemented in TreasuryService
      // For now, we'll show a placeholder message
      setOperationStatus('❌ Withdrawal functionality not yet implemented in TreasuryService');
      return;

      if (result && 'ok' in result) {
        console.log('✅ Platform withdrawal successful:', result);
        setOperationStatus('✅ Withdrawal processed! Funds will be sent from platform liquidity pool.');
        await handleRefreshBalance();
        setWithdrawAmount('');
        setWithdrawAddress('');
      } else {
        throw new Error(result && 'err' in result ? result.err : 'Withdrawal failed');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setOperationStatus(`❌ Withdrawal failed: ${errorMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ UTILITY FUNCTIONS
  const formatAddress = (address: string) => {
    // Show full address for easier copying, but with line breaks for readability
    if (address.length > 50) {
      return `${address.slice(0, 25)}\n${address.slice(25, 50)}\n${address.slice(50)}`;
    }
    return address;
  };
  
  const handleCopyAddress = async () => {
    if (depositAddress) {
      try {
        await navigator.clipboard.writeText(depositAddress);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy address:', err);
      }
    }
  };

  // ✅ WALLET GENERATION LOADING STATE
  if (isAuthenticated && (walletGenerating || isGeneratingWallet) && !depositAddress) {
    return (
      <WalletContainer>
        <WalletHeader>
          <WalletTitle>🏦 Setting Up Your Trading Wallet</WalletTitle>
          <ConnectionStatus connected={false}>
            <LoadingSpinner />
            🔄 Generating...
          </ConnectionStatus>
        </WalletHeader>

        <WalletInfo>
          <InfoRow>
            <InfoLabel>Creating your secure custodial deposit address...</InfoLabel>
          </InfoRow>
          <InfoRow>
            <InfoLabel>This connects you to the platform liquidity pool</InfoLabel>
          </InfoRow>
        </WalletInfo>

        <ButtonGroup>
          <Button
            variant="primary"
            onClick={handleManualWalletGeneration}
            disabled={isGeneratingWallet}
          >
            {isGeneratingWallet ? 'Generating...' : '🔧 Generate Manually'}
          </Button>
        </ButtonGroup>

        {operationStatus && (
          <ErrorMessage>{operationStatus}</ErrorMessage>
        )}
      </WalletContainer>
    );
  }

  // ✅ MAIN WALLET INTERFACE
  return (
    <WalletContainer>
      <WalletHeader>
        <WalletTitle>🏦 Trading Wallet</WalletTitle>
        <ConnectionStatus connected={!!depositAddress}>
          {depositAddress ? '🟢 Ready' : '🔴 Not Ready'}
        </ConnectionStatus>
      </WalletHeader>

      <BalanceCard>
        <BalanceAmount>{platformBalance.toFixed(8)} BTC</BalanceAmount>
        <BalanceLabel>Available Trading Balance</BalanceLabel>
      </BalanceCard>

      <WalletInfo>
        <InfoRow>
          <InfoLabel style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '0.75rem', color: 'var(--text)' }}>
            How to Deposit BTC
          </InfoLabel>
        </InfoRow>
        
        <InfoRow>
          <div style={{ 
            background: 'var(--bg-panel)', 
            padding: '0.875rem', 
            borderRadius: '6px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text)', fontSize: '0.875rem' }}>
                1. Copy Wallet Address
              </div>
              <AddressContainer>
                <AddressValue style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {depositAddress || 'Generating...'}
                </AddressValue>
                {depositAddress && (
                  <CopyButton onClick={handleCopyAddress} disabled={copySuccess}>
                    {copySuccess ? '✓' : '📋'}
                  </CopyButton>
                )}
              </AddressContainer>
            </div>
            
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text)', fontSize: '0.875rem' }}>
                2. Send BTC from Your Wallet or Exchange
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                Paste address in your Bitcoin wallet/exchange and send
              </div>
            </div>
            
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text)', fontSize: '0.875rem' }}>
                3. Wait 5-10 Minutes & Refresh
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                Deposit will appear after confirmation. Tap "Refresh Balance"
              </div>
            </div>
          </div>
        </InfoRow>
      </WalletInfo>

      <ButtonGroup>
        <Button variant="secondary" onClick={handleRefreshBalance}>
          🔄 Refresh Balance
        </Button>
        {!depositAddress && (
          <Button
            variant="primary"
            onClick={handleManualWalletGeneration}
            disabled={isGeneratingWallet}
          >
            {isGeneratingWallet ? 'Generating...' : '🔧 Generate Wallet'}
          </Button>
        )}
      </ButtonGroup>


      {depositAddress && (
        <WalletContainer>
          <WalletTitle>💸 Withdraw to External Address</WalletTitle>
          <NoticeText>
            Withdraw your Bitcoin from the platform liquidity pool to any external address.
          </NoticeText>
          
          <Input
            type="number"
            step="0.00000001"
            placeholder="Enter BTC amount to withdraw"
            value={withdrawAmount}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setWithdrawAmount(e.target.value)}
            min="0"
            max={platformBalance.toString()}
          />
          
          <Input
            type="text"
            placeholder="Enter destination Bitcoin address"
            value={withdrawAddress}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setWithdrawAddress(e.target.value)}
          />
          
          <Button
            variant="primary"
            onClick={handleWithdrawal}
            disabled={isProcessing || !withdrawAmount || !withdrawAddress}
          >
            {isProcessing ? 'Processing...' : '💸 Withdraw from Pool'}
          </Button>
        </WalletContainer>
      )}

      {operationStatus && (
        <>
          {operationStatus.includes('✅') ? (
            <SuccessMessage>{operationStatus}</SuccessMessage>
          ) : (
            <ErrorMessage>{operationStatus}</ErrorMessage>
          )}
        </>
      )}
    </WalletContainer>
  );
};
