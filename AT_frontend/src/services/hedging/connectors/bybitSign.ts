/**
 * Bybit V5 HMAC-SHA256 signing for browser environments.
 *
 * Reference: https://bybit-exchange.github.io/docs/v5/guide#authentication
 * Signature pre-image: timestampMs + apiKey + recvWindow + payload
 *   - GET: payload is the canonical query string (without `?`)
 *   - POST: payload is the JSON-encoded body
 */

const ENCODER = new TextEncoder();

const subtle = (): SubtleCrypto => {
  if (typeof globalThis !== 'undefined' && (globalThis as { crypto?: Crypto }).crypto?.subtle) {
    return (globalThis as { crypto: Crypto }).crypto.subtle;
  }
  // Node 18+ may need an explicit require for the webcrypto API
  if (typeof process !== 'undefined' && process.versions?.node) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const nodeCrypto = require('node:crypto') as { webcrypto?: { subtle: SubtleCrypto } };
    if (nodeCrypto.webcrypto?.subtle) return nodeCrypto.webcrypto.subtle;
  }
  throw new Error('SubtleCrypto unavailable');
};

const toHex = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
};

export const hmacSha256Hex = async (secret: string, message: string): Promise<string> => {
  const key = await subtle().importKey(
    'raw',
    ENCODER.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await subtle().sign('HMAC', key, ENCODER.encode(message));
  return toHex(sig);
};

export interface SignedHeaders {
  'X-BAPI-API-KEY': string;
  'X-BAPI-TIMESTAMP': string;
  'X-BAPI-RECV-WINDOW': string;
  'X-BAPI-SIGN': string;
}

export const buildSignedHeaders = async (args: {
  apiKey: string;
  apiSecret: string;
  payload: string;
  recvWindowMs?: number;
  nowMs?: number;
}): Promise<SignedHeaders> => {
  const recvWindow = String(args.recvWindowMs ?? 5_000);
  const ts = String(args.nowMs ?? Date.now());
  const preImage = ts + args.apiKey + recvWindow + args.payload;
  const sign = await hmacSha256Hex(args.apiSecret, preImage);
  return {
    'X-BAPI-API-KEY': args.apiKey,
    'X-BAPI-TIMESTAMP': ts,
    'X-BAPI-RECV-WINDOW': recvWindow,
    'X-BAPI-SIGN': sign,
  };
};

export const canonicalQueryString = (params: Record<string, string | number | undefined>): string => {
  const keys = Object.keys(params)
    .filter(k => params[k] !== undefined)
    .sort();
  return keys.map(k => `${k}=${encodeURIComponent(String(params[k]))}`).join('&');
};
