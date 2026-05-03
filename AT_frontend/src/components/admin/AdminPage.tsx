import React from 'react';
import styled from 'styled-components';
import { GeoFencePanel } from './GeoFencePanel';
import { BybitDiagnostic } from './BybitDiagnostic';
import { mockPartnerExchangeAdapter } from '../../services/partner';

const Page = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: 1.5rem 1rem 4rem;
  font-family: 'Inter', sans-serif;
  color: var(--text);
`;

const Title = styled.h1`
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
`;

const Sub = styled.div`
  color: var(--text-dim);
  font-size: 0.85rem;
  margin-bottom: 1.5rem;
`;

const ResetButton = styled.button`
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  margin: 1rem 0;

  &:hover {
    border-color: var(--accent);
  }
`;

const Back = styled.a`
  color: var(--accent);
  font-size: 0.85rem;
  text-decoration: none;
  &:hover { text-decoration: underline; }
`;

export const AdminPage: React.FC = () => {
  const onReset = () => {
    mockPartnerExchangeAdapter.reset();
    window.location.reload();
  };

  return (
    <Page>
      <Title>Atticus admin · demo</Title>
      <Sub>
        Diagnostics for the demo build. None of these controls touch real money or place real
        orders.
      </Sub>
      <Back href="/">← back to trading</Back>
      <BybitDiagnostic />
      <GeoFencePanel />
      <ResetButton onClick={onReset}>Reset demo state</ResetButton>
    </Page>
  );
};
