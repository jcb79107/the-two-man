# Two-Man user journeys

## Players and spectators

Browse without an account. Start with recent results; find a match, understand the outcome and check the gross/net card and agreed strokes. Use standings and the bracket to understand qualification and the next match. Use History to revisit official past results and careers. Players arrange matches and send scorecards/GHIN evidence outside the site; there is no player upload or scheduling flow.

## Commissioner

Open the results desk, select Enter result on a pending match or Resume draft. Enter course, tees, all four players' gross scores and externally supplied strokes. Review the calculated result against the evidence and attest before publishing. A correction needs a reason and leaves the existing result public until publication. A failed save retains the draft and offers retry. Published results also feed downloadable Instagram graphics.

The current-season implementation remains a fictional, browser-local demo. These interactions are tested but are not production authorization, cross-device persistence or an evidence-storage system.

## Historical integrity

The 2026 archive comes from official snapshots, not recomputation under 2027 rules. Public identities and source match IDs are preserved with a namespace separating them from sample fixtures. The real bracket follows recorded feeder relationships. Missing dates, extra-hole counts, player cards and prize amounts remain unknown. All-time records exclude sample 2027 data.

## Acceptance and verification

- All 25 official outcomes and 18 complete cards reconcile with preserved source snapshots; the public projection also exactly matched production on November 7, 2026.
- Browser journeys cover history → final → career, record filters/reload, gross/net and front/back card controls, scenario validation, pending entry/publication, correction persistence, storage-failure retry, damaged draft preservation, and all three PNG exports.
- Main-route smoke checks run on desktop and mobile, fail on page errors and document overflow, and capture review screenshots.
- CI runs unit tests, lint, typecheck, build and the browser suite. Preview routes remain noindex.

## Release boundary

No production data, credentials, evidence or schema is changed by this work. No production deployment has occurred. Revert the feature commit to restore the previous preview; the preserved database branch and original application remain separate. Live Season 2 rollout still needs commissioner authentication, durable result revisions, explicit season setup and approved prize terms. Safari/Firefox, field performance and a full accessibility audit remain separate verification work.
