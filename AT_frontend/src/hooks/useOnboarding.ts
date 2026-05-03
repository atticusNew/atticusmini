import { useState, useEffect } from 'react';

const ONBOARDING_KEY = 'atticus_trading_onboarding_seen';

export const useOnboarding = (_isDemoMode: boolean = false) => {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has seen the onboarding before
    const hasSeenOnboarding = localStorage.getItem(ONBOARDING_KEY);
    
    if (!hasSeenOnboarding) {
      // Show onboarding for first-time users
      setShowOnboarding(true);
    }
  }, []);

  const handleClose = () => {
    setShowOnboarding(false);
  };

  const handleDontShowAgain = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    handleClose,
    handleDontShowAgain,
    resetOnboarding
  };
};





