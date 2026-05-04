import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tenorToSeconds, isSupportedTenor } from './tenor';

test('canonical tenors resolve to seconds', () => {
  assert.equal(tenorToSeconds('30s'), 30);
  assert.equal(tenorToSeconds('1m'), 60);
  assert.equal(tenorToSeconds('2m'), 120);
  assert.equal(tenorToSeconds('3m'), 180);
});

test('legacy tenors still parse via the string fallback', () => {
  assert.equal(tenorToSeconds('5s'), 5);
  assert.equal(tenorToSeconds('10s'), 10);
  assert.equal(tenorToSeconds('5m'), 300);
  assert.equal(tenorToSeconds('15m'), 900);
  assert.equal(tenorToSeconds('1h'), 3600);
});

test('isSupportedTenor only accepts the v5 ladder', () => {
  assert.ok(isSupportedTenor('30s'));
  assert.ok(isSupportedTenor('1m'));
  assert.ok(isSupportedTenor('2m'));
  assert.ok(isSupportedTenor('3m'));
  assert.ok(!isSupportedTenor('5m'));
  assert.ok(!isSupportedTenor('15m'));
  assert.ok(!isSupportedTenor('1h'));
  assert.ok(!isSupportedTenor('5s'));
  assert.ok(!isSupportedTenor('garbage'));
});

test('unknown tenor returns 0 seconds (caller must validate)', () => {
  assert.equal(tenorToSeconds('garbage'), 0);
  assert.equal(tenorToSeconds(''), 0);
});
