# The Two Man Launch Runbook

## Tournament-day goals

Use this when running The Two Man for a private tournament.

Priority order:
1. Keep the tournament moving.
2. Fix the match state cleanly.
3. Leave an override note whenever you intervene.

## Core commissioner flow

1. Open `/admin` and sign in.
2. Confirm tournament settings and visible match list look correct.
3. Use copied invite or matchup links to send players where they need to go.
4. Watch for matches in `REOPENED`, `SUBMITTED`, or other attention-needed states.
5. If a result changes, re-open or reset the specific match instead of improvising around bad state.

## If setup is wrong

Use when a match has the wrong course, tees, handicaps, or hole template before clean scoring is complete.

Recommended action:
- Use **Reset match card** from admin.
- Add an override note explaining why.
- Have the player reopen setup and rebuild the scorecard correctly.

Why:
- Reset clears hole scores and player setup snapshots and returns the match to `READY`.
- This is safer than trying to edit around a bad setup.

## If a published match needs correction

Use when a scorecard was already published/finalized but the result is wrong.

Recommended action:
- Use **Reopen match** from admin.
- Add a commissioner override note.
- Correct the scorecard and republish.

Why:
- Reopen moves the match to `REOPENED`, clears finalization markers, and keeps the intervention explicit.

## If a match should be recorded as a forfeit

Recommended action:
- Use **Forfeit match** from admin.
- Choose the correct winner team.
- Add an override note explaining the reason.

Why:
- This marks the match as `FORFEIT`, sets the winner, finalizes the result, and keeps a clear audit trail.

## If a player says the link is broken

Check these in order:
1. Did they open the correct invite or matchup link?
2. Is the match already published, which changes where setup/scorecard routes send them?
3. Is the token simply invalid or stale?

Recommended action:
- Re-copy the invite or matchup link from admin and resend it.
- If the scorecard/setup state is wrong, reset or reopen the match instead of telling them to work around it.

## If score entry gets weird

Examples:
- publish blocked
- missing holes
- tied playoff without selected winner
- repeated clicks or player confusion

Recommended action:
1. Read the on-screen error first. Many of the common guardrails are explicit.
2. If the underlying setup is wrong, **Reset match card**.
3. If the published result is wrong, **Reopen match**.
4. If the match cannot be played, **Forfeit match**.

## Recovery rules of thumb

- Prefer **reset** for bad setup or broken in-progress cards.
- Prefer **reopen** for correcting an already-published result.
- Prefer **forfeit** for unplayed or invalid matches with a clear winner.
- Always leave an override note.

## Private-launch blocker standard

Before launch, confirm:
- admin loads
- tournament home loads
- standings load
- bracket loads
- invite path works
- setup path works
- scorecard publish path works
- commissioner recovery actions are understood

## Known current note

The local `scripts/dry_run_tournament.ts` path depends on a local `DATABASE_URL`. If local DB access is unavailable in the shell, use live admin + preview/prod flow checks instead of assuming the script can run everywhere.
