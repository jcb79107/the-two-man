# Ponytail cleanup — November 7, 2026

Historical audit before legacy retirement. The old app and its dependencies have
since been removed from the active tree; see [preservation and recovery](LEGACY-APP.md).

What this repo does: serves the public offseason archive, retains a fictional
Season 2 preview, and keeps the original database app for recovery. Assumed load:
a small tournament with 18 archived teams and 25 results; no live public writes.

Scope: mapped both applications, commands, dependencies, routes and tests;
reviewed archive/publication boundaries, browser storage, scoring, admin validation,
authentication and release configuration. This is not a line-by-line security review.

## Fixed

1. **Root commands launched different apps.** `build` exported the public site but
   `dev` and `start` launched the database app. All three now target the public site;
   explicit `*:legacy` commands preserve recovery. Leaving this mixed risked reviewing
   or running the wrong app.
2. **Legacy numeric forms silently truncated input.** Seeds such as `4junk` and
   `4.5`, and handicaps such as `12.5junk`, passed the parser. Whole-value conversion
   and safe-integer validation now reject them. Regression tests cover invalid input,
   valid decimals and optional blanks. Leaving it allowed unintended saved values.
3. **Legacy graphics authentication failed open.** Missing auth configuration skipped
   the session check. The endpoint now always checks authentication before loading
   recaps, matching other admin APIs. Tests cover missing configuration, logged-out
   requests and authenticated missing results. It is not deployed in the static site.
4. **Scorecard headers were inert buttons.** Their only action updated unread state.
   Removed that state and made the cells ordinary content. Score inputs retain focus
   handling; front/back controls still work. Leaving it added useless keyboard stops.
5. **Unused code obscured active behavior.** Removed private unused converters, a
   parser, script types/variables, a scoring local and a test calculation. TypeScript's
   unused-local/parameter check now passes across the repository. The retired preview
   approval helper had only test callers; tests now exercise `publishDraft`, the actual
   commissioner path. Keeping both approval paths could give misleading test coverage.
6. **Setup and agent instructions were stale.** Rewrote the public and preview READMEs,
   corrected legacy commands/recovery guidance, removed an obsolete preview URL and
   branch requirement, and documented PR checks instead of direct main pushes.

## Retained / follow-up

7. **Legacy dependency advisories remain.** `npm audit --omit=dev` reports 19 findings
   (2 critical, 11 high, 6 moderate), including Next.js and Sentry chains. They are not
   installed by the public deployment. Update and test this stack before restoring
   the database app. The deployed `preview/` production dependencies report zero.
8. **Large legacy components remain.** The private scorecard and graphic renderer
   contain real recovery behavior. Splitting them without a product change would
   add churn; deleting them would remove recovery capabilities. No broad CSS purge
   or database refactor was attempted without proof of unused behavior.

## Verification

- 125 legacy unit tests and 62 public/preview unit tests pass.
- 24 demo and 6 offseason browser checks pass on desktop and emulated mobile.
- Both linters, type checks, preview formatting, demo build, live build and tracked
  artifact check pass. Both apps also pass unused-local/parameter checks.
- Live export: 91 static pages; reported first-load JavaScript remains 157 kB.
  This is a build measurement, not field Core Web Vitals.
- Season 1 SHA256 remains
  `b3954c209d4c604bee07c3a9fbdc15331674e0380f7887b3b4c169976dca9a87`.
- No database commands, migrations, fixture publication or private-data imports ran.

Verdict: the public site can ship this cleanup. The legacy app needs dependency
remediation before being restored to production.

Lean: removed unused state, helpers and types; added no dependencies or abstractions.
Not checked: physical iOS Safari, live database mutations, every legacy UI path,
and field performance. Existing uncommitted work in the canonical checkout was preserved.
