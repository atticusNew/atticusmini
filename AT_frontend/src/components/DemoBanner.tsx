import React from 'react';
import styled from 'styled-components';

const Banner = styled.div`
  background: rgba(245, 195, 68, 0.08);
  border-bottom: 1px solid rgba(245, 195, 68, 0.32);
  color: var(--accent);
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: center;
  padding: 6px 12px;

  span {
    color: var(--text-dim);
    font-weight: 400;
    letter-spacing: 0.02em;
    text-transform: none;
    margin-left: 8px;
  }
`;

export const DemoBanner: React.FC = () => (
  <Banner>
    Demo
    <span>paper book · no real trades · no real money</span>
  </Banner>
);
