import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokens } from './theme';

test('color tokens are 6-digit hex or rgba()', () => {
  for (const [name, value] of Object.entries(tokens.color)) {
    assert.match(
      value,
      /^(#[0-9a-fA-F]{6}|rgba?\([^)]+\))$/,
      `${name}=${value} must be hex or rgba`,
    );
  }
});

test('size tokens are px-suffixed', () => {
  for (const [name, value] of Object.entries(tokens.size)) {
    assert.match(value, /^\d+px$/, `${name}=${value} must end in px`);
  }
});

test('radius and space scales are monotonic', () => {
  const radii = [tokens.radius.sm, tokens.radius.md, tokens.radius.lg].map(r =>
    parseInt(r, 10),
  );
  for (let i = 1; i < radii.length; i++) {
    assert.ok(radii[i]! > radii[i - 1]!, `radius monotonic: ${radii.join(',')}`);
  }
  const spaces = Object.values(tokens.space).map(v => parseInt(v, 10));
  for (let i = 1; i < spaces.length; i++) {
    assert.ok(spaces[i]! >= spaces[i - 1]!, `space monotonic: ${spaces.join(',')}`);
  }
});

test('up/down semantic colors are distinct from accent', () => {
  assert.notEqual(tokens.color.up, tokens.color.accent);
  assert.notEqual(tokens.color.down, tokens.color.accent);
  assert.notEqual(tokens.color.up, tokens.color.down);
});
