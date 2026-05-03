import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hmacSha256Hex, buildSignedHeaders, canonicalQueryString } from './bybitSign';

test('hmacSha256Hex matches a known reference vector', async () => {
  // RFC 4231 test case 2: key="Jefe", data="what do ya want for nothing?"
  const sig = await hmacSha256Hex('Jefe', 'what do ya want for nothing?');
  assert.equal(sig, '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');
});

test('buildSignedHeaders produces all four V5 headers', async () => {
  const headers = await buildSignedHeaders({
    apiKey: 'KEY123',
    apiSecret: 'SECRET',
    payload: 'accountType=UNIFIED',
    nowMs: 1_700_000_000_000,
    recvWindowMs: 5000,
  });
  assert.equal(headers['X-BAPI-API-KEY'], 'KEY123');
  assert.equal(headers['X-BAPI-TIMESTAMP'], '1700000000000');
  assert.equal(headers['X-BAPI-RECV-WINDOW'], '5000');
  assert.equal(typeof headers['X-BAPI-SIGN'], 'string');
  assert.equal(headers['X-BAPI-SIGN'].length, 64); // hex sha-256
});

test('signature is deterministic for fixed inputs', async () => {
  const a = await buildSignedHeaders({
    apiKey: 'k', apiSecret: 's', payload: 'q=1', nowMs: 1, recvWindowMs: 5000,
  });
  const b = await buildSignedHeaders({
    apiKey: 'k', apiSecret: 's', payload: 'q=1', nowMs: 1, recvWindowMs: 5000,
  });
  assert.equal(a['X-BAPI-SIGN'], b['X-BAPI-SIGN']);
});

test('signature changes when timestamp changes', async () => {
  const a = await buildSignedHeaders({ apiKey: 'k', apiSecret: 's', payload: 'q=1', nowMs: 1 });
  const b = await buildSignedHeaders({ apiKey: 'k', apiSecret: 's', payload: 'q=1', nowMs: 2 });
  assert.notEqual(a['X-BAPI-SIGN'], b['X-BAPI-SIGN']);
});

test('canonicalQueryString sorts keys and url-encodes values', () => {
  assert.equal(
    canonicalQueryString({ b: '2', a: '1', c: 'a b' }),
    'a=1&b=2&c=a%20b',
  );
  assert.equal(canonicalQueryString({ a: undefined, b: '1' }), 'b=1');
});
