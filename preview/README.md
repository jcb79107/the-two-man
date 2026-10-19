# The Two-Man · Season 02 preview

[Open the hosted Season 2 preview](https://thetwo-pzflhg88b-jcb79107s-projects.vercel.app).

A fully separate staged preview for visual and workflow review. No production data connection or live integrations. See [docs/DECISIONS.md](docs/DECISIONS.md), [DESIGN.md](DESIGN.md) and [UX-CONTRACT.md](UX-CONTRACT.md).

## Run

From this folder:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3027. No .env file is required. Do not copy production env files here.

## Review tour

1. Clubhouse: new identity, next action, fixtures, season roadmap.
2. Matches: filter/search, view an official scorecard, switch gross/net and nines.
3. Standings: pods/full field/playoff picture; team pages and earned pod awards.
4. The purse: illustrative, reconciled prize distribution; earned is not paid.
5. Commissioner demo (footer): choose a match, record course/tees and agreed timestamps, enter all 18 gross scores and supplied strokes, then review and publish.
6. Save or navigate away from a draft; return or refresh to resume. Official standings remain unchanged until publication. Discard asks before removing a draft.
7. Select an official match to correct it. A reason and fresh evidence confirmation are required; the previous published score remains visible until the correction is published.
8. Bracket: follow connected quarterfinals and semifinals into the central final, or choose a round for mobile. Open the completed sample archive and follow each match to its saved result. No advancing seeds are assumed.
9. Brand direction: mascot/wordmark concept and rationale. Reset demo restores original fixtures.

## Honest boundaries

All names, scorecards, awards and dates are fixtures. The public site has no player writes. Players text or email evidence to the commissioner outside the app. The static commissioner workspace has no login or access protection; all browser-local data is inspectable. Do not enter real cards, GHIN screenshots or personal information. No upload, AI extraction or GHIN connection exists. Real authentication, private storage, notifications, playoff administration, payout transfers, multi-device synchronization and production write safety remain unimplemented. Generated mark needs vector cleanup before print production.

The hosted link above includes the core experience changes from commit `3286f0b`, published to staging on October 14, 2026. See docs/CORE-EXPERIENCE-VERIFICATION.md for test results and remaining limits.

## Verify and export

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

The build outputs static files to `out/`; no server/database is needed to host them. The root application and production deployment configuration are untouched. Do not promote this preview directly to production. Review notes live in docs/VERIFICATION.md.

## Hosting this isolated preview

After a successful build, run `node scripts/package-preview.mjs` to prepare Vercel's static Build Output API bundle. Verify the existing project link before using `vercel deploy --prebuilt --target preview`. Do not use `--prod` or change the production project's root directory. Documentation: https://vercel.com/docs/build-output-api/configuration.

## Season history

Open **History** for season archives, past champions and the all-time record book. Try **2026 → Playoffs → Final → team career → player career**, or filter the record book to **Players / 2026 / Playoffs**. Current-season approval updates career stats, while the completed sample archive stays unchanged. [History architecture and acceptance notes](docs/SEASON-HISTORY.md) explain the stable identity model, metric definitions and the work required to import real seasons safely.
