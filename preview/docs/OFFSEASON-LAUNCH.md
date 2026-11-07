# Offseason launch — November 7, 2026

## Public behavior
- Home celebrates the 2026 champions; Season 2 field/format/schedule remain undecided.
- Season 1 results, standings, bracket and careers use the official archive.
- Rules are explicitly the Season 1 rules, based on docs/tournament-rules.md.
- No demo strip, sample teams, upcoming fixtures, purse or local result editor.
- /review is an unlisted, noindex download desk for public Season 1 result graphics.
  It has no private data or write capability. It is not an authenticated admin area.
- Existing public tournament/standings/bracket/result URLs redirect into the archive.
  Old private invitation, scoring and admin URLs are retired, not publicly proxied.
- Season 2 remains available through separately built preview deployments.

## Data protection
No database reads, writes, migrations, seeds or credential changes.
Archive SHA256:
b3954c209d4c604bee07c3a9fbdc15331674e0380f7887b3b4c169976dca9a87
18 teams, 25 matches, 18 full regular-season cards, 7 summary playoff results.
Final: Barron & Loewenstein beat Nankin & Sacks 4 & 2.
The production database remains intact; the archived UI never alters it.

## Build and release
Root vercel.json installs preview dependencies and runs build:live; this creates
only official archive routes. The sample-only routes must return 404.
Local prebuilt deploys use scripts/package-preview.mjs --live, which rejects a
demo homepage and clears stale artifacts before copying the export.
Run typecheck, lint, unit tests, build:live, test:offseason and format:check.
Check desktop/mobile appearance, all archive results and PNG downloads.
Commit and push main; use root npm run deploy:prod. Do not deploy a dirty checkout.
Use Standard Vercel Authentication protection so the public production domain is
open while preview URLs and old deployment URLs remain protected.

## Recovery
Previous verified static production deployment (before legacy retirement):
`dpl_31aw47spGf51HuRpgYvJbhekmiE5`
https://thetwo-g5onci3gr-jcb79107s-projects.vercel.app

Roll back to this static deployment if the public site fails. Do not reset the
database or restore database-app build settings. The legacy code is available
from its recovery tag, documented in [data preservation](../../docs/LEGACY-APP.md).
The original database and preservation branch remain intact.

## Limits
No Season 2 enrollment, field, schedule, prize commitments or live publishing
is enabled. Result graphics use official archived results; no missing playoff
hole data is fabricated. Browser tests emulate phones, not physical iOS Safari.
