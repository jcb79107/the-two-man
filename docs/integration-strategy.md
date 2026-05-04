# Fairway Match Integration Strategy

## Product target

The intended product experience is:

- Admin logs in and creates the tournament in-app
- Admin enters player name, email, GHIN number, team, pod, and seed
- System uses GHIN-backed handicap data rather than manual entry whenever possible
- Match invitations are sent by email with private scorecard links
- First player into the match link selects course and tees
- System looks up course rating, slope, par, and hole handicap allocation
- System calculates every player's course handicap, playing handicap, and hole strokes
- One or more players can keep score on mobile during the round
- At least one scorer enters all four gross scores hole by hole
- System computes gross, net, team better-ball, hole points, standings, feed events, and bracket progression
- Public viewers can browse the tournament home, bracket, schedule, locations, tees, and archived scorecards

## Feasibility reality check

### GHIN handicap lookup

Desired state:

- Admin enters GHIN number
- Fairway Match pulls the current Handicap Index in real time
- Index can be refreshed as the season progresses

Current reality:

- GHIN is an official USGA product and provides score posting and admin tooling through the GHIN app, ghin.com, and the USGA Admin Portal
- The public USGA materials reviewed do not expose public API documentation for third-party apps to pull golfer handicap data directly

Implementation conclusion:

- We should architect for GHIN sync
- In this workspace, the user has indicated an approved scrape-backed lookup path may be available for their own tournament operations
- Fairway Match should therefore support two integration modes:
  - `scrape-backed private mode`
  - `official provider mode`
- Both should sit behind the same provider interface so the product UX does not change later

### GHIN score posting on behalf of players

Desired state:

- Fairway Match posts the round directly into each player's GHIN record after match completion

Current reality:

- GHIN's published materials emphasize personal digital profiles and say login credentials are personal to the user
- GHIN's documented group score-keeping flow supports transferring scores to other GHIN golfers for their review and posting inside the GHIN app

Implementation conclusion:

- MVP should not depend on automatic GHIN posting
- If a private/internal posting workflow becomes available later, it should be added as a separate provider capability
- Fairway Match remains the official tournament scoring and standings engine either way

### Course and tee lookup

Desired state:

- Players choose any regulation USGA-rated course and tee in the app
- Fairway Match instantly pulls rating, slope, par, and stroke index data

Current reality:

- GHIN and USGA clearly maintain course/rating data inside their products
- The public materials reviewed do not expose public API documentation for third-party live course lookup
- GHIN FAQ content also shows hole-by-hole posting depends on par and stroke index existing in their own database

Implementation conclusion:

- We should build a provider boundary for course lookup
- In this workspace, we can begin with the user's existing USGA scrape-backed lookup path
- MVP still needs cache/import fallback so tournament setup is not blocked if a live lookup misses a course or tee

## Recommended product strategy

### What to build as the premium core no matter what

- Elite mobile tournament home with activity feed
- Elite public bracket with ESPN / March Madness feel
- Shared private match scoring experience
- Real-time scoring calculations
- Standings, wild card selection, seeding, and bracket progression
- Match archive with scorecards, dates, location, and tee details

These are fully under our control and create the real value of Fairway Match.

### What to design as provider-backed extensions

- GHIN profile sync
- GHIN index refresh
- GHIN round-posting assistance
- USGA/GHIN course directory lookup

These should sit behind clean interfaces so we can add them when access is available.

## Recommended phased rollout

### Phase 2A: premium tournament core

- Admin auth
- Tournament setup wizard
- Player records with name, email, GHIN number, sync state, and current Handicap Index snapshot
- Team, pod, seed, and schedule management
- Invite emails with private scorecard links
- Shared mobile scorecard with course, tee, and hole scoring
- Public feed, standings, results, and bracket

### Phase 2B: course directory integration layer

- Course search abstraction
- Scrape-backed USGA lookup adapter using the existing workspace code
- Cached course catalog
- Manual/admin fallback for missing course or tee data
- Match setup that snapshots course, tee, slope, rating, par, and stroke index

### Phase 2C: GHIN integration layer

- Store GHIN number and sync state on player records
- Attempt current-index lookup through:
  - an approved private scrape-backed workflow for this tournament, if available
  - or an official GHIN/USGA provider path later
- Support scheduled index refreshes before or during the season
- Add GHIN posting assistance after a round

## Product decisions from the new vision

### Admin setup

- Admin should create players directly in-app
- Every player record should include:
  - name
  - email
  - GHIN number
  - sync status
  - current Handicap Index snapshot

### Scorecard collaboration

- The match link should support one or many scorers viewing the same live round
- At least one scorer must submit the official scorecard
- The system should allow all four golfers to follow and optionally assist

### Match outputs

- Store gross score by player and hole
- Store net score by player and hole
- Store team gross better-ball and net better-ball by hole
- Store final match result, points, holes won, and cumulative net better-ball total

### Public presentation

- Tournament home should feel social and alive
- Bracket should feel like March Madness on mobile
- Match pages should show:
  - date
  - course
  - selected tees
  - all four players
  - hole-by-hole scorecard
  - result summary

## Engineering implications

### New entities we should keep or add

- `Player.email`
- `Player.ghinNumber`
- `Player.handicapSyncStatus`
- `Player.lastHandicapSyncAt`
- `MatchInvitation`
- `CourseLookupCache`
- `ExternalSyncLog`

### New services we should design

- `HandicapProvider`
- `CourseDirectoryProvider`
- `InvitationService`
- `ActivityFeedService`
- `BracketProgressionService`

## Current implementation direction

For the next build step, Fairway Match should assume:

- admin enters players directly in-app
- every player has an email address
- every player has a GHIN number
- handicap sync is attempted through a provider abstraction
- course lookup is attempted through the existing scrape-backed USGA workflow in the workspace
- invite links are generated per match and per player email

## Recommendation

Build the premium tournament operating system first and make external handicap/course integrations pluggable.

That gives us a product that is:

- valuable even without GHIN partner access
- ready to become dramatically better once GHIN and course lookup integrations are unlocked
- not blocked by unknown external approvals

## Sources reviewed

- GHIN overview: https://www.usga.org/ghin
- GHIN FAQ: https://www.usga.org/content/usga/home-page/handicapping/ghin-faqs.html
- GHIN score-keeping feature: https://www.usga.org/content/usga/home-page/articles/2022/10/group-match-tracking-feature-now-available-free-ghin.html
- GHIN terms of service: https://www.usga.org/content/usga/home-page/Handicap-ghin/ghin-terms-of-service.html
