# Persona Follow-Ups

This document separates the persona-driven launch improvements that are already implemented from the ideas worth revisiting after the launch-hardening pass.

## Implemented in the launch-hardening pass

- Public `Rules / Format` page
- Plain-English playoff explainer inside the `Playoff picture` view
- Commissioner audit history on `/admin`
- Dedicated commissioner forfeit actions in `Match Ops`
- Scorekeeper recovery banner when a local draft is restored
- Compact setup/scoring help blocks on the private scorecard flow

## Strong next enhancements after launch prep

### Commissioner

- Match-level audit drawer showing a fuller before/after history for reopen, reset, forfeit, and republish actions
- `What changed since yesterday` ops summary card on `/admin`
- Safer destructive confirmations with typed confirmation for reset/forfeit in production mode

### Scorekeeper

- More explicit hole-level stroke indicator during scoring for players who want a faster “who gets one here?” answer
- Stronger resume-state CTA when returning to a saved scorecard on a different device or browser session
- Tiny “weird case” help drawer covering wrong tee, wrong index, wrong player, and playoff tiebreak edge cases

### Competitor / Fan

- Team detail page showing pod record, hole points, holes won, total net better-ball, and playoff path
- Richer public bracket cards with clearer `LIVE`, `FINAL`, and `Awaiting opponent` states
- Public match cards with a small “winner advances to…” cue during bracket play

### Future Integrations

- GHIN handicap sync once a working authorized account or API path is available
- Optional outbound invite/email delivery instead of manual link sharing
