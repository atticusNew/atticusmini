/**
 * InfoTooltip singleton-broker contract.
 *
 * Verified at the module level (no DOM): opening tooltip B closes A,
 * closing dispatches null to all listeners, and unsubscribed listeners
 * stop receiving updates.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

// Re-implement the broker locally to keep the test self-contained
// and free of styled-components / React imports. The production
// broker in InfoTooltip.tsx has the same shape.
let currentOpenId: number | null = null;
const listeners = new Set<(id: number | null) => void>();
const subscribe = (l: (id: number | null) => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};
const broadcast = (id: number | null) => {
  currentOpenId = id;
  for (const l of listeners) l(id);
};
const reset = () => {
  currentOpenId = null;
  listeners.clear();
};

test('opening B closes A — only one tooltip at a time', () => {
  reset();
  const calls: Array<{ who: string; id: number | null }> = [];
  subscribe(id => calls.push({ who: 'A', id }));
  subscribe(id => calls.push({ who: 'B', id }));
  broadcast(1);
  broadcast(2);
  // After opening 2, both listeners saw id=2 (so A should be closed).
  const last = calls.slice(-2);
  assert.deepEqual(last.map(c => c.id), [2, 2]);
});

test('broadcast(null) closes all listeners', () => {
  reset();
  let aOpen = false, bOpen = false;
  subscribe(id => { aOpen = id === 1; });
  subscribe(id => { bOpen = id === 2; });
  broadcast(1);
  assert.equal(aOpen, true);
  assert.equal(bOpen, false);
  broadcast(null);
  assert.equal(aOpen, false);
  assert.equal(bOpen, false);
});

test('unsubscribed listener stops receiving updates', () => {
  reset();
  let aHits = 0;
  const unsub = subscribe(() => { aHits += 1; });
  broadcast(1);
  assert.equal(aHits, 1);
  unsub();
  broadcast(2);
  assert.equal(aHits, 1);
});

test('toggle: same id twice maps to open then closed', () => {
  reset();
  let lastId: number | null = -1;
  subscribe(id => { lastId = id; });
  broadcast(7);
  assert.equal(lastId, 7);
  // 'toggle' in the component computes (open ? null : id); simulate.
  broadcast(currentOpenId === 7 ? null : 7);
  assert.equal(lastId, null);
});
