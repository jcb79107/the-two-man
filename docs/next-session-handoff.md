# Next Session Handoff

## Status

- Core tournament flows are in strong shape.
- Admin protection, invite workflows, standings, bracket logic, and private/public scorecard flows are working.
- Current work is in the final polish and launch-prep phase.

## First Focus Tomorrow

- Final UI/UX adjustments across:
  - homepage
  - standings
  - bracket
  - public match pages
  - private setup and scorecard flows
  - admin desktop and mobile polish

## Add Tomorrow

- Add a real website favicon

## Deployment Planning Tomorrow

- Create a step-by-step migration plan from the Mac laptop to the Linux PC
- Decide the cheapest production hosting path
- Set up the production deployment checklist:
  - app transfer
  - env vars
  - database migration / import
  - process manager
  - tunnel / domain
  - backups
  - smoke test after deploy

## Launch Plan Work Tomorrow

- Buy the website/domain
- Connect hosting
- Verify the public site works end to end
- Confirm private scorecard links work after deploy
- Confirm admin works after deploy

## Keep In Mind

- The local app should start from a clean tournament state before real launch
- Final human smoke testing on iPhone Safari still matters before going live
- Use the existing email invite workflow in admin for matchup distribution
