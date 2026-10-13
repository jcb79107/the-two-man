# The Two-Man · Season 02 preview

[Open the hosted Season 2 preview](https://thetwo-puo19dxos-jcb79107s-projects.vercel.app).

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
5. Submit a card: use the staged card, test missing agreement or simulated failure, then submit.
6. Try commissioner review: correct scores, save a draft, inspect the immutable source and agreed strokes, then approve. Standings and review queue update; refresh preserves saved sample changes.
7. Upcoming match: record a date; lock sample strokes. A tee time less than 24 hours after the staged June 24 noon clock is rejected.
8. Bracket: switch URL-backed rounds; preview a completed final. This illustration is separate from the active season.
9. Brand direction: mascot/wordmark concept and rationale. Reset demo restores original fixtures.

## Honest boundaries

All names, scorecards, awards and dates are fixtures. Real file selection previews the image locally; it is never uploaded and disappears after refresh. The supplied sample transcription is not an AI result. GHIN retrieval, secure storage, real authentication, notifications, playoffs administration, payout transfers, multi-device synchronization and production write safety are not implemented. The commissioner role toggle is a demo affordance, not an authorization system. Generated mark needs vector cleanup before print production.

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
