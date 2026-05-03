/**
 * useFirstTradeHint persistence contract.
 *
 * The hint is shown until the trader places their first trade or
 * dismisses it; the dismiss decision is sticky across reloads via
 * localStorage. SSR / no-storage environments must not throw.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIRST_TRADE_HINT_KEY, isHintDismissed } from './useFirstTradeHint';

class FakeStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  private store = new Map<string, string>();
  getItem(k: string): string | null { return this.store.get(k) ?? null; }
  setItem(k: string, v: string): void { this.store.set(k, v); }
  removeItem(k: string): void { this.store.delete(k); }
}

test('hint is visible by default (no flag)', () => {
  const s = new FakeStorage();
  assert.equal(isHintDismissed(s), false);
});

test('setting the flag hides the hint', () => {
  const s = new FakeStorage();
  s.setItem(FIRST_TRADE_HINT_KEY, '1');
  assert.equal(isHintDismissed(s), true);
});

test('the storage key is namespaced under atticus.demo', () => {
  assert.match(FIRST_TRADE_HINT_KEY, /^atticus\.demo\./);
});

test('any non-"1" value is treated as not-dismissed', () => {
  const s = new FakeStorage();
  s.setItem(FIRST_TRADE_HINT_KEY, '0');
  assert.equal(isHintDismissed(s), false);
  s.setItem(FIRST_TRADE_HINT_KEY, 'true');
  assert.equal(isHintDismissed(s), false);
});
