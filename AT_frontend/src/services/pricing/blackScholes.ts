/**
 * Black-Scholes primitives for European options on a non-dividend asset.
 *
 * Used both as the standard option pricer and as the kernel for digital
 * (binary) approximation: a digital is ~ -∂C/∂K, computed numerically as a
 * tight call-spread (bs(K-ε) - bs(K+ε)) / (2ε).
 *
 * All math is float-based here for speed; settlement-level money math goes
 * through Decimal at higher layers.
 */

const SQRT_2 = Math.sqrt(2);

const erf = (x: number): number => {
  // Abramowitz & Stegun 7.1.26
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
};

export const normCdf = (x: number): number => 0.5 * (1 + erf(x / SQRT_2));

export interface BsArgs {
  spot: number;
  strike: number;
  /** annualized volatility, e.g. 0.6 for 60% */
  sigma: number;
  /** time to expiry in years */
  T: number;
  /** risk-free rate, default 0 for short-tenor BTC */
  r?: number;
}

const d1 = (a: BsArgs): number => {
  const r = a.r ?? 0;
  return (Math.log(a.spot / a.strike) + (r + 0.5 * a.sigma * a.sigma) * a.T) / (a.sigma * Math.sqrt(a.T));
};

const d2 = (a: BsArgs): number => d1(a) - a.sigma * Math.sqrt(a.T);

export const bsCall = (a: BsArgs): number => {
  if (a.T <= 0 || a.sigma <= 0) return Math.max(a.spot - a.strike, 0);
  const r = a.r ?? 0;
  return a.spot * normCdf(d1(a)) - a.strike * Math.exp(-r * a.T) * normCdf(d2(a));
};

export const bsPut = (a: BsArgs): number => {
  if (a.T <= 0 || a.sigma <= 0) return Math.max(a.strike - a.spot, 0);
  const r = a.r ?? 0;
  return a.strike * Math.exp(-r * a.T) * normCdf(-d2(a)) - a.spot * normCdf(-d1(a));
};

/**
 * Probability the option finishes in the money.
 * Used as the digital value (no edge applied here — the PricingService adds edge).
 */
export const digitalCallProb = (a: BsArgs): number => {
  if (a.T <= 0 || a.sigma <= 0) return a.spot > a.strike ? 1 : 0;
  return normCdf(d2(a));
};

export const digitalPutProb = (a: BsArgs): number => {
  if (a.T <= 0 || a.sigma <= 0) return a.spot < a.strike ? 1 : 0;
  return normCdf(-d2(a));
};

/**
 * European-option theoretical mark-to-market.
 * Tenor-aware: works for any T > 0.
 */
export const optionValue = (
  optionType: 'call' | 'put',
  a: BsArgs,
): number => (optionType === 'call' ? bsCall(a) : bsPut(a));
