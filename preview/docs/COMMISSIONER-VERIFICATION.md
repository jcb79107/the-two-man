# Commissioner-led preview slice — October 14, 2026

Local branch: `codex/season-2-preview`, based on `1989330`. At verification time, no push, deployment, production writes or canonical application changes had occurred. Existing hosted previews do not include this slice. Local verified static output is served at http://127.0.0.1:3038/review .

## Changes

- Removed player role switching, card submission/upload, and scheduling/stroke-lock forms. Legacy `/submit` explains the text/email workflow. Public pending matches show Awaiting result without draft scorecards.
- Added `/review` match selection and commissioner entry: course/tees, recorded tee time and external stroke-agreement time, evidence-received checkbox, four players’ 18 gross scores, supplied per-hole strokes, source fixture, and note.
- Review is a separate step with calculated outcome, full scorecard and explicit evidence attestation. Back to editing clears attestation; invalid/missing inputs remain editable.
- Drafts persist separately in browser storage. Editing or saving a correction leaves the official result unchanged. Publishing replaces the single fixture and recomputes existing standings, earnings and current career aggregation. Corrections require a reason. Discard is confirmed; reset restores fixtures.
- Kept scoring and ranking math, historical snapshots, awards and existing bracket behavior. No new playoff, field-size, payout or tiebreak decisions.
- Updated README, decision record and UX contract. Static demo access and nonprivate browser storage are explicit. No real evidence should be entered.

## Verification completed

- `npm test`: 23 passing across 3 files (19 existing plus 4 publication regressions).
- `npm run typecheck`, `npm run lint`, `npm run format:check`: pass.
- `npm run build`: pass, 132 static pages, 134 kB reported first-load application JS; not a field performance measurement.
- `git diff --check`: clean.
- Chrome desktop and 390 × 844 mobile: invalid zero score rejected; draft edit survives reload; review requires attestation; back-to-edit, keep-editing and discard paths; correction requires reason; discarded correction restores the original score; published correction survives reload; new result appears in the public scorecard.
- Entered a formerly scheduled match manually: all 72 gross scores, new date and agreement timestamp, evidence receipt, review and publish. Found and fixed native date input events losing state. Found and fixed misleading computed totals on incomplete cards.
- Public pending match has no draft table or score inputs. History still displays original completed 2026 champion and 25 official archive matches; current count reacts to new publications.
- Reset cancellation and restoration exercised; left original sample data and entry screen open. Repeated publication replacement is tested at the state boundary; success screen removes the publish action.

Screenshots: `output/playwright/commissioner-desktop.png` and `output/playwright/commissioner-mobile.png`.

## Limits

This is a static fictional-data demo, not authenticated admin software. Drafts and results are browser-local and inspectable; no privacy or cross-tab concurrency guarantee. Storage failure messaging exists but quota denial was not browser-injected. No physical iPhone/Safari or full accessibility certification. Date fields explicitly use fixed CDT for the June sample; production needs proper time-zone handling. No real photo comparison, server transactions, audit history, authentication, private storage or production integration was tested. Playoff administration and connected bracket redesign remain a later slice. Existing Vitest config emits a future Vite module-loader warning; tests pass.

A temporary dev/build manifest collision occurred during QA; browser verification continued on the successful static build. It is not a remaining application failure.

## Staging release authorization

Jason authorized committing and pushing `codex/season-2-preview` and deploying the tested static output to the existing Vercel project in preview scope. The original Codex thread was idle and canonical main remained clean during the release reconciliation. This does not authorize production deployment or production data changes.
