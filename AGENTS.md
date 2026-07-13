# Agent Operating Rules

GitHub `origin/main` is the source of truth for this project.

Canonical repo:

- Local path: `/Users/jason/Developer/active/the-two-man`
- GitHub remote: `https://github.com/jcb79107/the-two-man`
- Production domain: `https://www.thetwoman.site`
- Existing Vercel project: `the_two_man`

These rules apply to Codex, OpenClaw, Claude, Telegram-driven agents, and any other automated coding path.

## Shared AI Agent Rules

- Prefer the smallest correct change that fully solves the task.
- State material assumptions; for low-risk local details, proceed and note them.
- Read the relevant files before editing.
- Do not refactor, reformat, rename, or improve unrelated code.
- Match the existing style and project patterns.
- Remove only dead code introduced by your own change.
- For bugs, reproduce the issue first when practical, then fix it.
- Verify with the narrowest meaningful check: test, typecheck, lint, build, or
  manual check.
- If broader cleanup is useful but unrelated, mention it separately instead of
  doing it.

- Start every task from the canonical repo path above. Do not use the old `fairway-match` path for this project.
- Before editing, run `git fetch origin main`, confirm the current branch is `main`, and confirm the working tree is clean.
- If local `main` is behind `origin/main`, run `git pull --ff-only origin main` before editing.
- If local `main` has uncommitted changes or diverges from `origin/main`, stop and report that instead of stacking new work on top.
- End every code/config change by committing the intended files and pushing `main` to GitHub with `git push origin main`.
- Commit and push code changes to GitHub before any production deploy.
- Do not deploy a dirty worktree directly to Vercel.
- Use `npm run deploy:prod` for production deploys; it refuses to deploy unless the current branch is clean and synced with GitHub.
- Do not create a new Vercel project for this app.
- If a schema changes, run the database migration or `npm run db:push` equivalent before promoting code that reads the new columns.
- For score fixes, prefer correcting the official scorecard data and republishing/backfilling snapshots over adding one-off display patches.
- For production data-only fixes, make the approved database change, report the exact row/result, and do not invent a Git commit unless code or config changed.

## Codex Project Brief

Use this section to get productive quickly in a new Codex session. It is a
project map, not permission to bypass the operating rules above or any
controller-level task constraints.

### What This App Is

The Two Man is a mobile-first tournament operating system for a private,
season-long two-man net better-ball match-play golf season. The product serves
three main audiences:

- public viewers checking the tournament home, standings, bracket, rules, and
  match pages
- players or scorekeepers using private tokenized match setup and scorecard
  links
- the commissioner using the admin desk for match operations, imports,
  corrections, graphics, and launch operations

The MVP assumes one commissioner-operated tournament first. The schema is more
general than that, but most product work should preserve the simple single-event
operating model unless the owner explicitly asks to broaden it.

### Stack And Runtime

- Next.js App Router, React, TypeScript, and Tailwind CSS
- Prisma over PostgreSQL
- Vitest for unit and domain regression tests
- Vercel production deployment for the canonical site
- No separate backend service, queue, Redis cache, or object storage is present
  in the repo

Important scripts:

- `npm run dev`: local Next.js development server
- `npm run lint`: ESLint check
- `npm test`: Vitest test suite
- `npm run build`: production build
- `npm run prisma:generate`: regenerate Prisma client after schema changes
- `npm run prisma:migrate`: local Prisma migration workflow
- `npm run prisma:seed`: seed local data
- `npm run deploy:prod`: guarded production deploy command

Do not run deployment, migration, reset, import, or external-provider scripts
unless the task explicitly asks for that operation and the active environment
constraints allow it.

### Codebase Map

- `app/`: Next.js pages, layouts, route handlers, server actions, and loading
  states
- `app/tournament/[slug]/...`: public tournament home, rules, standings,
  bracket, and public match pages
- `app/match/[token]/...`: private player/scorekeeper match workspace
- `app/admin/...`: commissioner UI and admin match setup/scorecard routes
- `app/api/...`: JSON APIs for public standings/bracket, private scorecards,
  course search, graphics, and admin bootstrap
- `src/components/`: reusable UI components and page-level client views
- `src/lib/scoring/`: pure scoring and match-play domain logic; prefer keeping
  this deterministic and well-tested
- `src/lib/server/`: database-backed business workflows, read models,
  validation, auth helpers, bracket sync, standings, public tournament assembly,
  invitations, admin operations, and guardrails
- `src/lib/providers/`: external course/handicap provider boundaries and
  adapters
