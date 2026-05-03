import React, { useState } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--bg-panel);
  border-radius: 12px;
  border: 1px solid var(--border);
`;

const Title = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 0.5rem 0;
  text-align: center;
`;

const Description = styled.p`
  font-size: 0.9rem;
  color: var(--text-dim);
  margin: 0 0 1rem 0;
  text-align: center;
  line-height: 1.4;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text);
`;

const Input = styled.input`
  padding: 0.75rem;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.9rem;
  
  &:focus {
    outline: none;
    border-color: var(--accent);
  }
  
  &::placeholder {
    color: var(--text-dim);
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.9rem;
  
  &:focus {
    outline: none;
    border-color: var(--accent);
  }
  
  option {
    background: var(--bg-primary);
    color: var(--text);
  }
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  background: linear-gradient(90deg, #f7931a 0%, #ff9500 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(247, 147, 26, 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const ErrorMessage = styled.div`
  padding: 0.75rem;
  background: rgba(255, 71, 87, 0.1);
  border: 1px solid var(--red);
  border-radius: 8px;
  color: var(--red);
  font-size: 0.9rem;
  text-align: center;
`;


interface BitcoinWalletAuthProps {
  onSuccess: (bitcoinAddress: string, walletType: string) => void;
  onError: (error: string) => void;
  isLoading?: boolean;
}

export const BitcoinWalletAuth: React.FC<BitcoinWalletAuthProps> = ({
  onSuccess,
  onError,
  isLoading = false
}) => {
  const [bitcoinAddress, setBitcoinAddress] = useState('');
  const [walletType, setWalletType] = useState<'unisat' | 'xverse' | 'okx' | 'external'>('external');
  const [error, setError] = useState<string | null>(null);

  const handleConnect = () => {
    try {
      // Basic validation
      if (!bitcoinAddress.trim()) {
        setError('Please enter a Bitcoin address');
        return;
      }

      // Basic Bitcoin address validation
      const bitcoinRegex = /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/;
      if (!bitcoinRegex.test(bitcoinAddress.trim())) {
        setError('Please enter a valid Bitcoin address');
        return;
      }

      setError(null);
      onSuccess(bitcoinAddress.trim(), walletType);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMessage);
      onError(errorMessage);
    }
  };

  const handleWalletTypeChange = (type: string) => {
    setWalletType(type as any);
    setError(null);
  };

  return (
    <Container>
      <Title>Connect Bitcoin Wallet</Title>
      <Description>
        Enter your Bitcoin wallet address to sign in. Your wallet will be used to generate a secure trading account.
      </Description>

      <InputGroup>
        <Label>Wallet Type</Label>
        <Select value={walletType} onChange={(e) => handleWalletTypeChange(e.target.value)}>
          <option value="external">External Wallet (Manual)</option>
          <option value="unisat">Unisat Wallet</option>
          <option value="xverse">Xverse Wallet</option>
          <option value="okx">OKX Wallet</option>
        </Select>
      </InputGroup>

      <InputGroup>
        <Label>Bitcoin Address</Label>
        <Input
          type="text"
          placeholder="Enter your Bitcoin wallet address (e.g., bc1q...)"
          value={bitcoinAddress}
          onChange={(e) => {
            setBitcoinAddress(e.target.value);
            setError(null);
          }}
          disabled={isLoading}
        />
      </InputGroup>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <Button onClick={handleConnect} disabled={isLoading}>
        {isLoading ? 'Connecting...' : 'Connect Bitcoin Wallet'}
      </Button>
    </Container>
  );
};
