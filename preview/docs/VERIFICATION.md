# Season 2 staged preview — verification

October 13, 2026. This is a functional, browser-local proposal, not production-ready software. All application changes are confined to `preview/` on `codex/season-2-preview`.

## Acceptance evidence

- `npm test`: 11 passing tests. Two fixtures per team; balanced illustrative awards; drafts excluded from standings; idempotent approval; incomplete qualification blocked; supplied-stroke arithmetic; invalid scores and stored snapshots rejected; exact 24-hour boundary; future/unlocked/no-evidence approval blocked.
- `npm run typecheck`, `npm run lint`, `npm run format:check`: pass.
- `npm run build`: pass, 48 generated static pages, approximately 130 kB first-load JavaScript for application routes. This is a bundle measurement, not field Core Web Vitals evidence.
- Premium design audit in strict mode: zero findings (see premium-audit.json). Design token lint: zero errors, five orphan-token warnings. Neither proves accessibility compliance.
- Runtime dependency audit (`npm audit --omit=dev`): zero vulnerabilities at check time. Full audit: five high advisories in the development-only ESLint/fast-glob/micromatch/braces chain. No server or these development tools are shipped in the static deployment. Reassess before production integration.

## Browser checks performed

Chrome, wide desktop and 390 × 844 mobile. Inspected home, standings and scorecard/review layouts. Fixed mobile standings overflow and oversized hero wrapping. Native controls and scorecard-owned horizontal scrolling retained. Keyboard traversal/date inputs exercised; focus and validation feedback inspected. No claim of a full WCAG audit or physical-device testing.

Submission: missing agreement rejected; simulated failure retained input; retry succeeded and handed off to review. Review: edited a hole, saved draft, verified original source remained unchanged; unchecked approval rejected; checked approval changed official count from 15 to 16 and cleared review queue. Saved result survived reload. Hosted deployment repeated approval and reload checks successfully.

Scheduling: saved June 25, 11:59 AM against the June 24 noon clock; locking correctly rejected. Exactly June 25 noon accepted. The updated agreement time is displayed. FormData reads make native date/time submission reliable.

Fixture records and image previews are separate: image files remain memory-only and are never uploaded. Score edits are browser-local. Source and draft are distinct. Role switching is deliberately labeled demo access, not security.

Observed a browser-extension hydration warning caused by Scribe adding an attribute to the document. It was not suppressed in application code. No application crash was observed in the exercised workflows.

## Deployment and recovery

The existing `the_two_man` project and owner were verified before preview deployment. Only prebuilt static output is uploaded using `--target preview --prebuilt`. No environment files, server functions, database client, analytics client, production aliases, global project setting changes, migrations or production writes. Build Output API routing follows the official Vercel configuration reference: https://vercel.com/docs/build-output-api/configuration.

Do not promote this artifact to production. Recovery requires only abandoning/removing the preview deployment; there is no shared data to roll back. `Reset demo` restores this browser's fictional fixtures. The canonical production checkout remains untouched.

## Remaining product/engineering decisions

Approve visual direction, buy-in/payout amounts, field size, qualification/tie rules, deadlines/extensions and handicap allowances. Finalize authorized GHIN access separately. Real OCR needs accuracy evaluation, human-review provenance and secure image handling. Real implementation needs authentication/authorization, server-enforced stroke deadlines, durable audit history, upload storage, transactional result approval, production migration planning and integration tests. Playoff administration and registration remain future work. This preview demonstrates regular-season workflows and illustrative bracket/earnings states; it does not replace the entire existing application.

## Final hosted artifact

Preview: https://thetwo-puo19dxos-jcb79107s-projects.vercel.app

Deployment `dpl_4pqR8TykfGfPiKmeeSDN6oLq9QzG`, built from application revision `55bdaa6`. Final browser smoke verified direct match deep links and gross/net switching. HTTP checks returned 200 for a valid match, 404 for an unknown path, and `X-Robots-Tag: noindex, nofollow`. Desktop screenshot: preview-desktop.jpg. Earlier hosted revision verified approval/reload; final code only changes net score notation to match displayed values. Canonical main remained clean at `f8fc0d8`. No branch push or PR was created.

## League history extension — October 13, 2026

The new history implementation adds season archives, champions, career profiles and query-backed all-time records while preserving the active-season flows. All history remains labeled fictional; real Season 1 has not been imported. See SEASON-HISTORY.md for identity, statistics and migration decisions.

Final checks: 19 tests pass (11 existing + 8 history); typecheck, lint, formatting and build pass. Static build now generates 132 pages, approximately 137 kB first-load JavaScript (about 7 kB above the initial preview). Strict design audit still has zero findings. Dependencies are unchanged from the prior recorded audit.

Browser verification: archive → final → partnership career; record book teams/players, year, playoff-only scope, title sort and name search; filter values survive reload; empty search recovery works. Mobile 390px, tablet 820px/1024px and desktop inspected. The navigation now switches at 900px to avoid cramped tablet labels. Document width did not overflow. Archived gross/net/front/back controls work with snapshot participant labels. Missing playoff card data renders an explicit unavailable state. Browser-local prior edits persist and remain separate from the completed archive. No production mutation, merge or import occurred.

