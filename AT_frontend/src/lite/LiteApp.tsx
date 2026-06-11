/**
 * LiteApp — root of the Atticus Lite (v2) retail PvP experience.
 *
 * Mounted on the `/lite` route only. The main "Micro Options" app at `/` is
 * untouched. Lite reuses the shared GlobalTheme + the global BTC price feed
 * (pricingEngine singleton) and the same pricing primitives, but ships its
 * own social + duel flow and state machine.
 */

import React from 'react';
import { LiteTheme } from './ui/LiteTheme';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LiteSessionProvider, useLiteSession } from './state/LiteSessionProvider';
import { OnboardingScreen } from './components/OnboardingScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { SwipeDeck } from './components/SwipeDeck';
import { MatchScreen } from './components/MatchScreen';
import { ResultScreen } from './components/ResultScreen';

const LiteRouter: React.FC = () => {
  const { screen } = useLiteSession();
  switch (screen) {
    case 'onboarding': return <OnboardingScreen />;
    case 'lobby': return <LobbyScreen />;
    case 'swipe': return <SwipeDeck />;
    case 'match': return <MatchScreen />;
    case 'result': return <ResultScreen />;
    default: return <LobbyScreen />;
  }
};

export const LiteApp: React.FC = () => (
  <>
    <LiteTheme />
    <ErrorBoundary fallback={<div style={{ padding: 24 }}>Atticus Lite hit a snag. Reload to retry.</div>}>
      <LiteSessionProvider>
        <LiteRouter />
      </LiteSessionProvider>
    </ErrorBoundary>
  </>
);

export default LiteApp;
