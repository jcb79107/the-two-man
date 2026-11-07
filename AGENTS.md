# Agent operating rules

- Source: `origin/main` in `jcb79107/the-two-man`.
- Canonical checkout: `/Users/jason/Developer/active/the-two-man`.
- Live domain: https://www.thetwoman.site; existing Vercel project: `the_two_man`.
- Inspect the canonical checkout and fetch main. Preserve unrelated local work;
  use an isolated checkout when necessary. Never force-push main.
- Work in `preview/`; read its AGENTS.md, DESIGN.md and UX-CONTRACT.md.
  The old database app has been retired. Do not restore it as a shortcut.
- Root dev/build/start target the public offseason site. The default build inside
  `preview/` is the fictional Season 2 demo; never promote that build to production.
- Preserve `preview/src/season1-public.json` and its pinned hash. No database
  writes, resets, migrations, seeds or branch deletions are authorized by UI work.
  See `docs/LEGACY-APP.md` for data preservation and code recovery.
- Keep private cards, GHIN IDs, tokens and contact details out of Git and public UI.
- Players use group texts and GHIN. Do not add scheduling forms or an in-app chat.
  Preserve the tournament's one-stroke-per-hole cap.
- Run root test, lint, typecheck, build and security:artifacts commands. Run the
  relevant browser suites for both live and demo changes; preserve error handling,
  storage failure recovery, accessibility and archive integrity coverage.
- Commit only intended changes, push a branch, and merge through a PR after checks
  pass. Deploy only clean, synced main code with `npm run deploy:prod`.
- Follow `preview/docs/OFFSEASON-LAUNCH.md` for release checks and rollback.

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
