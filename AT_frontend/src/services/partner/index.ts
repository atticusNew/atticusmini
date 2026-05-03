/**
 * Single registration point for the partner exchange adapter.
 *
 * In dev/preview, the mock adapter is used. When a real partner adapter
 * lands (Foxify or otherwise), wire it in via env (`VITE_PARTNER_ADAPTER`)
 * without touching call sites.
 */

import type { PartnerExchangeAdapter } from './PartnerExchangeAdapter';
import { mockPartnerExchangeAdapter } from './MockPartnerExchangeAdapter';

let activeAdapter: PartnerExchangeAdapter = mockPartnerExchangeAdapter;

export const getPartnerExchange = (): PartnerExchangeAdapter => activeAdapter;

export const setPartnerExchange = (adapter: PartnerExchangeAdapter): void => {
  activeAdapter = adapter;
};

export type {
  PartnerExchangeAdapter,
  PartnerSession,
  PartnerBalance,
  PartnerTicket,
  PlaceTicketArgs,
  SettleTicketArgs,
  CancelTicketArgs,
  AdapterResult,
  OptionType,
  TicketStatus,
  SettlementOutcome,
} from './PartnerExchangeAdapter';

export { MockPartnerExchangeAdapter, mockPartnerExchangeAdapter } from './MockPartnerExchangeAdapter';