- `src/lib/content/`: in-app rules and rules-judge content
- `src/lib/api/routes.ts`: shared route builders; use these instead of
  hardcoding internal app URLs when practical
- `src/types/`: shared app model types
- `prisma/schema.prisma`: canonical data model
- `prisma/seed.ts`: local/bootstrap seed data
- `scripts/`: operator tools for imports, dry runs, graphics, course exports,
  bracket previews, recap exports, resets, and deploy guardrails
- `tests/`: Vitest suites covering scoring, standings, bracket progression,
  qualification, routing, validation, admin import, public APIs, and guardrails
- `docs/`: product, rules, readiness, observability, deployment, and handoff
  documentation

### Domain Concepts

- A tournament contains players, teams, pods, pod-play matches, playoff bracket
  matches, courses, tees, activity feed events, and invitations.
- Teams are two-player teams. Pod play determines qualification and seeding for
  the playoff bracket.
- Matches have private tokens for score entry and public scorecard slugs for
  viewer-safe URLs.
- Match status values include scheduled, ready, in progress, submitted, final,
  forfeit, and reopened states.
- The scoring engine computes course handicap, playing handicap, stroke
  allocation, gross/net better-ball results, hole points, and match outcomes.
- Official result snapshots exist to preserve published match results. For score
  fixes, prefer correcting official scorecard data and republishing or
  backfilling snapshots over adding one-off display patches.
- Bracket progression and standings are shared business rules. Update the
  relevant `src/lib/server/*` module and tests together when behavior changes.

### Sensitive Boundaries

- Never read, print, edit, or create credential files such as `.env`, local
  tokens, cookies, private keys, or database URLs unless a higher-priority,
  explicit owner instruction permits it.
- Authentication, payments, databases, production data, and external services
  are high-risk areas. Treat changes there as explicit-scope work only.
- Provider adapters in `src/lib/providers/` may touch external systems. Keep core
  app behavior behind provider interfaces and avoid adding direct provider calls
  in page components.
- Production data-only fixes should be reported as exact row/result changes and
  should not be mixed with unrelated code changes.

### Implementation Guidance

- Prefer the smallest correct change and match the surrounding style.
- Read the relevant route, component, server module, schema model, and tests
  before editing.
- Keep route handlers and pages thin. Put shared business behavior in
  `src/lib/server/` or pure domain modules as appropriate.
- Keep scoring logic pure in `src/lib/scoring/` and cover it with focused tests.
- Use Prisma relations and typed queries instead of ad hoc data shaping when the
  model already supports the workflow.
- Use `server-only` boundaries and existing server modules for database-backed
  logic.
- Preserve mobile-first UX. Public/player screens should be warm and quick to
  scan from a phone; admin screens can be denser and more operational.
- Follow `DESIGN.md`: pine and fairway green are core colors, gold is the brand
  accent, purple is reserved for playoff/bracket state, Avenir Next is the app
  typeface, and marketing-style hero copy does not belong on operational
  screens.
- Use existing components such as `section-card`, `public-nav`,
  `standings-table`, `bracket-view`, `private-match-workspace`, and scorecard
  components before introducing new UI patterns.
- Do not refactor, rename, reformat, or modernize unrelated code while solving a
  specific task.

### Verification Guidance

Choose the narrowest check that exercises the changed behavior:

- Pure scoring or match-play changes: `npm test -- tests/scoring-engine.test.ts`
  and/or `npm test -- tests/match-play.test.ts`
- Standings or qualification changes: the corresponding `standings`,
  `qualification`, `playoff-scenarios`, and public API tests
- Bracket changes: `bracket`, `bracket-sync`, and tournament progression tests
- Admin validation/import changes: admin validation/import/bootstrap tests
- Route behavior changes: relevant routing or API tests
- UI-only changes: lint plus a local manual check when practical
- Shared or uncertain changes: `npm run lint`, `npm test`, and `npm run build`

If a check cannot be run, report that clearly with the reason.

### Key Documentation

- `README.md`: setup, stack, and current status
- `ARCHITECTURE.md`: broader system layout and module responsibilities
- `DESIGN.md`: visual language and UX rules
- `CONTRIBUTING.md`: branch, PR, and verification expectations
- `docs/tournament-rules.md`: tournament rules reference
- `docs/foundation.md`: MVP product foundation
- `docs/integration-strategy.md`: provider and integration direction
- `docs/observability-runbook.md`: production observation and incident notes
- `docs/vercel-deployment.md`: deployment procedure
- `docs/next-session-handoff.md`: current human handoff notes
