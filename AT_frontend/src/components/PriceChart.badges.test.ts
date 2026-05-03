/**
 * Chart line-badge anti-collision contract.
 *
 * The chart's entry + strike badges sit on top of horizontal reference
 * lines. When the lines are within ~22px the badges would overlap and
 * become unreadable; we push them apart around their midpoint.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

interface Item { y: number; key: string; }

const COLLIDE_PX = 22;
const SPLIT_PX = 12;

const antiCollide = (items: Item[]): Item[] => {
  if (items.length !== 2) return items;
  const [a, b] = items as [Item, Item];
  const gap = Math.abs(a.y - b.y);
  if (gap >= COLLIDE_PX) return items;
  const mid = (a.y + b.y) / 2;
  const sign = a.y <= b.y ? -1 : 1;
  return [
    { ...a, y: mid + sign * SPLIT_PX },
    { ...b, y: mid - sign * SPLIT_PX },
  ];
};

const yToPx = (v: number, yMin: number, yMax: number, plotTop: number, plotH: number) =>
  plotTop + (1 - (v - yMin) / Math.max(1e-9, yMax - yMin)) * plotH;

test('badges far apart are left untouched', () => {
  const out = antiCollide([{ y: 30, key: 'entry' }, { y: 200, key: 'strike' }]);
  assert.equal(out[0]!.y, 30);
  assert.equal(out[1]!.y, 200);
});

test('badges within 22px are split around their midpoint', () => {
  const out = antiCollide([{ y: 100, key: 'entry' }, { y: 110, key: 'strike' }]);
  // mid = 105; entry (lower y) goes up by 12 → 93, strike (higher y) goes down by 12 → 117
  assert.equal(out[0]!.y, 93);
  assert.equal(out[1]!.y, 117);
});

test('split is symmetric regardless of which item is on top', () => {
  const out = antiCollide([{ y: 110, key: 'entry' }, { y: 100, key: 'strike' }]);
  assert.equal(out[0]!.y, 117);
  assert.equal(out[1]!.y, 93);
});

test('yToPx maps domain min to bottom and max to top of plot area', () => {
  const yMin = 67_400, yMax = 67_500, plotTop = 8, plotH = 200;
  assert.equal(yToPx(yMax, yMin, yMax, plotTop, plotH), plotTop);
  assert.equal(yToPx(yMin, yMin, yMax, plotTop, plotH), plotTop + plotH);
  // midpoint
  assert.equal(yToPx(67_450, yMin, yMax, plotTop, plotH), plotTop + plotH / 2);
});

test('single-item lists are returned as-is', () => {
  const out = antiCollide([{ y: 50, key: 'entry' }]);
  assert.equal(out.length, 1);
  assert.equal(out[0]!.y, 50);
});
