# The Two-Man

[thetwoman.site](https://www.thetwoman.site)

The offseason site shows Season 1 results, standings, the playoff bracket and
player records. Season 2 details will follow once the field and format are set.

## Run locally

From the repository root:

```sh
npm ci --prefix preview
npm run dev
```

Open http://127.0.0.1:3027. `npm run build` exports the live offseason site;
`npm start` serves that export. The site uses the read-only Season 1 archive and
needs no database or credentials.

## Check changes

```sh
npm test --prefix preview
npm run lint --prefix preview
npm run typecheck --prefix preview
npm run build
npm run test:offseason --prefix preview
```

The fictional Season 2 demo has separate [development instructions](preview/README.md).
The retained database app uses `dev:legacy`, `build:legacy` and `start:legacy`;
see [legacy setup](docs/LEGACY-APP.md). Root `npm test` and `npm run lint` check that app.

## Deploy

Merge verified changes to `main`, then run `npm run deploy:prod` from a clean,
synced checkout. It deploys to the existing Vercel project, `the_two_man`.
See [release checks and rollback](preview/docs/OFFSEASON-LAUNCH.md).

Do not edit the Season 1 archive or run database resets, seeds or migrations for
public-site work.
