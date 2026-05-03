# atticusmini

Mobile Bitcoin options trading app being revised for white-label distribution via a partner exchange.

This repository now vendors the frontend directly under `AT_frontend/` (previously a git submodule). All future changes happen in-tree.

## Layout

- `AT_frontend/` — React 18 + Vite mobile app (TypeScript, styled-components).
- `MOBILE_REVAMP_PLAN.md` — current revamp plan and PR roadmap.

## PR roadmap

See `MOBILE_REVAMP_PLAN.md`. Each PR is small, independently mergeable, and most ship behind a feature flag where they touch trader-visible flow.

## Local dev

```bash
cd AT_frontend
npm install
npm run dev
```
