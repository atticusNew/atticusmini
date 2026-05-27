/**
 * GA4 analytics — loaded only when VITE_GA_MEASUREMENT_ID is set (Render env).
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();

let initialized = false;

export function initAnalytics(): void {
  if (initialized || !MEASUREMENT_ID || typeof window === 'undefined') return;
  initialized = true;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', MEASUREMENT_ID, { send_page_view: true });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
  document.head.appendChild(script);
}

export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean | undefined>,
): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  const clean: Record<string, string | number | boolean> = {};
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) clean[key] = value;
    }
  }
  window.gtag('event', name, clean);
}

export interface TradeExecutedParams {
  option_type: 'call' | 'put';
  expiry: string;
  contracts: number;
  stake_usd: number;
  demo_mode: boolean;
}

export function trackTradeExecuted(params: TradeExecutedParams): void {
  trackEvent('trade_executed', {
    option_type: params.option_type,
    expiry: params.expiry,
    contracts: params.contracts,
    value: params.stake_usd,
    demo_mode: params.demo_mode,
  });
}

export function trackTradeSettled(params: {
  outcome: 'win' | 'loss' | 'tie';
  option_type: 'call' | 'put';
  expiry: string;
  profit_usd: number;
  demo_mode: boolean;
}): void {
  trackEvent('trade_settled', {
    outcome: params.outcome,
    option_type: params.option_type,
    expiry: params.expiry,
    value: Math.abs(params.profit_usd),
    demo_mode: params.demo_mode,
  });
}

export function trackTradeError(params: {
  stage: 'place' | 'settlement' | 'sellback';
  message: string;
  demo_mode: boolean;
}): void {
  trackEvent('trade_error', {
    stage: params.stage,
    error_message: params.message.slice(0, 120),
    demo_mode: params.demo_mode,
  });
}

export function trackTradeSellback(params: {
  ticket_id: number;
  refund_usd: number;
  demo_mode: boolean;
}): void {
  trackEvent('trade_sellback', {
    ticket_id: params.ticket_id,
    value: params.refund_usd,
    demo_mode: params.demo_mode,
  });
}

export function trackDemoReset(): void {
  trackEvent('demo_reset', { demo_mode: true });
}
