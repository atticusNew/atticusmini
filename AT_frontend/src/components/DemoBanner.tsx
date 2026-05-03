import React from 'react';
import styled from 'styled-components';

const Banner = styled.div`
  background: linear-gradient(90deg, #f4d03f, #ffb84d);
  color: #1a1a1a;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 0.78rem;
  letter-spacing: 0.02em;
  text-align: center;
  padding: 0.45rem 0.75rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.15);
  z-index: 1000;

  span {
    font-weight: 400;
    margin-left: 0.4rem;
  }
`;

export const DemoBanner: React.FC = () => (
  <Banner>
    DEMO MODE
    <span>· paper book, no real trades, no real money</span>
  </Banner>
);
