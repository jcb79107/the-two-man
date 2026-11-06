# League history and career records

## Implemented in the staged preview

- History is a primary navigation item, with a season selector, current-season overview and a completed 2026 sample archive.
- Each archived season has overview, honors, pod standings, all results and a completed playoff path. Deep links identify both season and match.
- Champions receive a permanent year panel with player profiles and a link to the final result.
- The record book filters teams/players, seasons and regular-season/playoff matches. Sort by wins, championships or win percentage; search is shareable and survives refresh through URL parameters.
- Player and partnership career pages show seasons entered, official record, championship honors, season-by-season finishes and match history. Team awards are shown without assuming player splits.
- Current official results feed career totals; review drafts do not. Historical sample cards are separate snapshots. Changing this year's strokes or scores does not rewrite a past season.
- All historical values are explicitly fictional. No actual Season 1 participant, winner or result is claimed. No real records were imported or modified.

## Data design for longevity

`history-data.ts` separates stable player IDs, partnership/team IDs, season entries and season-scoped game IDs. Entries preserve player names and the partnership name for historical display. A player keeps their identity when changing partner. A new pairing is a different partnership. Career aggregation joins on IDs, never matching names.

A season record owns completion state, roster snapshots, regular cards, official results, champion/runner-up and an award ledger. The active season adapts the existing staged match state. The archive is read-only through the UI. Playoff results can exist without a hole card: unavailable detail is `null`, not invented scores or zeroes. Regular-season points and playoff margins are separate fields, not summed together.

The current fixture registry contains 2026 and 2027 only. Adding another staged season requires adding its record and static route generation; no unsupported past years or future champions are manufactured. Production season creation and automatic archival are not implemented.

## Definitions

- Career W–L–T: official team match outcomes involving the selected identity, in the chosen match scope.
- Player W–L–T: the outcomes of that player's partnership entries, not individual stroke-play wins.
- Win percentage: wins / official matches; ties count as matches but not wins. No minimum games; game counts are visible.
- Rank: equal metric values share a competition rank. Alphabetical ordering only stabilizes ties; it is not a tiebreak rule.
- Championship: awarded only by a completed season's recorded champion, never inferred from a regular-season leader or an illustrative active bracket.
- Earnings: earned awards attributed to the team; no claim that they have been paid and no inferred individual split.
- Historical standings: regular-season match record and hole points. A playoff result is linked separately. No aggregate net scoring comparisons across different formats/allowances are presented.

## Before production integration

1. Import the real Season 1 rosters, championship/final results, pod winners and award terms from an approved source. Reconcile against commissioner records; preserve unknowns. Do not scrape or fabricate missing scorecards.
2. Introduce durable season, entry, identity, result-revision and award tables in a separately reviewed migration. Preserve existing IDs and deep links; use explicit season ownership everywhere. No migration has been run.
3. Store a season's rules, handicap allowances, ranking/tiebreak decisions, dates and award terms as a versioned snapshot. This sample has one known format; it is not a generic tournament rules engine.
4. Finalization must verify unresolved games, ties and awards. Correcting a finalized season should require an authorized revision with reason, editor and timestamp, then rebuild affected career aggregates. No silent overwrites.
5. Server-enforce authorization, uniqueness and transaction boundaries. Public read access must not expose private scorecard image URLs, handicap evidence or contact details. Player visibility/name preferences need a product decision.
6. Serve historical and career pages with server-rendered real metadata, paginated result queries and appropriate cache invalidation. The current static export is for design/interaction review and has no database.

## Acceptance evidence

Eight history tests cover archive isolation, official-result inclusion, aggregate reconciliation, active-season title exclusion, award reconciliation, final/champion agreement, missing playoff card data, identity continuity after a partner change, and unique archived source routes. Existing 11 tests remain passing. Browser checks cover archive-to-final-to-career navigation; all record filters; URL persistence on reload; search empty/clear states; desktop and 390px mobile inspection. This is not a complete accessibility or field performance certification.
