import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GeoFenceService } from './GeoFenceService';

test('default config allows everyone', () => {
  const g = new GeoFenceService('', '');
  assert.equal(g.evaluate('US').allowed, true);
  assert.equal(g.evaluate('AF').allowed, true);
});

test('deny list blocks listed countries case-insensitively', () => {
  const g = new GeoFenceService('IR,KP,RU', '');
  assert.equal(g.evaluate('IR').allowed, false);
  assert.equal(g.evaluate('ir').allowed, false);
  assert.equal(g.evaluate('US').allowed, true);
});

test('allow-only enforces exclusivity even if not on deny list', () => {
  const g = new GeoFenceService('', 'US,GB,SG');
  assert.equal(g.evaluate('US').allowed, true);
  assert.equal(g.evaluate('FR').allowed, false);
  assert.equal(g.evaluate('FR').reason, 'not_in_allowlist');
});

test('admin override "deny" blocks everyone regardless of config', () => {
  const g = new GeoFenceService('', 'US');
  g.setAdminOverride('deny');
  const decision = g.evaluate('US');
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'admin_override');
});

test('admin override "allow" overrides deny list', () => {
  const g = new GeoFenceService('US', '');
  g.setAdminOverride('allow');
  assert.equal(g.evaluate('US').allowed, true);
});

test('clearing admin override returns to base config', () => {
  const g = new GeoFenceService('US', '');
  g.setAdminOverride('allow');
  g.setAdminOverride(null);
  assert.equal(g.evaluate('US').allowed, false);
});

test('describeConfig surfaces the lists for ops UI', () => {
  const g = new GeoFenceService('A,B', 'C,D');
  const cfg = g.describeConfig();
  assert.deepEqual(cfg.denyList.sort(), ['A', 'B']);
  assert.deepEqual(cfg.allowOnly.sort(), ['C', 'D']);
  assert.equal(cfg.adminOverride, null);
});
