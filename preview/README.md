# Public site and Season 2 preview

This folder contains both the live offseason UI and a fictional Season 2 demo.
Season 1 history comes from the immutable `src/season1-public.json` archive.
Neither build connects to the production database.

For the live site, use the commands in the [root README](../README.md).

## Season 2 demo

From this folder:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3027. No environment file is needed. Names, scores, dates and
awards in the current season are sample data; the 2026 archive is official.

The demo covers results, standings, bracket projections, prize illustrations and
history. The unlisted `/review` desk downloads graphics and offers manual result
entry. Drafts and browser-published corrections stay in that browser. Keep real
scorecards, GHIN IDs and contact information out of it.

For versioned fixture updates through Codex, follow the
[result workflow](docs/CODEX-RESULTS.md). It validates before writing and does not
change Season 1. Tournament strokes remain capped at one per hole.

## Verify

```sh
npm run typecheck
npm run lint
npm test
npm run format:check
npm run build
npm run test:browser
```

Install Chromium with `npx playwright install chromium` if needed. To check the
live build instead, run `npm run build:live` and `npm run test:offseason`.

## Preview deployment

`npm run build` exports the demo to `out/`. After checks pass, run
`node scripts/package-preview.mjs` and deploy that bundle to a preview target in
the existing Vercel project. Never promote the fictional demo to production.
Live deployment and recovery are documented in [the release guide](docs/OFFSEASON-LAUNCH.md).

See [DESIGN.md](DESIGN.md) and [UX-CONTRACT.md](UX-CONTRACT.md) for product behavior.
Scheduling remains in group texts; handicap setup remains in GHIN. There is no
GHIN integration, private evidence storage or multi-device draft sync.
