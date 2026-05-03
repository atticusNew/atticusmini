/**
 * Auto-scroll-on-place trigger contract.
 *
 * The trigger fires on touch-primary devices OR when the viewport is
 * shorter than ~700px. Laptops with a tall window are left alone.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

const shouldScroll = (args: { touchPrimary: boolean; viewportHeight: number }): boolean => {
  return args.touchPrimary || args.viewportHeight < 700;
};

test('touch-primary device always scrolls', () => {
  assert.equal(shouldScroll({ touchPrimary: true, viewportHeight: 1080 }), true);
  assert.equal(shouldScroll({ touchPrimary: true, viewportHeight: 600 }), true);
});

test('short viewport scrolls even on mouse-primary devices', () => {
  assert.equal(shouldScroll({ touchPrimary: false, viewportHeight: 600 }), true);
});

test('tall mouse-primary viewport does not scroll', () => {
  assert.equal(shouldScroll({ touchPrimary: false, viewportHeight: 1080 }), false);
});

test('boundary at exactly 700px is treated as tall enough', () => {
  assert.equal(shouldScroll({ touchPrimary: false, viewportHeight: 700 }), false);
  assert.equal(shouldScroll({ touchPrimary: false, viewportHeight: 699 }), true);
});
