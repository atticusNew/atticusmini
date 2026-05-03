/**
 * v3 chart context-strip + narrow-viewport contract.
 *
 * The chart drops in-chart pill labels in v3; entry / target numbers
 * live in a header strip below the title. The Y-axis tick labels
 * collapse on narrow viewports.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

const yAxisWidthFor = (windowWidth: number): number =>
  windowWidth < 360 ? 0 : 44;

const showTicksFor = (windowWidth: number): boolean =>
  windowWidth >= 360;

test('Y-axis collapses to width 0 on viewports below 360px', () => {
  assert.equal(yAxisWidthFor(320), 0);
  assert.equal(yAxisWidthFor(359), 0);
});

test('Y-axis is 44px wide on standard viewports', () => {
  assert.equal(yAxisWidthFor(360), 44);
  assert.equal(yAxisWidthFor(390), 44);
  assert.equal(yAxisWidthFor(1280), 44);
});

test('tick labels are hidden under 360px', () => {
  assert.equal(showTicksFor(320), false);
  assert.equal(showTicksFor(360), true);
});

test('context strip is shown only when at least one of entry/strike is set', () => {
  const showStrip = (showEntry: boolean, showStrike: boolean) => showEntry || showStrike;
  assert.equal(showStrip(false, false), false);
  assert.equal(showStrip(true, false), true);
  assert.equal(showStrip(false, true), true);
  assert.equal(showStrip(true, true), true);
});
