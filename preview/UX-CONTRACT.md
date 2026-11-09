# Season 02 preview behavior contract

This contract applies only to the standalone `preview` app. Visual intent is in DESIGN.md. Business source: the commissioner's October 13 conversation, captured in `docs/DECISIONS.md`. Production Season 1 remains unchanged.

## Current workflow

Public browsing is identical for everyone. No role switch, player account, submission or scheduling form. Legacy /submit is an informational page explaining text/email evidence. Unpublished matches show Pre-match and do not expose draft scorecards.

The commissioner demo at /review is openly accessible and explicitly has no authentication or private storage. Use fictional data only. Select a regular-season match, copy course/tees, match time and GHIN strokes, enter four players’ 18 gross scores and hole strokes, confirm evidence receipt, review the calculated outcome, attest and publish. Native date controls record the fictional June CDT times; they are not a production timezone implementation.

Drafts use a separate browser storage key and survive navigation/reload. They never replace published matches. A correction requires a note, preserves the official result until publication and then recalculates current-season results. Original sample fixtures and the official Season 1 archive are immutable. Publishing replaces one fixture, not appends it. Back to editing clears attestation. Discard asks for confirmation and changes no published result. Storage failures are reported as visit-only persistence. No cross-tab concurrency guarantees.

No database, server actions, API routes, telemetry, credentials, uploads, payment, AI, GHIN or messaging integrations. Playoff administration is deliberately excluded pending rules and bracket correction decisions. Real implementation needs server authorization, private evidence, transactions, revision checks and audit history. Browser storage is never a privacy boundary.

Keep semantic links, labels, buttons, keyboard focus and table-owned horizontal scrolling. Invalid input remains editable; review and publication show actionable errors. All routes support reload and browser navigation. Existing history/filter URL behavior is preserved.

## League history
History navigation, the record book and career pages are owned by `src/history.tsx`; season snapshots and career aggregation by `src/history-data.ts`. Season identity belongs in the route, not a mutable global current-year variable. Search/ranking/entity/scope live in URL query parameters. Archive cards use the shared Scorecard with historical participant labels. Immutable official Season 1 history stays separate from editable current-season storage. Unknown playoff hole data renders an explicit unavailable state. See docs/SEASON-HISTORY.md for metric definitions and production migration boundaries.

## Connected bracket

Full bracket is the default on every screen size: all seven matches are visible in a horizontally scrollable region, with SVG connections and textual feeder labels. Round views use the URL round parameter and preserve archive view=playoffs. Progression links identify and target the next round. Current unresolved fields show seed placeholders; downstream slots show Winner QF/SF labels until official source winners exist. Archived result links remain season-scoped. The bracket is read-only and does not mutate scores or history.


## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Select/Listbox | Native select in shared workflows | DESIGN.md | OS-owned popup | Browser keyboard and mobile checks |
| Date | Native datetime-local in commissioner.tsx | Current workflow above | Fictional CDT dates | Publication validation tests |
| Form | commissioner.tsx and score-entry.tsx | domain.ts and score-entry-model.ts | Hole entry, full card, paste row | tests/commissioner.test.ts and tests/score-entry.test.ts |
| Scrollbar | app/globals.css | DESIGN.md | Table and bracket horizontal scrolling | Narrow viewport inspection |
| Toast | store.tsx notice rendered by app.tsx | Current workflow above | Saved, storage unavailable | Browser draft and publication checks |
| CRUD | commissioner.tsx with store.tsx | domain.ts publishDraft | New result, correction, discard draft | tests/commissioner.test.ts |

## Core experience update

Results lead the clubhouse. ResultSummary explains the 18 hole points without changing scoring rules. FastScoreEntry edits the same draft as the full-card editor; paste accepts exactly 18 whole-number scores and never publishes. Head-to-head records aggregate official games by stable partnership identity and link to season-specific results. Bracket team selection and round selection persist in the URL; highlighting stops at an elimination and never predicts a winner.

