# Working on the website locally

These notes are for maintaining The Two Man website. They describe the database-backed app on `main`; the separate Season 2 preview has its own instructions.

## Local setup

Use the Node version in [CI](../.github/workflows/ci.yml) and the package manager declared in [package.json](../package.json). Install the locked dependencies and copy the configuration template:

```sh
npm ci
cp .env.example .env.local
```

Set a **disposable local or development database** in `DATABASE_URL`, local values for `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`, and `http://localhost:3000` for `APP_URL` and `NEXT_PUBLIC_APP_URL`. See [the environment template](../.env.example) for optional integrations. Keep credentials out of Git.

For a fresh development database:

```sh
npm run prisma:generate
npm run db:push
npm run dev
```

Open `http://localhost:3000`. The optional `npm run prisma:seed` command clears and recreates tournament data; use it only with a disposable development database.

## Verification

```sh
npm run lint
npm test
npm run build
```

Tournament dry runs, CSV imports, resets and recap exports are maintainer utilities listed in [package.json](../package.json). Inspect each script and confirm its database target before running it. The [launch runbook](../LAUNCH-RUNBOOK.md) and [dry-run report](dry-run-report.md) provide operational context; they are not required for reading the source.

## Production work

Follow the [deployment runbook](vercel-deployment.md), [database-target notes](production-database-target.md) and [contribution workflow](../CONTRIBUTING.md). Local setup is not permission to use production credentials, import real data or deploy changes.
