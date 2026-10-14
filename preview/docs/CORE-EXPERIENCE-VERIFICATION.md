# Core experience preview — October 14, 2026

Scope: isolated static Season 2 preview. No main merge, production deployment,
production data changes, real login, GHIN connection, or real evidence upload.

## Delivered

- Results-first clubhouse and compact season heading.
- Connected eight-slot bracket: team-path highlighting, dated archived results,
  URL-preserved team/round selection, desktop tree and mobile round overview.
- Explicit 18-hole outcome breakdown on official regular-season results.
- Partnership head-to-head history with original season-specific result links.
- Four-player focused hole entry, keyboard advancement, completion indicator,
  and strictly validated 18-score paste. Full-card editing remains available.
- Existing independent drafts, attestation and correction requirements retained.

## Verification

- 32 unit tests pass across five files, including score-row validation, elimination
  paths, head-to-head aggregation, original archive preservation and publication.
- ESLint, TypeScript, Prettier and git diff whitespace checks pass.
- Next.js static build passes: 132 pages, reported 138 kB first-load app JS.
  This is a bundle measurement, not field Core Web Vitals evidence.
- Strict premium UI audit passes with zero findings. DESIGN.md lint has zero
  errors and five token-reference warnings; CSS owns the runtime tokens.
- Chrome desktop (1360 x 1000): all seven connected bracket matches visible,
  no document horizontal overflow; champion highlighting follows QF4 → SF2 → Final.
- Chrome mobile (390 x 844): overview shows only the appropriate round; archive
  final links to its result; team career exposes head-to-head rows and original
  result links. No document horizontal overflow on checked bracket/result pages.
- Invalid three-score paste is rejected with an inline error. Valid 18-score paste
  applies to the chosen player. Hole navigation and Enter-to-next-player work.
  Pasted values survive reload; checked the live input value, not its stale HTML
  value attribute (React number inputs can retain a previous attribute).
- Review refuses publication without attestation. With attestation a fictional
  m1 result publishes and its public scorecard displays 11.5–6.5, with 5 holes won,
  13 halved, and 0 lost. Drafts do not change results before publication.
- Browser warning/error capture returned none after the tested workflow.
- Screenshot evidence: /Users/jason/Developer/reports/two-man-core-preview-2026-10-14/bracket-desktop.png

## Limits

Fictional fixtures only. Browser-local persistence is neither private nor shared
across devices; commissioner demo has no authentication. Real Season 1 history is
not imported. Playoff administration and production authorization/persistence
remain separate work. No full screen-reader, cross-browser or field performance
certification is claimed. This preview must not be promoted directly to production.

## Hosted preview

Deployed commit `3286f0b` to the existing Vercel project's preview environment:
https://thetwo-ayip8rck1-jcb79107s-projects.vercel.app

Deployment `dpl_BtmPsL2hMSa7vXiKNm8ft9LQvMCB` reached READY. Hosted browser
smoke checks confirmed the results-first homepage, focused commissioner entry,
and archived bracket/final link; captured browser warnings/errors were empty.
The packaged output contains no runtime function directory, environment files,
or `.rscinfo` files. No production promotion was performed.
