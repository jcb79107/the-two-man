# Season 1 official archive

The November 7 import replaces fictional 2026 history with an allowlisted public projection from the preserved Season 1 database copy. It contains 18 teams, 36 players, 18 regular-season scorecards and seven playoff results. Barron & Loewenstein won the final 4 & 2 over Nankin & Sacks; their full-season record is 4–1.

## Provenance and preservation

Source project: gentle-cake-18017138. Preservation branch: br-purple-block-aps5d920, captured November 7, 2026 at parent LSN 0/1C3566D0. Read-only export ran against its verified QA descendant br-noisy-hill-apnm9y00. No production writes, migrations or resets occurred. The database preservation branch remains the full-data recovery copy; this JSON is only a public competition archive, not a complete database backup.

`scripts/season1-public.sql` lists the exported public fields. `src/season1-public.json` retains source IDs, official outcome summaries, player scores/strokes, course metadata and playoff feeder relationships. Its SHA-256 is pinned in docs/season1-public.sha256. Import tests compare every result and all 18 cards with these snapshots. No emails, phone numbers, GHIN identifiers, private tokens, evidence links or commissioner notes are included.

Season 1 public identities are namespaced `s1-` to prevent collisions with demo t1/p1 identities. Future genuine seasons must map players and partnerships explicitly using stable IDs; do not join by names. Public archive routes preserve 2026 and the source match ID (or q1–q4/s1–s2/final playoff alias).

## Unknowns and historical meaning

The source tournament status still says ACTIVE, but the official championship is final. The archive completion state follows that recorded final; the source database was not relabeled. Quarterfinal 3 has no recorded date. Quarterfinal 2 has an official tiebreak winner, without an extra-hole count. All playoff snapshots are summary-only, so no individual playoff card is invented. Prize amounts and paid status are absent: display Not recorded, not $0 or Season 2's example amounts.

Regular-season standings use match points (win=1, tie=0.5), hole points, holes won, then cumulative net better-ball. Equal metrics retain a stable display order; they do not establish an unrecorded commissioner tiebreak. Career wins follow official outcomes; playoff points are excluded from regular-season point totals. Awards belong to teams, never assumed individual splits.

All-time records exclude the fictional 2027 season by default. Its explicit season filter remains available for testing. Current demo edits never change archived results. Filters stay in the URL; refresh and deep links preserve them.

## Remaining production work

The current-season commissioner is still a browser-local, openly accessible demo. Live commissioner use needs the existing production authorization and durable transaction/revision boundaries integrated with this UI. Do not serve real private evidence through this static export or treat browser storage as a security boundary. No deployment or production integration is implied by this import.
