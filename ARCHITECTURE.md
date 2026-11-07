# Architecture

The public offseason site is a static Next.js export built from `preview/`.
Root commands delegate there. Vercel installs only that folder's dependencies.
There are no server functions or production database connections in this build.

- `preview/src/season1-public.json`: immutable public Season 1 archive.
- `preview/src/history-data.ts`: archive adaptation and career statistics.
- `preview/src/history.tsx`: season results, standings, bracket and careers.
- `preview/src/offseason.tsx`: public homepage and archived rules.
- `preview/src/archive-graphics.tsx`: read-only result graphic downloads.
- `preview/src/publication.ts`: validation for separate fictional Season 2 data.
- `preview/scripts/publish-results.ts`: validated, atomic Season 2 fixture updates.
- `preview/tests`: scoring, archive integrity, publication and browser checks.
- `vercel.json`: public build settings, headers and legacy public-URL redirects.
- `scripts/`: artifact and release guards; no database operations.
- `data/`: retained course reference data, example CSVs and original brand assets.
  These are not installed dependencies or part of the deployed public export.

`NEXT_PUBLIC_SITE_MODE=offseason` selects the live site at build time. The default
build inside `preview/` is the fictional Season 2 demo; it must not be promoted
as production. Root `npm run build` always selects the offseason build.

The old application is recoverable from a Git tag. The original database and its
preservation branch remain separate from this repository; see
[Season 1 preservation and recovery](docs/LEGACY-APP.md).
