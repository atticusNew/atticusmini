import React from 'react';
import { Pill } from '../ui/primitives';

/**
 * Compact "DEMO" pill suitable for the header. Replaces the full-width
 * yellow strip from PR #12 — same intent (mark this build as paper-only)
 * with far less vertical real estate.
 */
const DEMO_TOOLTIP = 'Paper book · no real trades · no real money';

export const DemoPill: React.FC = () => (
  <Pill tone="demo" title={DEMO_TOOLTIP}>
    Demo
  </Pill>
);
