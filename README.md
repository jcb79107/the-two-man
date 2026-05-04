# The Two Man

A mobile-first tournament operating system for season-long two-man net better-ball match play.

Built with Next.js, TypeScript, Tailwind, and Prisma, The Two Man handles the full flow from roster setup to private score entry to public standings and bracket views.

## What it does

- private match links for official score entry
- automatic net better-ball scoring
- pod standings with wildcard logic
- playoff bracket progression
- public tournament home, standings, rules, and results
- admin tools for setup, corrections, forfeits, and relaunch-safe operations
- provider boundaries for course lookup and future handicap sync

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Vitest

## Quick start

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:seed
npm run dev
```

Open `http://localhost:3000`.

## Environment

Required for normal local use:

- `DATABASE_URL`
- `APP_URL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

Optional integrations:

- `GOLF_COURSE_API_KEY`
- `USGA_LOOKUP_SCRIPT`
- `FAIRWAY_ENABLE_PREVIEW_DEMO`

See `.env.example` for a starter file.

## Demo and seed data

- the repo ships with seeded tournament structure for local development
- example CSV imports live in `data/examples/`
- no private production roster data is included

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run typecheck
npm run prisma:generate
npm run prisma:seed
npm run dry-run:tournament
npm run bracket:preview:stage
```

## Project docs

- `ARCHITECTURE.md` — system design and integration boundaries
- `DESIGN.md` — product and UX guidance
- `docs/foundation.md` — MVP scope and product framing
- `docs/linux-deployment-plan.md` — deployment notes
- `docs/tournament-rules.md` — tournament format and scoring rules

## Open-source notes

This public repo intentionally excludes:

- private tournament roster data
- local build artifacts
- machine-specific absolute paths
- secrets and live environment values

If you want to run the optional course lookup integrations, wire your own approved providers through environment variables.

## License

MIT
