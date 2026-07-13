# Vercel Deployment Guide

The Two Man is already connected to Vercel. Do not create a new project for
normal production work.

## Canonical Production Setup

- GitHub repo: `jcb79107/the-two-man`
- Vercel project: `the_two_man`
- Production domain: `https://www.thetwoman.site`
- Production branch: `main`
- Build command: `npx prisma generate && npx next build`

The build command is defined in `vercel.json` so Prisma Client is generated
before the Next.js build.

## Required Production Environment

Set these in Vercel Project Settings -> Environment Variables:

- `DATABASE_URL` or the Vercel/Neon Postgres aliases used by the project
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `NEXT_PUBLIC_APP_URL=https://www.thetwoman.site`
- `APP_URL=https://www.thetwoman.site`
- `THE_TWO_MAN_VALIDATE_PROD_DB=1`

Optional production variables:

- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `GOLF_COURSE_API_KEY`
- `DISABLED_UNLICENSED_SOURCES`
- `USGA_LOOKUP_SCRIPT`

The expected live Neon target is documented in `docs/production-database-target.md`.
The runtime guardrail refuses to start in production-like environments if the
configured database URL points at known stale targets.

## Local Preflight

Before deploying, start from a clean synced `main`:

```bash
git fetch origin main
git status --short
git rev-list --left-right --count main...origin/main
```

The rev-list command should print `0 0`. If it does not, sync or stop before
deploying.

Run the verification suite:

```bash
npm run lint
npm test
npm run build
```

Commit and push intended changes before production deployment:

```bash
git push origin main
```

## Production Deploy

Use the guarded deploy command:

```bash
npm run deploy:prod
```

That script checks that the current branch is `main`, the worktree is clean, and
local `main` is synced with `origin/main` before running the Vercel production
deploy.

## Database Schema Changes

This repo currently uses Prisma schema push rather than a migrations folder. For
schema changes, apply the database update intentionally before promoting code
that reads the new columns:

```bash
DATABASE_URL="production-or-branch-connection-string" npm run db:push
```

Use branch/disposable databases for rehearsal. `npm run prisma:seed` and
`npm run tournament:reset:state` are destructive and should not be run against
production unless the goal is an intentional reset.

## Post-Deploy Smoke

After deploy, check:

- `/`
- `/tournament/the-two-man-2026`
- `/tournament/the-two-man-2026/standings`
- `/tournament/the-two-man-2026/bracket`
- `/tournament/the-two-man-2026/rules`
- `/admin`
- one private match link if a safe test token is available

Then run the observability check:

```bash
npm run observability:check -- --skip-clarity
```

Run the full Clarity check only when the local Clarity token file is available.
