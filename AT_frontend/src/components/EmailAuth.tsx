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

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  background: linear-gradient(90deg, #007bff 0%, #0056b3 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const SecondaryButton = styled(Button)`
  background: transparent;
  color: var(--accent);
  border: 1px solid var(--accent);
  
  &:hover:not(:disabled) {
    background: rgba(244, 208, 63, 0.1);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(244, 208, 63, 0.2);
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


const InfoMessage = styled.div`
  padding: 0.75rem;
  background: rgba(0, 123, 255, 0.1);
  border: 1px solid #007bff;
  border-radius: 8px;
  color: #007bff;
  font-size: 0.9rem;
  text-align: center;
`;

const StepIndicator = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const Step = styled.div<{ active: boolean; completed: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => 
    props.completed ? 'var(--green)' : 
    props.active ? 'var(--accent)' : 'var(--border)'
  };
`;

interface EmailAuthProps {
  onSuccess: (email: string, verificationCode?: string) => void;
  onError: (error: string) => void;
  onSendCode: (email: string) => void;
  isLoading?: boolean;
}

export const EmailAuth: React.FC<EmailAuthProps> = ({
  onSuccess,
  onError,
  onSendCode,
  isLoading = false
}) => {
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'email' | 'verification'>('email');
  const [error, setError] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);

  const handleEmailSubmit = async () => {
    try {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError('Please enter a valid email address');
        return;
      }

      setError(null);
      setIsSendingCode(true);
      
      try {
        await onSendCode(email.trim());
        setStep('verification');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send verification code';
        setError(errorMessage);
        onError(errorMessage);
      } finally {
        setIsSendingCode(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Email validation failed';
      setError(errorMessage);
      onError(errorMessage);
    }
  };

  const handleVerificationSubmit = () => {
    try {
      if (!verificationCode.trim()) {
        setError('Please enter the verification code');
        return;
      }

      setError(null);
      onSuccess(email.trim(), verificationCode.trim());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Verification failed';
      setError(errorMessage);
      onError(errorMessage);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setVerificationCode('');
    setError(null);
  };

  const handleResendCode = async () => {
    try {
      setError(null);
      setIsSendingCode(true);
      await onSendCode(email.trim());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend code';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsSendingCode(false);
    }
  };

  return (
    <Container>
      <Title>Sign in with Email</Title>
      <Description>
        Enter your email address to create a secure trading account. We'll send you a verification code.
      </Description>

      <StepIndicator>
        <Step active={step === 'email'} completed={step === 'verification'} />
        <Step active={step === 'verification'} completed={false} />
      </StepIndicator>

      {step === 'email' ? (
        <>
          <InputGroup>
            <Label>Email Address</Label>
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              disabled={isLoading || isSendingCode}
            />
          </InputGroup>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <Button 
            onClick={handleEmailSubmit} 
            disabled={isLoading || isSendingCode || !email.trim()}
          >
            {isSendingCode ? 'Sending Code...' : 'Send Verification Code'}
          </Button>
        </>
      ) : (
        <>
          <InfoMessage>
            Verification code sent to: <strong>{email}</strong>
          </InfoMessage>

          <InputGroup>
            <Label>Verification Code</Label>
            <Input
              type="text"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => {
                setVerificationCode(e.target.value);
                setError(null);
              }}
              disabled={isLoading}
              maxLength={6}
            />
          </InputGroup>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <Button 
            onClick={handleVerificationSubmit} 
            disabled={isLoading || !verificationCode.trim()}
          >
            {isLoading ? 'Verifying...' : 'Verify & Sign In'}
          </Button>

          <SecondaryButton onClick={handleResendCode} disabled={isSendingCode}>
            {isSendingCode ? 'Resending...' : 'Resend Code'}
          </SecondaryButton>

          <SecondaryButton onClick={handleBackToEmail}>
            Back to Email
          </SecondaryButton>
        </>
      )}
    </Container>
  );
};
