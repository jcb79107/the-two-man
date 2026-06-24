# Observability Runbook

Use this before and during tournament windows to check whether production is healthy.

## Command

```bash
npm run observability:check
```

The command checks:

- the current Sentry release for new issue groups
- production Sentry issues seen in the last 24 hours
- production Sentry error aggregates in the last 24 hours
- Microsoft Clarity URL-level UX signals for the last 1-3 days when a Clarity token is available

The command exits non-zero for hard failure signals:

- Sentry issues attached to the checked release
- unresolved production Sentry issues seen in the last 24 hours
- production Sentry error aggregate rows in the last 24 hours
- Clarity script errors, error clicks, or rage clicks

It prints watch items, but does not fail, for low-volume Clarity dead clicks and quickbacks because the Data Export API does not include the exact click target. Use Clarity recordings or heatmaps to investigate those.

## Credentials

Sentry uses the local Sentry CLI login:

```bash
sentry auth login
```

Clarity uses a local-only env file outside the repo:

```bash
/private/tmp/the-two-man-observability.env
```

Expected contents:

```bash
export CLARITY_API_TOKEN='...'
```

The Clarity token is optional. If it is missing, the command still checks Sentry and reports Clarity as skipped.

## Useful Options

```bash
npm run observability:check -- --skip-clarity
npm run observability:check -- --skip-sentry
npm run observability:check -- --days 1
npm run observability:check -- --release <sentry-release-sha>
```

Clarity only exports the last 1-3 days and is capped at 10 API requests per project per day. The check uses one Clarity request by default.
