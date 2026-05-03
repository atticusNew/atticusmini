// ✅ FIXED: Removed unused React import
import { Component, ErrorInfo, ReactNode } from 'react';
import styled from 'styled-components';

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 2rem;
  background: var(--bg-panel);
  border: 2px solid var(--red);
  border-radius: 12px;
  text-align: center;
`;

const ErrorTitle = styled.h2`
  color: var(--red);
  font-size: 1.5rem;
  margin-bottom: 1rem;
`;

const ErrorMessage = styled.p`
  color: var(--text-dim);
  margin-bottom: 1.5rem;
  max-width: 500px;
  line-height: 1.5;
`;

const RetryButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: var(--accent);
  color: var(--bg-primary);
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--green);
    transform: translateY(-1px);
  }
`;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Trading Platform Error:', error);
    console.error('Error Info:', errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorContainer>
          <ErrorTitle>⚠️ Trading Error</ErrorTitle>
          <ErrorMessage>
            Something went wrong with the trading platform. This could be due to:
            <br />• Network connectivity issues
            <br />• Price feed disconnection  
            <br />• Backend service temporarily unavailable
          </ErrorMessage>
          <RetryButton onClick={this.handleReset}>
            🔄 Retry Trading
          </RetryButton>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}
