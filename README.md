# The Two-Man

Live site: https://www.thetwoman.site
Source: `origin/main` · Vercel project: `the_two_man`

The live offseason site uses the new UI in `preview/`. It presents the official
2026 results, standings, bracket and player records while the Season 2 field and
format are undecided. It is a static, read-only site with no database connection.

## Develop and verify

```sh
npm ci --prefix preview
cd preview
NEXT_PUBLIC_SITE_MODE=offseason npm run dev
npm run typecheck
npm run lint
npm test
npm run build:live
npm run test:offseason
```

`npm run build` inside `preview/` builds the separate fictional Season 2 demo.
At the repository root, `npm run build` builds the live offseason site.

## Release

Read [the launch and rollback guide](preview/docs/OFFSEASON-LAUNCH.md).
Commit and push main before `npm run deploy:prod`. Git deployments use the root
`vercel.json` to install and build only the new public site.

The Season 1 database app remains in the repository for recovery, not as the
public entry point. Its setup documentation is in [Legacy app](docs/LEGACY-APP.md).
Do not run database reset, seed or migration commands for this static site.
