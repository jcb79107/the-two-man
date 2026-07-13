# The Two Man

Mobile-first tournament operations app for the 2026 Two Man golf tournament.

The live production site is https://www.thetwoman.site. The source of truth is
`origin/main` on https://github.com/jcb79107/the-two-man, deployed to the
existing Vercel project `the_two_man`.

## What The App Does

- Public tournament hub with activity feed, standings, bracket, rules, and match result pages
- Pod-play standings for 18 teams across 6 pods, including hole points, holes won, and playoff qualification
- Playoff bracket mode for quarterfinals, semifinals, and championship advancement
- Private tokenized scorecard/setup links for pod matches
- Simple playoff result posting from the commissioner/admin surface
- Commissioner dashboard for match ops, invites, scorecard status, overrides, forfeits, bracket sync, and graphics
- Server-rendered Instagram recap graphics for match results
- Course and tee lookup through stored catalog data, curated fallbacks, and optional provider integrations
- Sentry and Vercel Speed Insights instrumentation, with URL/token scrubbing for private match links
- Production database guardrail to prevent deploying against the wrong Neon endpoint

## Stack

- Next.js App Router 15
- React 19
- TypeScript
- Prisma + PostgreSQL
- Tailwind CSS
- Vitest
- Vercel
- Sentry

## Local Setup

```bash
npm install
cp .env.example .env.local
```

Update `.env.local` with a local or branch database URL and admin credentials:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/the_two_man"
ADMIN_PASSWORD="your-local-password"
ADMIN_SESSION_SECRET="a-long-random-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
APP_URL="http://localhost:3000"
```

Generate Prisma Client and push the schema when using a fresh local database:

```bash
npm run prisma:generate
npm run db:push
```

Optional seed command:

```bash
npm run prisma:seed
```

`prisma:seed` is destructive. It clears and recreates tournament data, so use it only on disposable local or branch databases.

Start the app:

```bash
npm run dev
```

Open http://localhost:3000.

## Useful Commands

```bash
npm run lint
npm test
npm run build
npm run dry-run:tournament -- the-two-man-2026
npm run tournament:reset:state -- the-two-man-2026
npm run recap:export -- --slug the-two-man-2026
npm run observability:check
```

Import a field from CSV files:

```bash
npm run field:import:csv -- data/examples/teams.example.csv data/examples/pods.example.csv data/examples/emails.example.csv --dry-run
```

Remove `--dry-run` only when the target database is disposable or intentionally being reset.

## Environment

See `.env.example` for the full template. The important runtime variables are:

- `DATABASE_URL` or one of the supported Postgres aliases
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `APP_URL`
- `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` when Sentry is enabled
- `SENTRY_AUTH_TOKEN` when uploading Sentry release artifacts during builds
- `THE_TWO_MAN_VALIDATE_PROD_DB`, `THE_TWO_MAN_ENV`, or `APP_ENV` for explicit production DB validation
- `GOLF_COURSE_API_KEY` when live course lookup is enabled

## Deployment

Production deploys go through Vercel and should start from a clean, synced `main`.

```bash
git fetch origin main
git status --short
git rev-list --left-right --count main...origin/main
npm run lint
npm test
npm run build
git push origin main
npm run deploy:prod
```

`npm run deploy:prod` refuses to deploy unless the worktree is clean and synced with GitHub.
Do not create a new Vercel project for this app.

## Documentation

- `ARCHITECTURE.md` explains the current app layout and data flow.
- `docs/tournament-rules.md` contains the tournament rules source document.
- `docs/vercel-deployment.md` documents the existing Vercel production setup.
- `docs/production-database-target.md` documents the expected production Neon target.
- `docs/observability-runbook.md` explains Sentry and Clarity health checks.
- `docs/end-to-end-audit-tracker.md` and `docs/dry-run-report.md` capture the June 2026 launch audit and dry run.
