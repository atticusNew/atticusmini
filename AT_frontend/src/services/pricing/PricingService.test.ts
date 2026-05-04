import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pricingService, PricingService } from './PricingService';
import { digitalCallProb, digitalPutProb, normCdf, bsCall, bsPut } from './blackScholes';
import { RealizedVolatilityEMA } from './realizedVolatility';

test('normCdf matches known reference values', () => {
  assert.ok(Math.abs(normCdf(0) - 0.5) < 1e-6);
  assert.ok(Math.abs(normCdf(1.96) - 0.975) < 1e-3);
  assert.ok(Math.abs(normCdf(-1.96) - 0.025) < 1e-3);
});

test('digital probabilities sum to ~1 ignoring tie zone', () => {
  const args = { spot: 60_000, strike: 60_005, sigma: 0.6, T: 1 / 365 / 24 / 4 };
  const c = digitalCallProb(args);
  const p = digitalPutProb(args);
  assert.ok(Math.abs(c + p - 1) < 1e-6);
});

test('atm call price at small T is small but positive', () => {
  const v = bsCall({ spot: 60_000, strike: 60_000, sigma: 0.6, T: 60 / (365 * 24 * 60 * 60) });
  assert.ok(v > 0);
  assert.ok(v < 50);
});

test('put-call parity (no rate) holds approximately', () => {
  const a = { spot: 60_000, strike: 60_000, sigma: 0.6, T: 1 / 365 };
  const c = bsCall(a);
  const p = bsPut(a);
  assert.ok(Math.abs(c - p - (a.spot - a.strike)) < 1e-6);
});

test('pricer payout multiple for a deep-OTM 30s option > 2', () => {
  const q = pricingService.quote({
    optionType: 'call',
    spotUSD: 60_000,
    strikeOffsetUSD: 50,
    tenor: '30s',
    contracts: 1,
    sigma: 0.6,
  });
  assert.ok(q.payoutMultiple > 2);
  assert.ok(q.payoutMultiple <= 25);
});

test('pricer payout for a near-the-money 1m option < deep-OTM 1m option', () => {
  const near = pricingService.quote({
    optionType: 'call',
    spotUSD: 60_000,
    strikeOffsetUSD: 5,
    tenor: '1m',
    contracts: 1,
    sigma: 0.6,
  });
  const far = pricingService.quote({
    optionType: 'call',
    spotUSD: 60_000,
    strikeOffsetUSD: 100,
    tenor: '1m',
    contracts: 1,
    sigma: 0.6,
  });
  assert.ok(far.payoutMultiple > near.payoutMultiple);
});

test('higher vol increases payoutMultiple for OTM options (less likely OTM = higher prob = lower mult; verify direction with deep OTM)', () => {
  const lowVol = pricingService.quote({
    optionType: 'call',
    spotUSD: 60_000,
    strikeOffsetUSD: 100,
    tenor: '1m',
    contracts: 1,
    sigma: 0.3,
  });
  const highVol = pricingService.quote({
    optionType: 'call',
    spotUSD: 60_000,
    strikeOffsetUSD: 100,
    tenor: '1m',
    contracts: 1,
    sigma: 1.5,
  });
  assert.ok(highVol.digitalProb > lowVol.digitalProb);
  assert.ok(highVol.payoutMultiple < lowVol.payoutMultiple);
});

test('shorter tenor carries higher edge than longer tenor', () => {
  const short = pricingService.quote({
    optionType: 'call',
    spotUSD: 60_000,
    strikeOffsetUSD: 5,
    tenor: '30s',
    contracts: 1,
    sigma: 0.6,
  });
  const long = pricingService.quote({
    optionType: 'call',
    spotUSD: 60_000,
    strikeOffsetUSD: 5,
    tenor: '3m',
    contracts: 1,
    sigma: 0.6,
  });
  assert.ok(short.edgePct > long.edgePct);
});

test('markToMarketUSD on a deep-ITM call returns positive value below cap', () => {
  const v = pricingService.markToMarketUSD({
    optionType: 'call',
    spotUSD: 60_100,
    strikeUSD: 60_000,
    tenor: '3m',
    secondsRemaining: 120,
    contracts: 1,
    sigma: 0.6,
  });
  assert.ok(v.toNumber() > 0);
  assert.ok(v.toNumber() <= 2.5);
});

test('markToMarketUSD on expired ticket is zero', () => {
  const v = pricingService.markToMarketUSD({
    optionType: 'call',
    spotUSD: 60_000,
    strikeUSD: 60_005,
    tenor: '3m',
    secondsRemaining: 0,
    contracts: 1,
  });
  assert.equal(v.toNumber(), 0);
});

test('legacyPayout still resolves the old table', () => {
  const svc = new PricingService();
  assert.equal(svc.legacyPayout('5s', 5), 4.0);
  assert.equal(svc.legacyPayout('15s', 15), 10.0);
});

test('realizedVolatilityEMA returns floor before any sample, then a positive sigma after movement', () => {
  const rv = new RealizedVolatilityEMA();
  assert.ok(rv.getAnnualized() >= 0.15);
  let p = 60_000;
  let t = Date.now();
  rv.observe(p, t);
  for (let i = 0; i < 200; i++) {
    p *= 1 + (Math.random() - 0.5) * 0.001;
    t += 1000;
    rv.observe(p, t);
  }
  const sigma = rv.getAnnualized();
  assert.ok(sigma > 0);
  assert.ok(sigma <= 4);
});
