/**
 * ExposureAggregator — computes the platform's net BTC delta against the
 * open trader book.
 *
 * Per ticket delta is approximated by the digital-pricer's probability of
 * finishing in the money times the notional (contracts × $1 / spot for
 * the BTC representation), signed by option type.
 *
 * Calls are nets only; per-ticket hedging is never appropriate.
 */

import { Decimal } from 'decimal.js';
import type { PartnerTicket, PartnerExchangeAdapter } from '../partner';
import { digitalCallProb, digitalPutProb } from '../pricing/blackScholes';
import { tenorToSeconds } from '../pricing/tenor';
import type { NetExposureSnapshot } from './types';

const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

const ticketDeltaBTC = (ticket: PartnerTicket, spotUSD: number, sigma: number, nowMs: number): Decimal => {
  const tenorSec = tenorToSeconds(ticket.tenor);
  const elapsed = Math.max(0, Math.floor((nowMs - ticket.openedAt) / 1000));
  const remainingSec = Math.max(1, tenorSec - elapsed);
  const T = remainingSec / SECONDS_PER_YEAR;
  const args = { spot: spotUSD, strike: ticket.strikePriceUSD.toNumber(), sigma: Math.max(sigma, 0.05), T };
  const prob = ticket.optionType === 'call' ? digitalCallProb(args) : digitalPutProb(args);
  // Each contract = $1 stake; payout is approximately 1/prob × premium when ITM.
  // Platform delta in USD ≈ (sign) × prob × payout-if-itm. Approximate per-ticket as
  // (sign) × contracts × 1 (since premium = contracts*$1, expected platform liability = prob*payout ≈ 1).
  const sign = ticket.optionType === 'call' ? 1 : -1;
  const deltaUSD = new Decimal(prob * sign * ticket.contracts);
  return spotUSD > 0 ? deltaUSD.div(spotUSD) : new Decimal(0);
};

export class ExposureAggregator {
  constructor(private readonly partner: PartnerExchangeAdapter) {}

  async snapshot(activeUserIds: string[], spotUSD: number, sigma: number): Promise<NetExposureSnapshot> {
    const now = Date.now();
    let net = new Decimal(0);
    let gross = new Decimal(0);
    let count = 0;
    for (const userId of activeUserIds) {
      const tickets = await this.partner.getUserTickets(userId);
      for (const t of tickets) {
        if (t.status !== 'active') continue;
        const d = ticketDeltaBTC(t, spotUSD, sigma, now);
        net = net.plus(d);
        gross = gross.plus(d.abs());
        count += 1;
      }
    }
    return { asOf: now, spotUSD, netDeltaBTC: net, grossNotionalBTC: gross, ticketCount: count };
  }
}
