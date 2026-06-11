import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectHost } from './types';

test('selectHost is deterministic and order-independent (lower id hosts)', () => {
  assert.equal(selectHost('aaa', 'bbb'), 'aaa');
  assert.equal(selectHost('bbb', 'aaa'), 'aaa');
  assert.equal(selectHost('z', 'a'), 'a');
  // Both peers, given the same pair, pick the SAME host regardless of who calls.
  const a = 'client-123';
  const b = 'client-999';
  assert.equal(selectHost(a, b), selectHost(b, a));
});
