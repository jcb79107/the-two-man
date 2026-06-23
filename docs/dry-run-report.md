# Dry Run Report

- Date: 2026-06-23T02:05:23.704Z
- Tournament: The Two Man (the-two-man-2026)
- Seed count locked: 8/8
- Pod matches completed: 18
- Playoff matches completed: 7/7
- Reopen/override path: validated by reopening Quarterfinal 2 after semifinal advancement
- Public endpoints checked: home, tournament home, standings, playoff picture, bracket, rules, public match, standings API, bracket API

## Dry Run Checks

- Pod standings resolved from completed pod-play matches
- Wild cards projected and seeded
- Quarterfinals, semifinals, and championship populated
- Playoff tiebreak publication path exercised
- Reopen rollback cleared stale downstream bracket state
- Republish after reopen rehydrated the bracket correctly
- Public match center, standings, bracket, and rules routes returned successfully

## Notes

- Dry-run course used: Dry Run Golf Club / Championship
- Handicap entry path simulated with current-index snapshots of 0.0 to keep score math deterministic
- Reset to clean launch state with: `npm run tournament:reset:state the-two-man-2026`
