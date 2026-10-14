# Historical Next.js key exposure follow-up

Reviewed October 14, 2026. No secret values are recorded here.

## Evidence

- Commit `f8fc0d82a4951a0b9897a603355365bbc7ac1efd` removed the tracked
  `.next.bak/cache/.rscinfo` file. The initial import had included it.
- The file contained a real generated Server Actions encryption key. Its cache
  expiry metadata was April 7, 2026. This is a build-cache expiration, not runtime
  revocation: an already running build can retain its key.
- Current production deployment `dpl_5euumy8gp79TH77GAydARHMZAhkW` runs the
  July 13 cleanup commit. Its build logs identify Next.js 15.5.20 and a restored
  build cache. Next.js regenerates an expired cached key during builds.
- Neither the production deployment environment nor current project settings
  includes `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`. The latest preview also lacks
  this override. The deployed file inventory contains no `.rscinfo` backup.
- Vercel's deployment listing returned 20 retained deployments with no next
  page, dated May 5 through October 14. None predates the exposed cache expiry.
  Individual historical runtime keys were not available for comparison.

These findings strongly suggest the exposed key is not the current production
key. They do not constitute an exact runtime-key comparison or proof that no
historical misuse occurred. The private runtime manifest was not accessible.

## Safeguards

- GitHub secret scanning and secret-scanning push protection were enabled and
  confirmed through the repository API on October 14. Supported secret patterns
  are covered; this is not a guarantee that every generated framework key is detected.
- `.gitignore` excludes Next.js backups, standalone `.rscinfo` files, and private
  `.env.*` variants. Sanitized `.env.example`, `.env.sample`, and `.env.template`
  files remain allowed; never put actual credentials in them.
- `npm run security:artifacts` rejects tracked Next.js output/backups,
  `.rscinfo`, `.vercel`, `node_modules`, and private environment files, including
  nested paths. CI runs it before installing dependencies. It checks the Git
  index, so force-added files are caught. This is not a content secret scanner.
- Verification: current index passed; isolated Git fixtures confirmed allowed
  source/examples and rejected four generated/private-file cases. Script syntax,
  targeted ESLint, and whitespace checks passed. No app runtime code changed.

## Operational disposition

Keep the alert classified as a genuine historical exposure, not a false positive.
Do not record the secret in an issue, log, command argument, or this document.
No production deploy, key override, deployment deletion, or history rewrite was
performed. The CI guard requires review and merge before it protects main.

For definitive rotation at the next approved production release, use a clean
build without restoring build cache and verify the resulting private manifest
against the historical key using equality only, without printing either value.
Do not introduce a permanent fixed key merely to close this alert. Audit retained
deployments and aliases before retiring old builds; deleting deployments can
break preview links and remove rollback options. History rewriting alone does
not revoke keys and cannot remove existing clones or forks.

References:
- https://nextjs.org/docs/app/guides/data-security
- https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
