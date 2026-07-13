# Architecture

The Two Man is a focused Next.js app for one private season-long golf tournament:
pod play, playoff qualification, an eight-team bracket, commissioner operations,
and public result following.

## Runtime Shape

- **App host:** Vercel project `the_two_man`
- **Production URL:** https://www.thetwoman.site
- **Source of truth:** `jcb79107/the-two-man` on `main`
- **Database:** PostgreSQL through Prisma, with a production DB guardrail
- **Observability:** Sentry, Vercel Speed Insights, optional Microsoft Clarity checks

## Directory Map

```text
app/
  admin/                         Commissioner dashboard and admin match tools
  api/                           Route handlers for admin, courses, scorecards, public APIs
  invite/[token]/                Invite redirect route
  match/[token]/                 Private match setup/scorecard flow
  tournament/[slug]/             Public home, standings, bracket, rules, match pages
src/
  components/                    Shared public/admin UI components
  lib/api/                       Route builders
  lib/content/                   Static external-link content
  lib/demo/                      Preview fallback data
  lib/providers/                 Course lookup provider boundaries
  lib/scoring/                   Match-play and net better-ball scoring engine
  lib/server/                    Server-only data access, bracket sync, standings, admin ops
  types/                         Shared app model types
prisma/
  schema.prisma                  Database schema
  seed.ts                        Destructive local/demo seed
scripts/
  import/export/admin utility scripts
tests/
  Vitest regression suite
docs/
  Current runbooks, tournament rules, audit notes, and deployment notes
public/
  Favicons, web manifest, logo, and export font
```

## Main User Surfaces

- `/` redirects or renders the latest tournament home.
- `/tournament/[slug]` is the public hub with feed and navigation.
- `/tournament/[slug]/standings` shows pod standings, playoff picture, and all teams.
- `/tournament/[slug]/bracket` shows the current playoff bracket and advancement.
- `/tournament/[slug]/rules` presents the rules and rules-judge link.
- `/tournament/[slug]/matches/[matchId]` is the public match/result page.
- `/match/[token]` sends a private participant to setup or scorecard.
- `/admin` is the commissioner control center.

## Data Model

The Prisma schema centers on:

- `Tournament`, `Pod`, `Team`, `Player`, and `TeamPlayer`
- `Match`, `MatchPlayer`, `HoleScore`, `MatchAuditLog`, and `MatchInvitation`
- `Bracket` and `BracketRound`
- `Course`, `CourseTee`, `CourseHole`, and lookup cache records
- `ActivityFeedEvent`
- `OfficialResultSnapshot`

Official result snapshots are the stable public source for finalized match cards.
For score corrections, update the official scorecard data and backfill snapshots
instead of adding display-only patches.

## Scoring And Bracket Flow

Pod matches use 2-man net better-ball match play with hole points. The scoring
engine calculates player strokes, net scores, team better-ball, hole outcomes,
match summaries, standings inputs, and forfeit outcomes.

After pod play:

- Six pod winners and two wild cards qualify.
- Seeds 1-6 are pod winners ranked by tournament tiebreakers.
- Seeds 7-8 are wild cards ranked by wild-card criteria.
- Bracket sync creates/updates quarterfinal, semifinal, and championship rounds.
- Playoff matches use simple winner/result labels for public bracket mode.

Old slug aliases remain in the public tournament lookup so historical or shared
links can resolve to the live tournament where possible.

## Admin Operations

The admin surface supports:

- Login/logout through `ADMIN_PASSWORD` and signed admin cookies
- Match ops lists, private links, invite copy/email helpers, and local sent-state tracking
- Pod scorecard setup and publishing
- Playoff result posting without a detailed hole-by-hole bracket scorecard
- Reopen, forfeit, reset, override, bracket sync, and audit log flows
- Roster/team/pod import helpers
- Server-rendered Instagram recap PNG generation

## Course Lookup

Course search favors stored full-scorecard data first, then curated Chicagoland
fallbacks, then optional provider calls. Provider boundaries live under
`src/lib/providers/`; persisted course data lives in the Prisma course tables.

GHIN remains a future/manual integration boundary. The app stores relevant
handicap fields and asks players to post match scores separately.

## Configuration

`.env.example` is the canonical template. Runtime database selection is handled
by `src/lib/server/db.ts`, which accepts `DATABASE_URL` plus common Vercel/Postgres
aliases. Production-like environments are validated by
`src/lib/server/production-db-guardrail.ts`.

Build config:

- `next.config.ts` wraps the app with Sentry and externalizes `@resvg/resvg-js`.
- `vercel.json` runs Prisma Client generation before `next build`.
- `.vercelignore` keeps local env files, dependencies, exports, and build backups
  out of Vercel upload archives.

## Verification

CI and local checks cover lint, tests, and production build:

```bash
npm run lint
npm test
npm run build
```

The dry-run script exercises tournament progression across pod play and the
full bracket:

```bash
npm run dry-run:tournament -- the-two-man-2026
```
