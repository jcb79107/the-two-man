# Season 02 preview behavior contract

This contract applies only to the standalone `preview` app. Visual intent is in DESIGN.md. Business source: the commissioner's October 13 conversation, captured in `docs/DECISIONS.md`. Production Season 1 remains unchanged.

## Current workflow

Public browsing is identical for everyone. No role switch, player account, submission or scheduling form. Legacy /submit is an informational page explaining text/email evidence. Unpublished matches show Awaiting result and do not expose draft scorecards.

The commissioner demo at /review is openly accessible and explicitly has no authentication or private storage. Use fictional data only. Select a regular-season match, copy course/tees, match time and the externally agreed stroke timestamp, enter four players’ 18 gross scores and hole strokes, confirm evidence receipt, review the calculated outcome, attest and publish. Native date controls record the fictional June CDT times; they are not a production timezone implementation.

Drafts use a separate browser storage key and survive navigation/reload. They never replace published matches. A correction requires a note, preserves the official result until publication and then recalculates current-season results. Original source fixtures and past seasons are immutable. Publishing replaces one fixture, not appends it. Back to editing clears attestation. Discard asks for confirmation and changes no published result. Storage failures are reported as visit-only persistence. No cross-tab concurrency guarantees.

No database, server actions, API routes, telemetry, credentials, uploads, payment, AI, GHIN or messaging integrations. Playoff administration is deliberately excluded pending rules and bracket correction decisions. Real implementation needs server authorization, private evidence, transactions, revision checks and audit history. Browser storage is never a privacy boundary.

Keep semantic links, labels, buttons, keyboard focus and table-owned horizontal scrolling. Invalid input remains editable; review and publication show actionable errors. All routes support reload and browser navigation. Existing history/filter URL behavior is preserved.

## League history
History navigation, the record book and career pages are owned by `src/history.tsx`; season snapshots and career aggregation by `src/history-data.ts`. Season identity belongs in the route, not a mutable global current-year variable. Search/ranking/entity/scope live in URL query parameters. Archive cards use the shared Scorecard with historical participant labels. Immutable sample history stays separate from editable current-season storage. Unknown playoff hole data renders an explicit unavailable state. See docs/SEASON-HISTORY.md for metric definitions and production migration boundaries.

## Connected bracket

Overview is the default: desktop shows the full bracket; phones show the first unfinished round (or the final for completed seasons). Full bracket is available explicitly on every screen size: all seven matches are visible in a horizontally scrollable region, with SVG connections and textual feeder labels. Round views use the URL round parameter and preserve archive view=playoffs. Progression links identify and target the next round. Current unresolved fields show seed placeholders; downstream slots show Winner QF/SF labels until official source winners exist. Archived result links remain season-scoped. The bracket is read-only and does not mutate scores or history.


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
Home is a chronological official-results timeline. Keep the existing rules judge and Instagram links. No brand-direction page, promotional homepage panels, or slogan headings. Standings retain ranking statistics; playoffs default to round view with full bracket optional. Preview sample disclosure remains visible on mobile.

Site-wide follow-up: compact page headings; literal scorecard/history/rules labels; statistical definitions available on demand. Preserve validation errors, publishing attestation, sample/privacy warnings and confirmed versus proposed rules.
