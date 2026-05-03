import { test } from 'node:test';
import assert from 'node:assert/strict';

const formatRemaining = (s: number): string => {
  if (s < 60) return `${s}s`;
  if (s < 3600) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
};

test('formats sub-minute countdowns as Ns', () => {
  assert.equal(formatRemaining(0), '0s');
  assert.equal(formatRemaining(7), '7s');
  assert.equal(formatRemaining(59), '59s');
});

test('formats minute-scale countdowns as M:SS', () => {
  assert.equal(formatRemaining(60), '1:00');
  assert.equal(formatRemaining(125), '2:05');
  assert.equal(formatRemaining(3599), '59:59');
});

test('formats hour-scale countdowns as H:MM', () => {
  assert.equal(formatRemaining(3600), '1:00');
  assert.equal(formatRemaining(3660), '1:01');
});
