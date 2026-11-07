# Agent Operating Rules

GitHub `origin/main` is the source of truth for this project.

Canonical repo:

- Local path: `/Users/jason/Developer/active/the-two-man`
- GitHub remote: `https://github.com/jcb79107/the-two-man`
- Production domain: `https://www.thetwoman.site`
- Existing Vercel project: `the_two_man`

These rules apply to Codex, OpenClaw, Claude, Telegram-driven agents, and any other automated coding path.

## Live offseason site

The public site now builds from `preview/` with `npm run build:live`. Root
`npm run build` runs that build; `npm run build:legacy` retains the old database app
for recovery only. Never deploy the fictional Season 2 build to production.
Read `preview/docs/OFFSEASON-LAUNCH.md` for release and rollback procedures.
The immutable Season 1 archive and production database must not be changed by UI work.
Use an isolated checkout when the canonical checkout contains unrelated user edits.

## Isolated Season 2 preview work

- For Season 2 work, use the current branch based on `origin/main` and the app in `preview/`, not the retained database app.
- Work in `preview/`; read its `DESIGN.md` and `UX-CONTRACT.md`. Trace fixtures, separate drafts, publication and derived views before changing them.
- Reuse existing components and browser features. Simplify demonstrated duplication without removing validation, accessibility, storage-failure handling or tests.
- Keep this fictional, browser-local demo free of real data, credentials and integrations. Do not infer recovery of uncommitted work from another machine.
- From `preview/`, run tests, lint, typecheck and build; inspect changed UI at desktop and narrow phone widths, including draft/review navigation.

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

- Inspect the canonical checkout and fetch `origin/main` before editing. Preserve unrelated local changes by using an isolated checkout based on current main.
- Commit only intended changes, push the task branch, and merge through a pull request after required checks pass. Do not bypass checks or force-push main.
- Commit and push code changes to GitHub before any production deploy.
- Do not deploy a dirty worktree directly to Vercel.
- Use `npm run deploy:prod` for production deploys; it refuses to deploy unless the current branch is clean and synced with GitHub.
- Do not create a new Vercel project for this app.
- If a schema changes, run the database migration or `npm run db:push` equivalent before promoting code that reads the new columns.
- For score fixes, prefer correcting the official scorecard data and republishing/backfilling snapshots over adding one-off display patches.
- For production data-only fixes, make the approved database change, report the exact row/result, and do not invent a Git commit unless code or config changed.

## Project-scoped simplicity guidance

Adapted from [Ponytail](https://github.com/DietrichGebert/ponytail),
[core guidance](https://github.com/DietrichGebert/ponytail/blob/main/skills/ponytail/SKILL.md),
reviewed 2026-10-21. Copyright (c) 2026 DietrichGebert, MIT;
see [the preserved license](docs/ponytail-LICENSE.txt).
This is instruction-only guidance for this repository; no plugins, hooks, or dashboards are required.

- Trace the affected user flow and data boundaries before editing. Inspect callers,
  existing components/helpers, tests, fixtures, configuration, and the working diff.
- Reuse the project's established components and patterns first, then platform APIs
  and installed dependencies. Add a dependency only for a demonstrated need.
- Make the smallest readable change that completes the requested behavior across
  its callers and tests. Avoid speculative wrappers, options, abstractions, and
  unrelated rewrites; fewer lines alone are not a reason to change working code.
- For requested cleanup, establish why code is redundant and preserve behavior,
  ordering, edge cases, and public contracts. Leave uncertain simplifications alone.
- Preserve trust-boundary validation, authorization, privacy, error handling,
  accessibility, and existing test coverage. Never simplify away a safety check.
- Use existing tests to verify equivalence; add focused regression coverage for
  changed nontrivial logic. Run relevant checks, review the final diff, and report
  exactly what ran, what was skipped, and any remaining risk.
- Preserve unrelated local work. Task-specific instructions about branches,
  committing, pushing, deployment, and data changes take precedence over defaults.

### Two-Man application boundaries

Follow routes/actions through `src/lib/server` and the scoring helpers before
changing tournament behavior. Reuse existing form/scorecard validators and UI
components. Preserve handicap calculations, match-play rules, qualification,
bracket progression, official result snapshots, and production database guards.
Cleanup does not authorize migrations, score corrections, imports, or production writes.
Checks: `npm test`, `npm run lint`, `npm run build`, and `npm run security:artifacts`
as relevant. Tests live in `tests/`; do not run operational data scripts as tests.
