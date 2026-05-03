import React, { useState } from 'react';
import styled from 'styled-components';
import { useWallet } from '../hooks/useWallet';
import { useBalance } from '../contexts/BalanceProvider';
import { Decimal } from 'decimal.js';

const TransactionContainer = styled.div`
  background: var(--bg-panel);
  border: 2px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 4px 20px var(--shadow);
`;

const TransactionTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 1rem 0;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
`;

const Input = styled.input`
  padding: 0.875rem;
  background: var(--bg-primary);
  border: 2px solid var(--border);
  color: var(--text);
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(244, 208, 63, 0.1);
  }

  &:hover {
    border-color: var(--text-dim);
  }
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  width: 100%;
  padding: 1rem;
  border: 2px solid ${props => props.variant === 'primary' ? 'var(--accent)' : 'var(--border)'};
  background: ${props => props.variant === 'primary' ? 'var(--accent)' : 'transparent'};
  color: ${props => props.variant === 'primary' ? 'var(--bg-primary)' : 'var(--text)'};
  border-radius: 8px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  &:hover:not(:disabled) {
    background: ${props => props.variant === 'primary' ? 'var(--green)' : 'var(--border)'};
    transform: translateY(-2px);
    box-shadow: 0 6px 20px ${props => props.variant === 'primary' ? 'rgba(0, 212, 170, 0.4)' : 'var(--shadow)'};
  }

  &:disabled {
    opacity: 0.5;
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

const TransactionSummary = styled.div`
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);

  &:last-child {
    border-bottom: none;
    font-weight: 700;
    color: var(--accent);
  }
`;

const SummaryLabel = styled.span`
  font-size: 0.875rem;
  color: var(--text-dim);
`;

const SummaryValue = styled.span`
  font-size: 0.875rem;
  color: var(--text);
  font-variant-numeric: tabular-nums;
`;

export const BTCTransaction: React.FC = () => {
  const { walletInfo, isConnected, isLoading, sendTransaction } = useWallet();
  const { userBalance } = useBalance();
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [txError, setTxError] = useState<string | null>(null);
  const [txSuccess, setTxSuccess] = useState<string | null>(null);
  const [lastTxId, setLastTxId] = useState<string | null>(null);

  const handleSendTransaction = async () => {
    if (!isConnected || !walletInfo) {
      setTxError('Wallet not connected');
      return;
    }

    if (!toAddress.trim()) {
      setTxError('Please enter recipient address');
      return;
    }

    if (!amount.trim()) {
      setTxError('Please enter amount');
      return;
    }

    try {
      const amountDecimal = new Decimal(amount);
      if (amountDecimal.lte(0)) {
        setTxError('Amount must be greater than 0');
        return;
      }

      // ✅ PHASE 3: Use centralized balance instead of walletInfo.platformBalance
      if (amountDecimal.gt(userBalance)) {
        setTxError('Insufficient balance');
        return;
      }

      setTxError(null);
      setTxSuccess(null);

      const transaction = await sendTransaction({
        toAddress: toAddress.trim(),
        amount: amountDecimal
      });

      // ✅ FIXED: Use txHash instead of txid
      setLastTxId(transaction.txHash);
      setTxSuccess(`Transaction sent! TXID: ${transaction.txHash.slice(0, 16)}...`);

      // Clear form
      setToAddress('');
      setAmount('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      setTxError(errorMessage);
    }
  };

  const calculateFee = () => {
    // Estimated fee calculation (simplified)
    return new Decimal(0.00001); // 0.00001 BTC
  };

  const calculateTotal = () => {
    if (!amount) return new Decimal(0);
    const amountDecimal = new Decimal(amount);
    return amountDecimal.plus(calculateFee());
  };

  if (!isConnected) {
    return (
      <TransactionContainer>
        <TransactionTitle>Send Bitcoin</TransactionTitle>
        <ErrorMessage>
          Please connect your wallet to send Bitcoin transactions
        </ErrorMessage>
      </TransactionContainer>
    );
  }

  return (
    <TransactionContainer>
      <TransactionTitle>Send Bitcoin</TransactionTitle>

      {txError && <ErrorMessage>{txError}</ErrorMessage>}
      {txSuccess && <SuccessMessage>{txSuccess}</SuccessMessage>}

      <FormGroup>
        <Label>Recipient Address:</Label>
        <Input
          type="text"
          placeholder="Enter Bitcoin address"
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
        />
      </FormGroup>

      <FormGroup>
        <Label>Amount (BTC):</Label>
        <Input
          type="number"
          step="0.00000001"
          placeholder="0.00000000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </FormGroup>

      {amount && (
        <TransactionSummary>
          <SummaryRow>
            <SummaryLabel>Amount:</SummaryLabel>
            <SummaryValue>{new Decimal(amount).toFixed(8)} BTC</SummaryValue>
          </SummaryRow>
          <SummaryRow>
            <SummaryLabel>Network Fee:</SummaryLabel>
            <SummaryValue>{calculateFee().toFixed(8)} BTC</SummaryValue>
          </SummaryRow>
          <SummaryRow>
            <SummaryLabel>Total:</SummaryLabel>
            <SummaryValue>{calculateTotal().toFixed(8)} BTC</SummaryValue>
          </SummaryRow>
        </TransactionSummary>
      )}

      <Button
        variant="primary"
        onClick={handleSendTransaction}
        disabled={isLoading || !toAddress.trim() || !amount.trim()}
      >
        {isLoading ? 'Sending...' : 'Send Bitcoin'}
      </Button>

      {lastTxId && (
        <SuccessMessage>
          Transaction ID: {lastTxId}
        </SuccessMessage>
      )}
    </TransactionContainer>
  );
};
