import React from 'react';
import styled from 'styled-components';

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
  z-index: 1000;
  padding: 1rem;
`;

const ModalContainer = styled.div`
  background: var(--bg-panel);
  border-radius: 16px;
  border: 1px solid var(--border);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  max-width: 480px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
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
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text);
  }
`;

const ModalContent = styled.div`
  padding: 1.5rem;
`;

const InstructionsList = styled.ol`
  color: var(--text);
  font-size: 1rem;
  line-height: 1.6;
  margin: 0;
  padding-left: 1.5rem;
`;

const InstructionItem = styled.li`
  margin-bottom: 1rem;
  font-weight: 500;

  &:last-child {
    margin-bottom: 0;
  }
`;

const ModalFooter = styled.div`
  padding: 0 1.5rem 1.5rem 1.5rem;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;

  ${props => props.variant === 'primary' ? `
    background: var(--accent);
    color: var(--bg-primary);
    
    &:hover {
      background: #e6c035;
      transform: translateY(-1px);
    }
  ` : `
    background: var(--bg-button);
    color: var(--text);
    border: 1px solid var(--border);
    
    &:hover {
      background: var(--bg-button-hover);
      transform: translateY(-1px);
    }
  `}
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: var(--text-dim);
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
`;

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDontShowAgain: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onDontShowAgain
}) => {
  const [dontShowAgain, setDontShowAgain] = React.useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (dontShowAgain) {
      onDontShowAgain();
    } else {
      onClose();
    }
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>🚀 How to Trade</ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <ModalContent>
          <InstructionsList>
            <InstructionItem>
              <strong>Choose Call</strong> if you think Bitcoin price will go up, or <strong>Put</strong> if you think it will go down
            </InstructionItem>
            <InstructionItem>
              <strong>Select strike price</strong> - how far from current price you think it will move ($2.50, $5.00, $10.00, or $15.00)
            </InstructionItem>
            <InstructionItem>
              <strong>Pick expiry time</strong> - how long your prediction has to be right (5s, 10s, or 15s)
            </InstructionItem>
            <InstructionItem>
              <strong>Enter contract amount</strong> - each contract costs $1 USD
            </InstructionItem>
            <InstructionItem>
              <strong>Start trade</strong> - your prediction is locked in and will settle automatically at expiry
            </InstructionItem>
          </InstructionsList>

          <CheckboxContainer>
            <Checkbox
              type="checkbox"
              id="dont-show-again"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            />
            <label htmlFor="dont-show-again">Don't show this again</label>
          </CheckboxContainer>
        </ModalContent>

        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" onClick={handleClose}>
            Got it!
          </Button>
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>
  );
};




























