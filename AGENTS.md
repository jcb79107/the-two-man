# Agent Operating Rules

GitHub `origin/main` is the source of truth for this project.

- Commit and push code changes to GitHub before any production deploy.
- Do not deploy a dirty worktree directly to Vercel.
- Use `npm run deploy:prod` for production deploys; it refuses to deploy unless the current branch is clean and synced with GitHub.
- If a schema changes, run the database migration or `npm run db:push` equivalent before promoting code that reads the new columns.
- For score fixes, prefer correcting the official scorecard data and republishing/backfilling snapshots over adding one-off display patches.
