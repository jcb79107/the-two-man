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