## October 19 focus revision
Home is a chronological official-results timeline. Keep the existing rules judge and Instagram links. No brand-direction page, promotional homepage panels, or slogan headings. Standings retain ranking statistics; playoffs default to the full connected bracket with round views optional. Preview sample disclosure remains visible on mobile.

Site-wide follow-up: compact page headings; literal scorecard/history/rules labels; statistical definitions available on demand. Preserve validation errors, publishing attestation, sample/privacy warnings and confirmed versus proposed rules.

## Publication persistence recovery
A browser storage failure leaves the published result available for the current visit, but it must not claim durable saving or delete the draft. The completion screen keeps an explicit warning and Retry saving action. Only a successful retry clears the draft. Reload still uses the last durably saved season. Saved season snapshots must preserve each fixture's original ordered team pairing and pod. This is validation of fictional local data, not authentication or a cross-tab concurrency guarantee.


## November 5 feedback revision

Public matches have two states: Pre-match and Completed. Internal draft/review states remain private to the commissioner workflow. Legacy review filter URLs resolve to Pre-match.

Standings columns sort in either direction with URL state; displayed rank remains the competition rank. Playoff picture projects six pod leaders and two wildcards from published results, lists the next four, and flags unresolved pod, seed and wildcard ties. The single-match calculator adds hypothetical points, holes won and net totals without changing scores or browser storage. Other pending matches remain unplayed. This is a scenario, not a probability forecast.

GHIN is the stroke source: 90% Course Handicap, lowest player at zero, others receive the difference, capped at one stroke per hole. Players may agree at the tee. There is no required agreement timestamp. Regular-season evidence includes all four full scores, labeled strokes and marked team best ball; displayed cards mark both players when tied. Playoffs require only the winning team and match result, not a card. Playoff result entry remains outside this local preview's administration scope.


## Simplified commissioner workspace

`/review` opens Results: pending matches, published results, correction links and saved-draft resume links. Manual regular-season entry is collapsed behind Enter a result manually. Existing match deep links, editor, draft persistence, validation, correction reasons, attestation and failed-publication retry behavior remain unchanged.

Instagram graphics is the second tab. Result, standings and bracket templates generate local 1080 × 1350 PNGs with the Season 2 mascot. Selections persist in the URL. Only published results feed graphics; drafts and calculator scenarios are excluded. Current bracket seeds remain placeholders until qualification resolves. All exports retain a sample-data label. The preview and download share the same PNG; generation errors allow retry and no data writes occur. This does not connect the browser-local preview to an agent, production data or Instagram posting.

## November 7 archive and audit update

The user authorized importing public Season 1 results, superseding the earlier fictional-history-only restriction. Season 2 and commissioner entry remain a sample sandbox. The official archive is an allowlisted static snapshot, separate from browser storage; all-time records exclude sample seasons. Unknown dates, playoff cards and award amounts are shown honestly. See docs/SEASON-HISTORY.md for provenance and release limits. The AI rules helper never claims certification or assumes a local rule has been adopted.

## Browser feedback — November 7

The homepage omits the teams/pods/playoff-places sentence. The AI rules judge is available in the header and existing rules areas, using a sparkle icon; its prompt still identifies it as AI, not an official ruling. Public footer and More navigation omit commissioner access. The demo remains reachable directly at `/review`; this is unlisted, not authenticated or secret. Production requires authenticated commissioner access even if its URL is not advertised.

## November 7: Codex-led commissioner workflow

The default commissioner destination is now the graphic desk; Results/manual correction is secondary. Players schedule in group texts. Manual entry records a played date, not a booked tee time. The versioned Season 2 publication feeds the public app and graphics after deployment; browser edits are only rehearsal overrides isolated by publication revision. See `docs/CODEX-RESULTS.md`. Confirmed playoff results propagate into the bracket, result pages, current-season history and proposed awards. No production database or Season 1 write path was introduced.
