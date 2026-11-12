![The Two-Man golf banner with mascot golfers](data/brand/two-man-banner.png)

The Two-Man is a two-person team golf tournament. Follow match results, standings
and the playoff bracket, explore past seasons and player records, and revisit the
matches that decided the championship.

Season 1 is in the books. Season 2 details are coming this winter.

[Visit thetwoman.site](https://www.thetwoman.site)

## Development

Use Node.js 24 and run `npm ci --prefix preview` from the repository root.
`npm run dev` starts the public offseason site; `preview/` contains the deployed
application as well as the fictional Season 2 demo.

Before opening a PR, run `npm run lint`, `npm test`, `npm run typecheck`,
`npm run format:check`, `npm run security:artifacts`, and `npm run build`.
The root build is the live offseason export; the default build inside `preview/`
is the fictional demo and must not be deployed to production.

See [contributing](CONTRIBUTING.md), [app setup](preview/README.md), and
[release checks](preview/docs/OFFSEASON-LAUNCH.md).
