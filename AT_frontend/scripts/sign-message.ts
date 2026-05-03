#!/usr/bin/env ts-node --esm    // ← forces ts-node to treat this file as ESM

import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import * as bitcoinMessage from 'bitcoinjs-message';
import fs from 'node:fs';

const ECPair = ECPairFactory(ecc);

/* ----------  load the platform WIF exactly the way walletService does  ---------- */
const WIF = fs.readFileSync('./secrets/platform.wif', 'utf8').trim();   // adjust path
const keyPair = ECPair.fromWIF(WIF);

/* ----------  sign an arbitrary message  ---------- */
const message   = 'atticus-proof';
const signature = bitcoinMessage
  .sign(message, keyPair.privateKey!, keyPair.compressed)
  .toString('base64');

/* ----------  print proof  ---------- */
const address = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey }).address;
console.log('\n=== Ownership proof ===');
console.log('Address   :', address);
console.log('Message   :', message);
console.log('Signature :', signature);
console.log('\nPaste these three fields into any “Verify Bitcoin Message” tool (e.g. Electrum or Blockchair) to confirm you control the key.\n');
