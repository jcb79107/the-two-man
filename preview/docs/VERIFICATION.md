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
