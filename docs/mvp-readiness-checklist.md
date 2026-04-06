# MVP Readiness Checklist

## 1. Standings and Playoff Trust Pass

- Validate pod standings against the official rules
- Validate wild card selection
- Validate playoff seeding
- Validate bracket advancement after scorecard publish
- Validate bracket rollback behavior after admin reopen/override
- Validate forfeit handling in standings and qualification

## 2. Admin Workflow Cleanup

- Tighten commissioner setup flow
- Improve match operations and status visibility
- Improve bracket controls and standings review
- Make reopen/override flow easier to understand

## 3. Public Experience Polish

- Refine standings page scanability
- Refine bracket page presentation
- Refine activity feed hierarchy and event copy
- Refine public match/result page details

## 4. Auth and Protection

- Protect `/admin`
- Preserve simple private match links
- Confirm public pages remain read-only

## 5. Dry Run Preparation

- Clear staged/test/demo data before the official dry run
- Run `npm run tournament:reset:state`
- Start the app from a clean tournament state
- Seed only the real field and real pods
- Verify tournament rules are accessible in-app where needed

## 6. Full Tournament Dry Run

- Simulate pod-play completion
- Simulate playoff qualification
- Simulate quarterfinals, semifinals, and championship
- Simulate admin reopen/override after a posted match
- Validate mobile scoring flow end to end

## 7. Final Launch Reset

- Clear staged/test/demo data again after the dry run
- Run `npm run tournament:reset:state`
- Reset the app to a clean official starting state
- Confirm real players, real teams, real pods, and empty official standings
- Confirm production env vars and credentials

## 8. Deployment and Go-Live

- Add the final favicon
- Create the Linux PC migration plan
- Buy and connect the production domain
- Deploy the app and database to the chosen production host
- Run final production smoke tests on public, private, and admin flows
- Confirm backups and restart behavior before announcing the site

## Architecture Documentation Timing

- Generate `ARCHITECTURE.md` after the standings/playoff trust pass is complete
- Do it before the dry run, so the document reflects the real final system shape instead of the early scaffold
