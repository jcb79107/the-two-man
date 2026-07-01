# Production database target

This note is intentionally non-secret. It documents the production database target
that The Two Man should use and the stale target that caused the June 2026 drift
incident.

## Canonical live database

- Neon project: `gentle-cake-18017138 / neon-cinereous-planet`
- Neon branch: `br-noisy-poetry-apwbzdlv`
- Expected endpoint marker: `ep-rapid-poetry-ap42mylu`
- Expected host suffix: `c-7.us-east-1.aws.neon.tech`

Production-like environments must point database URL variables at that endpoint
and host. The runtime guardrail checks the configured DB URL variables without
printing connection strings, passwords, or full URLs.

## Do not use for live production

- `ep-soft-cell`
- `ep-soft-cell-an49z71n`
- `c-6.us-east-1.aws.neon.tech`
- `neondb_owner`

Those values indicate the stale/wrong Neon target or an owner-level credential.
If any production-like database environment variable contains one of those
markers, the app should refuse to start instead of serving stale live data.

## Validation behavior

The guardrail runs for:

- Vercel production (`VERCEL_ENV=production`)
- explicit validation (`THE_TWO_MAN_VALIDATE_PROD_DB=1`)
- production labels in `THE_TWO_MAN_ENV` or `APP_ENV`

Local development and tests are skipped unless one of those production-like
signals is present.
