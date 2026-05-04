/**
 * EarlyExitService — quotes a mid-trade sell-back price and executes the close.
 *
 * Quote = pricingService.markToMarketUSD(...) (already includes a sell-back
 * edge of 10%). Lockout windows per-tenor disable sell-back in the last few
 * seconds before expiry where round-trip cost > value.
 *
 * Execution path:
 *   1. quote() returns the live sell-back number for the UI.
 *   2. sell() calls partner.cancelTicket(refundUSD = quote) which credits the
 *      user. The LedgerWritingPartnerExchange decorator (PR #4) writes the
 *      sellback_refund_credit ledger entry.
 *
 * No partial sells; no scaling out. A ticket is either held to expiry or
 * fully bought back.
 */

import { Decimal } from 'decimal.js';
import { pricingService, type Tenor } from '../pricing/PricingService';
import { tenorToSeconds, isSupportedTenor } from '../pricing/tenor';
import { getPartnerExchange, type PartnerTicket } from '../partner';

/**
 * v5 lockout schedule. Slightly more lockout on the longer tenors so
 * the trader can't hold to t=lockout-1s and capture the ~95%-prob
 * refund. UX-invisible delta (5s vs 10s on a 3m trade is rounding
 * error) but meaningful platform protection.
 */
const LOCKOUT_SECONDS_BY_TENOR: Record<Tenor, number> = {
  '30s': 5,
  '1m': 5,
  '2m': 8,
  '3m': 10,
};

export interface SellbackQuote {
  ticketId: number;
  available: boolean;
  reason?: string;
  refundUSD: Decimal;
  premiumUSD: Decimal;
  pnlUSD: Decimal;
  secondsRemaining: number;
  /**
   * Seconds until the sell-back lockout window starts. Negative once
   * the ticket is inside the lockout (sell-back already disabled).
   * Always 0 for legacy / non-supported tenors.
   */
  secondsUntilLockout: number;
  asOf: number;
}

export interface SellArgs {
  ticketId: number;
  spotUSD: number;
  idempotencyKey: string;
}

export class EarlyExitService {
  quote(ticket: PartnerTicket, spotUSD: number, nowMs: number = Date.now()): SellbackQuote {
    const tenor = ticket.tenor;
    const tenorSec = tenorToSeconds(tenor);
    const elapsedSec = Math.max(0, Math.floor((nowMs - ticket.openedAt) / 1000));
    const secondsRemaining = Math.max(0, tenorSec - elapsedSec);

    if (ticket.status !== 'active') {
      return {
        ticketId: ticket.id,
        available: false,
        reason: 'ticket not active',
        refundUSD: new Decimal(0),
        premiumUSD: ticket.premiumUSD,
        pnlUSD: new Decimal(0),
        secondsRemaining: 0,
        secondsUntilLockout: 0,
        asOf: nowMs,
      };
    }

    if (!isSupportedTenor(tenor)) {
      return {
        ticketId: ticket.id,
        available: false,
        reason: 'sell-back not supported on legacy tenor',
        refundUSD: new Decimal(0),
        premiumUSD: ticket.premiumUSD,
        pnlUSD: new Decimal(0).minus(ticket.premiumUSD),
        secondsRemaining,
        secondsUntilLockout: 0,
        asOf: nowMs,
      };
    }

    const lockout = LOCKOUT_SECONDS_BY_TENOR[tenor];
    const secondsUntilLockout = secondsRemaining - lockout;
    if (secondsRemaining <= lockout) {
      return {
        ticketId: ticket.id,
        available: false,
        reason: `locked out: ${lockout}s before expiry`,
        refundUSD: new Decimal(0),
        premiumUSD: ticket.premiumUSD,
        pnlUSD: new Decimal(0),
        secondsRemaining,
        secondsUntilLockout,
        asOf: nowMs,
      };
    }

    const refund = pricingService.markToMarketUSD({
      optionType: ticket.optionType,
      spotUSD,
      strikeUSD: ticket.strikePriceUSD.toNumber(),
      tenor,
      secondsRemaining,
      contracts: ticket.contracts,
    });

    return {
      ticketId: ticket.id,
      available: true,
      refundUSD: refund,
      premiumUSD: ticket.premiumUSD,
      pnlUSD: refund.minus(ticket.premiumUSD),
      secondsRemaining,
      secondsUntilLockout,
      asOf: nowMs,
    };
  }

  async sell(args: SellArgs): Promise<{ ok: PartnerTicket } | { err: string }> {
    const partner = getPartnerExchange();
    const ticket = await partner.getTicket(args.ticketId);
    if (!ticket) return { err: 'ticket not found' };
    const q = this.quote(ticket, args.spotUSD);
    if (!q.available) return { err: q.reason ?? 'sell-back unavailable' };

    return partner.cancelTicket({
      ticketId: args.ticketId,
      reason: 'user_sellback',
      refundUSD: q.refundUSD,
      idempotencyKey: args.idempotencyKey,
    });
  }
}

export const earlyExitService = new EarlyExitService();
