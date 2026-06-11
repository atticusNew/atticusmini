/**
 * liteWallet — funding + balance for Atticus Lite.
 *
 * IMPORTANT: the real deposit/withdraw transaction flow is NOT specified yet.
 * This module is the seam where it will land. For now it is a localStorage
 * paper wallet so the duel loop is fully playable end-to-end. Everything is
 * routed through the `LiteWallet` interface so a partner-exchange /
 * on-chain implementation can replace it without touching UI/match code.
 *
 * Financial values are kept as plain numbers here for the demo paper book;
 * a production implementation should use Decimal end-to-end (as the main app
 * does via decimal.js) and reconcile against the partner ledger.
 */

const STORAGE_KEY = 'atticus.lite.wallet.v1';
const STARTING_BALANCE_USD = 1000;

const isBrowser = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export interface LiteWallet {
  getBalance(): number;
  /** Deposit funds. Placeholder until the real transaction flow is defined. */
  deposit(amountUSD: number): number;
  /** Withdraw funds. Placeholder until the real transaction flow is defined. */
  withdraw(amountUSD: number): number;
  /** Apply a net match result (option PnL + wager transfer) to the balance. */
  applyMatchResult(netUSD: number): number;
  reset(): void;
}

class LocalPaperWallet implements LiteWallet {
  private read(): number {
    if (!isBrowser()) return STARTING_BALANCE_USD;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null) return STARTING_BALANCE_USD;
    const n = Number(raw);
    return Number.isFinite(n) ? n : STARTING_BALANCE_USD;
  }

  private write(n: number): number {
    const next = Math.max(0, Math.round(n * 100) / 100);
    if (isBrowser()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
    }
    return next;
  }

  getBalance(): number {
    return this.read();
  }

  deposit(amountUSD: number): number {
    if (!(amountUSD > 0)) return this.read();
    return this.write(this.read() + amountUSD);
  }

  withdraw(amountUSD: number): number {
    if (!(amountUSD > 0)) return this.read();
    return this.write(this.read() - amountUSD);
  }

  applyMatchResult(netUSD: number): number {
    return this.write(this.read() + netUSD);
  }

  reset(): void {
    this.write(STARTING_BALANCE_USD);
  }
}

export const liteWallet: LiteWallet = new LocalPaperWallet();
