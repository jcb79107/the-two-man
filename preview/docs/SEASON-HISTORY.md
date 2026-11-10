# Season 1 official archive

The November 7 import replaces fictional 2026 history with an allowlisted public projection from the preserved Season 1 database copy. It contains 18 teams, 36 players, 18 regular-season scorecards and seven playoff results. Barron & Loewenstein won the final 4 & 2 over Nankin & Sacks; their full-season record is 4–1.

## Provenance and preservation

Source project: gentle-cake-18017138. Preservation branch: br-purple-block-aps5d920, captured November 7, 2026 at parent LSN 0/1C3566D0. Read-only export ran against its verified QA descendant br-noisy-hill-apnm9y00. No production writes, migrations or resets occurred. The database preservation branch remains the full-data recovery copy; this JSON is only a public competition archive, not a complete database backup.

`scripts/season1-public.sql` lists the exported public fields. `src/season1-public.json` retains source IDs, official outcome summaries, player scores/strokes, course metadata and playoff feeder relationships. Its SHA-256 is pinned in docs/season1-public.sha256. Import tests compare every result and all 18 cards with these snapshots. No emails, phone numbers, GHIN identifiers, private tokens, evidence links or commissioner notes are included.

Season 1 public identities are namespaced `s1-` to prevent collisions with demo t1/p1 identities. Future genuine seasons must map players and partnerships explicitly using stable IDs; do not join by names. Public archive routes preserve 2026 and the source match ID (or q1–q4/s1–s2/final playoff alias).

## Unknowns and historical meaning

The source tournament status still says ACTIVE, but the official championship is final. The archive completion state follows that recorded final; the source database was not relabeled. Quarterfinal 3 has no recorded date. Quarterfinal 2 has an official tiebreak winner, without an extra-hole count. All playoff snapshots are summary-only, so no individual playoff card is invented. The imported snapshot has no prize amounts. On November 9, 2026, the commissioner confirmed a $3,600 pool: champions $1,800 ($900/player), runner-up $900 ($450/player), and six pod winners $150 each ($75/player). These amounts supplement the display model without changing the pinned match archive. Pod and playoff awards stack; payment status is not recorded.

Regular-season standings use match points (win=1, tie=0.5), hole points, holes won, then cumulative net better-ball. Equal metrics retain a stable display order; they do not establish an unrecorded commissioner tiebreak. Career wins follow official outcomes; playoff points are excluded from regular-season point totals. Career earnings sum team awards or explicitly confirmed player splits; unknown amounts remain unknown. Match-scope filters do not change season earnings. Playoff pages show final match results only; scorecards and missing-card notices are restricted to regular-season matches.

All-time records exclude the fictional 2027 season by default. Its explicit season filter remains available for testing. Current demo edits never change archived results. Phase-specific rankings include only participants with an official result in that phase, including losses and ties. All-matches records retain every entrant. Season totals and prizes remain independent of match scope. Filters stay in the URL; refresh and deep links preserve them. Dropdown changes create browser history entries; search edits replace the current entry. Empty phase views offer all-matches recovery without clearing the search or season.

## Current deployment boundary

The live offseason build is static and read-only. Its `/review` page generates
images from public archived results; it cannot change Season 1. The separate
Season 2 demo keeps rehearsal drafts in browser storage and supports validated
versioned fixture publication through Codex. Neither build accesses the database.

The legacy database app has been removed from the active repository. Its recovery
tag and full-data preservation branches are recorded in
[Season 1 preservation](../../docs/LEGACY-APP.md). Do not treat this public JSON as
a substitute for those private database records.

Career match history and head-to-head results show regular-season hole points
with the featured player’s team or partnership first. Playoff margins remain as
recorded; archived match detail retains its original paired team order.

Record-book team search matches partnership names and either player’s full name
within the selected seasons. Search filters already-ranked rows, preserving rank
and the query when switching between team and player records.
