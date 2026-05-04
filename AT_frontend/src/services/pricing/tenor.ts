/**
 * Helpers for parsing trader-facing tenor strings into seconds.
 *
 * v5: live ladder is `30s · 1m · 2m · 3m`. The string parser still
 * accepts arbitrary `Ns / Nm / Nh` so settlement / sell-back keep
 * working for any tickets created against legacy tenors before the
 * cutover.
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
  ['30s', '1m', '2m', '3m'].includes(tenor);
