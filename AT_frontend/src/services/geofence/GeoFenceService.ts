/**
 * GeoFenceService — adjustable jurisdictional gating.
 *
 * The partner exchange is the system of record for KYC and primary
 * eligibility. This is a defence-in-depth gate that blocks trade entry on
 * the Atticus side when the user's resolved country is on a deny list.
 *
 * Source of country: the partner session (countryCode). PR #10 also exposes
 * an admin override toggle so ops can immediately enable / disable trading
 * platform-wide without waiting on a redeploy.
 *
 * Configuration:
 *   - VITE_GEOFENCE_DENY: comma-separated ISO-3166-1 alpha-2 codes (default: empty)
 *   - VITE_GEOFENCE_ALLOW_ONLY: optional comma-separated allowlist; if set,
 *     only these countries are eligible regardless of the deny list
 *   - admin override: stored in localStorage('atticus.geofence.override')
 */

const STORAGE_KEY = 'atticus.geofence.override';

const parseList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);

export interface GeoFenceDecision {
  allowed: boolean;
  reason?: 'denied_country' | 'not_in_allowlist' | 'admin_override';
  countryCode?: string;
}

export class GeoFenceService {
  private readonly denyList: Set<string>;
  private readonly allowOnly: Set<string>;
  private adminOverride: 'allow' | 'deny' | null = null;

  constructor(envDeny?: string, envAllowOnly?: string) {
    this.denyList = new Set(parseList(envDeny ?? this.readEnv('VITE_GEOFENCE_DENY')));
    this.allowOnly = new Set(parseList(envAllowOnly ?? this.readEnv('VITE_GEOFENCE_ALLOW_ONLY')));
    this.adminOverride = this.loadOverride();
  }

  evaluate(countryCode?: string): GeoFenceDecision {
    if (this.adminOverride === 'deny') return { allowed: false, reason: 'admin_override', countryCode };
    if (this.adminOverride === 'allow') return { allowed: true, countryCode };
    const code = (countryCode ?? '').toUpperCase();
    if (this.allowOnly.size > 0 && !this.allowOnly.has(code)) {
      return { allowed: false, reason: 'not_in_allowlist', countryCode: code };
    }
    if (this.denyList.has(code)) return { allowed: false, reason: 'denied_country', countryCode: code };
    return { allowed: true, countryCode: code };
  }

  setAdminOverride(value: 'allow' | 'deny' | null): void {
    this.adminOverride = value;
    if (typeof localStorage !== 'undefined') {
      if (value === null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, value);
    }
  }

  getAdminOverride(): 'allow' | 'deny' | null {
    return this.adminOverride;
  }

  describeConfig(): {
    denyList: string[];
    allowOnly: string[];
    adminOverride: 'allow' | 'deny' | null;
  } {
    return {
      denyList: Array.from(this.denyList),
      allowOnly: Array.from(this.allowOnly),
      adminOverride: this.adminOverride,
    };
  }

  private loadOverride(): 'allow' | 'deny' | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'allow' || raw === 'deny' ? raw : null;
  }

  private readEnv(name: string): string | undefined {
    if (typeof process !== 'undefined' && process.env && name in process.env) {
      return process.env[name];
    }
    return undefined;
  }
}

export const geoFenceService = new GeoFenceService();
