/**
 * BybitAuthClient — read-only signed calls used by the admin diagnostic.
 *
 * Intentional scope: this client only ever calls Bybit GET endpoints that
 * cannot move funds or place orders (account info, wallet balance, position
 * list). Order placement remains paper-only via BybitConnector regardless of
 * any flag in this PR.
 */

import { buildSignedHeaders, canonicalQueryString } from './bybitSign';

const MAINNET = 'https://api.bybit.com';
const TESTNET = 'https://api-testnet.bybit.com';

export interface BybitAuthConfig {
  apiKey: string;
  apiSecret: string;
  testnet?: boolean;
}

export interface BybitAccountInfo {
  reachable: boolean;
  authenticated: boolean;
  retCode?: number;
  retMsg?: string;
  accountType?: string;
  totalEquityUSD?: string;
  permissions?: string[];
}

export class BybitAuthClient {
  private readonly baseUrl: string;
  constructor(private readonly cfg: BybitAuthConfig) {
    this.baseUrl = cfg.testnet ? TESTNET : MAINNET;
  }

  /** Read-only check that creds work and pulls a wallet snapshot. */
  async getAccountInfo(): Promise<BybitAccountInfo> {
    const path = '/v5/account/wallet-balance';
    const params = { accountType: 'UNIFIED' };
    const qs = canonicalQueryString(params);
    const headers = await buildSignedHeaders({
      apiKey: this.cfg.apiKey,
      apiSecret: this.cfg.apiSecret,
      payload: qs,
    });
    let resp: Response;
    try {
      resp = await fetch(`${this.baseUrl}${path}?${qs}`, { headers: { ...headers } });
    } catch (e) {
      return { reachable: false, authenticated: false, retMsg: e instanceof Error ? e.message : 'fetch failed' };
    }
    if (!resp.ok) {
      return { reachable: true, authenticated: false, retCode: resp.status, retMsg: resp.statusText };
    }
    const data = (await resp.json()) as {
      retCode?: number;
      retMsg?: string;
      result?: { list?: Array<{ accountType?: string; totalEquity?: string }> };
    };
    if ((data.retCode ?? -1) !== 0) {
      return {
        reachable: true,
        authenticated: false,
        retCode: data.retCode,
        retMsg: data.retMsg,
      };
    }
    const account = data.result?.list?.[0];
    return {
      reachable: true,
      authenticated: true,
      retCode: data.retCode,
      retMsg: data.retMsg,
      accountType: account?.accountType,
      totalEquityUSD: account?.totalEquity,
    };
  }
}
