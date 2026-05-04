# Contributing

The Two Man uses GitHub `main` as the stable source of truth. Production deploys from `main` to the canonical domain:

https://www.thetwoman.site

## Workflow

- Start every meaningful change from the latest `main`.
- Use a short-lived branch and open a pull request before merging.
- Keep production-ready work captured in Git before deploying or moving computers.
- Review broad merges and rebases carefully. This repo previously required unrelated-history reconciliation, so history-changing work should be deliberate.

## Branch Names

Use one of these prefixes:

- `feat/<short-name>`
- `fix/<short-name>`
- `ux/<short-name>`
- `chore/<short-name>`
- `docs/<short-name>`

## Local Verification

Run these before opening or merging a PR:

```bash
npm run lint
npm test
npm run build
```

## Pull Requests

Every PR should explain:

- what changed
- why it changed
- risk level
- verification performed
- UI/UX impact, especially on mobile

CI must pass before merge. AI review comments are advisory and non-blocking.
