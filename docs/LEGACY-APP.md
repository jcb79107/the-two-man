# Season 1 preservation and legacy recovery

The legacy app was retired from the active tree on November 7, 2026. Removing its
source code does not delete database records. No database write, migration, reset,
seed, endpoint deletion or credential change was part of this removal.

## Preserved records

- Public archive: `preview/src/season1-public.json`; 18 teams, 36 players,
  18 full regular-season scorecards and seven playoff results.
- SHA256: `b3954c209d4c604bee07c3a9fbdc15331674e0380f7887b3b4c169976dca9a87`.
- Neon project: `gentle-cake-18017138`.
- Original database branch: `br-noisy-poetry-apwbzdlv` (`main`).
- Full-data preservation branch: `br-purple-block-aps5d920`
  (`season-1-preserved-2026-11-07`), parent LSN `0/1C3566D0`.
- Read-only verification used QA descendant `br-noisy-hill-apnm9y00`, database
  `neondb`: 18 teams, 36 players, 25 matches and 25 official snapshots.

The public JSON is intentionally not a complete database backup. Private contact
information, GHIN identifiers, tokens, evidence references and operational records
remain in the database, not the public site. Do not delete the Neon project or
these branches as part of code cleanup. External evidence references do not
necessarily preserve the external files themselves.

Original repository data and brand files remain under `data/`. No private database
dump was added to Git. Existing uncommitted work in the canonical local checkout
was not edited or removed.

## Recover the old code

The complete prior application, schema, scripts, tests, dependencies and old
runbooks are in the pushed tag `archive/season1-legacy-2026-11-07`, pointing to
commit `e642fb780d526d00f189b81fc7e52d9af3c9f476`.

```sh
git fetch origin --tags
git worktree add --detach ../two-man-legacy-recovery archive/season1-legacy-2026-11-07
```

Use a separate checkout and database branch for recovery. The legacy dependency
advisories documented in the prior audit must be remediated before exposing that
app. Never run its reset, seed or migration scripts against the preserved data.

For a public-site regression, roll back to the previous static deployment rather
than reactivating the database app. See [release recovery](../preview/docs/OFFSEASON-LAUNCH.md).

## Retirement checks

The replacement app passed 62 unit tests, both production/demo builds, lint,
typecheck and formatting. Browser coverage checks every archived match and player,
standings, bracket, careers, and graphic downloads on desktop and emulated mobile.
All 20 original repository data/brand files were compared byte-for-byte with the
recovery tag. The public archive fingerprint remains unchanged. No private records
were queried or exported during retirement; database verification used counts only.
