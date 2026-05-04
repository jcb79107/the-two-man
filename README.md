# Fairway Match

Mobile-first tournament operating system for a season-long two-man net better-ball match play golf season.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma over Postgres
- Standalone scoring engine with tests

## Getting started

1. Install dependencies: `npm install`
2. Copy envs: `cp .env.example .env`
3. Generate Prisma client: `npm run prisma:generate`
4. Seed local data: `npm run prisma:seed`
5. Start the app: `npm run dev`

## Current status

- MVP product foundation documented in [`docs/foundation.md`](./docs/foundation.md)
- Database schema drafted in [`prisma/schema.prisma`](./prisma/schema.prisma)
- Seed data created for the 2026 tournament format
- First scoring engine module lives in [`src/lib/scoring/engine.ts`](./src/lib/scoring/engine.ts)
- Vercel deployment guide lives in [`docs/vercel-deployment.md`](./docs/vercel-deployment.md)

## Assumptions

- One host-admin runs one tournament first, even though the schema can support more later.
- Handicap Index is entered manually for MVP.
- GHIN sync and course-data provider sync are deferred behind import/provider boundaries.
