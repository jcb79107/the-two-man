# Public offseason site and Season 2 preview

The user authorized the offseason production launch on November 7, 2026.
`npm run build:live` exports the public offseason site. `npm run build` retains
the fictional Season 2 preview for development. Never promote that demo to production.

Season 1 is the immutable archive in `src/season1-public.json`. Preserve its hash,
records and private-data exclusions. No production database writes or migrations
are needed for the public site. Read `docs/OFFSEASON-LAUNCH.md` before deployment.

Commissioner result updates belong in the existing AI chat. Read
`docs/CODEX-RESULTS.md` for the separate Season 2 publication workflow.
Do not add scheduling forms, in-app chat or player submission requirements.
Only fictional data belongs in the Season 2 preview; never commit private scorecard
evidence, GHIN IDs or contact details. Preserve the one-stroke-per-hole cap.
