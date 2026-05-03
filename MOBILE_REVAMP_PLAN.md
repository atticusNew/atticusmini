# Atticus Mobile Options — Revamp Plan

## Direction

- White-labeled to a partner exchange (likely Foxify). Partner handles KYC + custody.
- Strip ICP / DFINITY / on-chain settlement / threshold-sig BTC custody from the app.
- Coinbase remains the live-price source.
- Net-aggregate hedging on Bybit (primary) and OKX (scaffold) — never per-ticket.
- **Sell-back / early exit on every ticket** is the defining product feature.
- Tenor ladder: **30s, 1m, 5m, 15m, 1h** (5s and 10s removed).
- Fixed-payout binary UX kept; under the hood pricing is BS-digital + edge.
- Internal Postgres event ledger; T+1 daily reconcile with partner.
- Adjustable geo-fence.

## Tenor ladder

| Tenor | Sell-back enabled | Min sell-back lockout (last seconds) |
|---|---|---|
| 30s | yes | last 5s |
| 1m | yes | last 5s |
| 5m | yes | last 10s |
| 15m | yes | last 15s |
| 1h | yes | last 30s |

## Hedging risk budget (env-overridable)

| Phase | Trigger | Daily hedge-cost cap |
|---|---|---|
| Bootstrap | First 30 days | $500/day |
| Ramp | Hedge-error within ±15% for 14 consecutive days | $2,500/day |
| Scale | Hedge-error within ±10% for 30 days, monthly flow >$10M | $10,000/day, anchored to 0.5% of trailing 30d flow |

Cost cap covers fees + slippage + realized hedging error.

## Ledger / reconcile

- Postgres source of truth (in-memory fallback for dev).
- Two append-only ledgers:
  - `trader_ledger` — credits/debits keyed by `partner_user_id` + monotonic sequence + idempotency key.
  - `hedge_ledger` — venue fills tagged with the time-bucket they hedged.
- Reconcile cadence: T+1 daily export to partner (signed CSV/JSON).
- Internal P&L check: trader_ledger net + hedge_ledger net should equal expected edge ± hedge slippage.

## PR roadmap (10 PRs)

| # | Branch | Scope |
|---|---|---|
| 1 | `cursor/repo-hygiene-8958` | Vendor `AT_frontend` from submodule. Drop dead components, legacy `.mo`, debug HTML, ICP docs. |
| 2 | `cursor/strip-icp-layer-8958` | Remove `@dfinity/*` deps, all `.mo`, dfx config, principal-derived auth, walletService, TreasuryService. App boots against a `MockPartnerExchange`. |
| 3 | `cursor/partner-exchange-adapter-8958` | `PartnerExchangeAdapter` interface + mock. Replace `BalanceProvider` and trade placement with adapter calls. |
| 4 | `cursor/ledger-service-8958` | Postgres-backed `LedgerService` with idempotency + reconcile-export CLI. In-memory fallback. |
| 5 | `cursor/pricing-service-bs-digital-8958` | BS digital pricer + realized-vol EMA + edge model. Legacy fixed-table behind a kill-switch flag. |
| 6 | `cursor/tenor-ladder-30s-1h-8958` | 30s/1m/5m/15m/1h. Chart auto-zoom. Drop 5s/10s. |
| 7 | `cursor/sellback-mtm-8958` | `MarkToMarketService` + `EarlyExitService` + sell-back UI card. |
| 8 | `cursor/active-tickets-screen-8958` | Multi-position list + one-tap trade-again. Kill predict button + `BestOddsPredictor`. |
| 9 | `cursor/hedging-engine-v0-8958` | `ExposureAggregator` + `NetDeltaTargeter` + `DailyBudgetCap` + `CircuitBreaker` + Bybit adapter (read-only) + OKX scaffold. Behind feature flag. |
| 10 | `cursor/geofence-and-admin-8958` | `GeoFenceService` (env allowlist + admin toggle) + thin admin page. |

Each PR: ~5–10 focused tests max, single `tsc --noEmit` run, ready to merge (not draft).

## Decisions locked

- Drop 5s and 10s permanently.
- Bybit primary hedge venue, OKX scaffold.
- Ledger in Postgres (SQLite acceptable for pilot if simpler).
- Geo-fence env-driven, admin override.

## Open later

- Foxify API spec when available — implement `FoxifyExchangeAdapter` against `PartnerExchangeAdapter` interface.
- Production OKX adapter once Bybit is stable.
- IV surface (post-MVP; not needed for digital pricing).