Latest history preview: https://thetwo-h94hepxsn-jcb79107s-projects.vercel.app/history (deployment `dpl_Abc8KtvqJ2iYerPDVk6wi1VCP2T3`, application revision `bb2c172`). Hosted checks verified the filtered player record deep link, selecting the active season from league-wide pages, and the unfinished-season “No champion yet” state. Archived final returns HTTP 200; unknown season returns 404; noindex remains set. Final screenshot: season-history-desktop.jpg. Canonical main and origin/main remain `f8fc0d8`, clean and unchanged.

## Phone usability pass — October 29, 2026

Baseline: remote `codex/season-2-preview` verified at `5a67c9b`; isolated local branch `codex/ponytail-mobile`. Ponytail and Taste were read as guidance only. No Ponytail/Taste scripts or hooks were installed or run. Fixtures flow through validated browser storage into published matches; commissioner drafts remain under a separate key; `publishDraft` replaces one match and derived standings/history recalculate. Archives remain immutable.

Changes: adaptive 44px-minimum hole targets, larger score numerals with tighter player spacing, readable bottom navigation, 44px More/score-toggle/previous-next controls, pinned phone standings names, and removal of duplicate date input handlers. Repaired two missing optional lockfile entries without changing declared dependencies or existing package versions.

Final checks: 32 tests (5 files), lint, typecheck, formatting and static build (131 pages) pass. Offline `npm ci --ignore-scripts --dry-run` validates the repaired lockfile. Built-preview Chromium checks pass at 320/390/768/1440px without document overflow on home, standings, bracket and entry. Hole targets increased from 24px to 46px at 320px and 32px to 50px at 390px. Checked numeric Enter focus, repeated save, browser Back/reload draft recovery, invalid date/score, required attestation, back-to-edit attestation reset, publication, correction reason, official-result preservation, discard/cancel, URL round navigation, net/back-nine toggles, agreed strokes, seven-match connected bracket, pinned names, reduced motion, short viewport focus and denied-storage recovery. No page errors observed.

Screenshots and reproducible browser checks are retained in the task's sibling `two-man-evidence/` directory; the mobile comparison was saved to Library. No production access, push or deployment. Physical iOS/Android keyboards and Safari remain untested; this is still an unauthenticated fictional browser-local demo. The unavailable Mac's October 21 edits were not recovered. Vitest reports a non-blocking future native-config-loader warning.

## Unslop polish — November 4, 2026
Verified `two-man-focused` on local `codex/ponytail-mobile` at Season 2 commit `5a67c9b621d622b441cb345577c41629bd407241`, including all six pre-existing staged files. No unstaged changes existed at intake. Worked from that full snapshot, preserving the original index. This pass changes only app.tsx, globals.css and these design/verification notes. No Season 1 changes, installation, push or deployment.

The existing phone pass already provided readable bottom navigation, 44px hole controls and sticky standings names. The previously reported route-change menu issue did not reproduce in Chromium. Escape dismissal did reproduce and is fixed with focus restoration. Increased disclosure/metadata type, softened metadata casing/weight and completed 44px feed/reset/Rules targets. Brand and business logic remain unchanged.

Validation on the matching local snapshot: 32 tests across 5 files pass; lint, typecheck and static build (131 pages) pass. Installed headless Chromium checked 320/390/768/1440px: no document overflow on home, standings, bracket or entry; all targeted actions are at least 44px; sticky names, Escape/focus and menu links pass. Existing draft/review regression passes, including reload recovery, validation, attestation, publication, correction and discard. No page errors. Desktop/phone home, standings and entry screenshots visually inspected. Physical devices and Safari were not tested. Vitest retains its existing non-blocking future config-loader warning.

Evidence: `/home/jason/Documents/Codex/2026-11-03/task/unslop-evidence/` contains before/after screenshots, browser scripts/results, the preserved staged patch and this pass's separate patch.

## Hallmark / Awesome DESIGN.md pass — November 4, 2026
Baseline: clean `codex/season-2-polish-preview` at `2663e04df79125b11e30a5540930ad0ac9622bc4`, the deployed Season 2 mascot version. Reviewed both requested repositories and the available Awesome DESIGN.md skill/Nike study as text only. No installation or third-party scripts.

Changed: results scorebook composition, semantic winner label and tabular score emphasis, desktop date rail/mobile stacking, literal Results heading, readable page labels and standings headers, and a consistent sticky-team hover surface. Existing fixtures, result calculation, draft storage, publication, archive snapshots, routes and controls remain intact.

Verification on matching source snapshot: 32 tests across 5 files pass; lint, typecheck, formatting of changed code and static build (131 pages) pass. Chromium at 320/390/768/1440px shows no document overflow on home/standings/bracket/entry; existing 44px targets, More Escape/focus and sticky standings checks pass. Draft/review regression passes including save/reload, invalid inputs, attestation, publication, correction and discard. Desktop and phone results/standings/entry screenshots inspected. No browser errors. Physical Safari/iOS/Android remain untested; the pre-existing Vitest config-loader warning is non-blocking.

Evidence and before/after comparison: `/home/jason/Documents/Codex/2026-11-03/task/design-study-evidence/`. This pass remains local and uncommitted; nothing pushed, deployed, merged or published.
