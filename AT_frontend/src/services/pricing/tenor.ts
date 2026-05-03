/**
 * Helpers for parsing trader-facing tenor strings ('30s', '1m', '5m', '15m', '1h')
 * into seconds. Centralized so countdown / timer / pricer all agree.
 */

import { TENOR_TO_SECONDS, type Tenor } from './PricingService';

export const tenorToSeconds = (tenor: string): number => {
  if (tenor in TENOR_TO_SECONDS) {
    return TENOR_TO_SECONDS[tenor as Tenor];
  }
  if (tenor.endsWith('s')) return parseInt(tenor.slice(0, -1), 10) || 0;
  if (tenor.endsWith('m')) return (parseInt(tenor.slice(0, -1), 10) || 0) * 60;
  if (tenor.endsWith('h')) return (parseInt(tenor.slice(0, -1), 10) || 0) * 3600;
  return 0;
};

export const isSupportedTenor = (tenor: string): tenor is Tenor =>
  ['30s', '1m', '5m', '15m', '1h'].includes(tenor);
