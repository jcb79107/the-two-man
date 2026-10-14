# Staging release — October 14, 2026

- Application commit: `c94af21253621a91751d296f6debd837bc3c222d`, pushed to `codex/season-2-preview`; remote SHA verified.
- Static preview: https://thetwo-hdno6b7ik-jcb79107s-projects.vercel.app
- Project: `the_two_man`, team `jcb79107s-projects`.
- Deployment: `dpl_EdomPzRW7Z7itToYQXGYYjbhzvFb`, READY, preview target; prebuilt static output, no functions or environment files.
- Commissioner: https://thetwo-hdno6b7ik-jcb79107s-projects.vercel.app/review
- Current bracket: https://thetwo-hdno6b7ik-jcb79107s-projects.vercel.app/bracket
- Completed fictional bracket: https://thetwo-hdno6b7ik-jcb79107s-projects.vercel.app/history/2026?view=playoffs

Local verification passed: 28 tests, typecheck, lint, formatting, static build and diff check. Detailed interaction coverage and remaining limits are in COMMISSIONER-VERIFICATION.md and BRACKET-VERIFICATION.md.

Hosted checks passed: public unauthenticated HTTP 200, current connected bracket and pending feeders, completed archive winners, mobile final view without document overflow, commissioner match selection, score entry and review transition. Physical iPhone Safari was not tested.

The GitHub Vercel check on the application commit succeeded. GitHub Actions CI is configured for PRs and main pushes, so no Actions run was triggered by the preview-branch push. The Git-integrated root-app preview is separate; use the static preview link above for this work.

Canonical main remained clean and unchanged. No production deployment, production data changes, or main merge. This is an openly accessible fictional-data demo with browser-local state, not a secure production admin workspace.
