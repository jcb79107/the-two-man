# Fairway Match MVP Foundation

## 1. Product/architecture summary

Fairway Match is a mobile-first tournament operating system for one real 2026 season-long, two-man net better-ball match play event. The product has two operating centers of gravity: the official submitted match scorecard and the living tournament surface that sits on top of it. Every admin workflow, public page, bracket update, and standings calculation flows from that source of truth.

The architecture is intentionally narrow:

- Next.js App Router for mobile-first UI and server rendering
- Postgres data model accessed through Prisma
- A server-side scoring engine that owns handicap conversion, hole stroke allocation, better-ball scoring, match results, pod standings, and playoff qualification inputs
- A bracket layer that persists knockout rounds and advances winners forward
- A feed/event layer that makes the tournament feel alive over time
- Private tokenized match URLs for score entry
- Public read-only routes for tournament home, feed, standings, scorecards, results, and bracket views

## 2. MVP scope

### In scope

- One tournament with configurable name, dates, slug, and rules
- Admin setup for teams, players, Handicap Index, pods, schedule, and playoff bracket
- Unique private match links used as the official live scorecard
- Feed-first public tournament homepage
- Course and tee selection per player for each match
- 90% playing handicap logic from course handicap
- Hole-by-hole gross score entry for all four players
- Automatic net better-ball match play scoring
- Automatic pod standings, playoff qualification, and bracket advancement views
- Activity feed events for results, scheduling, and bracket movement
- Admin reopen, edit, and override support
- Public read-only tournament and match pages

### Deferred from MVP

- Native mobile apps
- Multi-tournament self-serve hosting
- GHIN sync
- Full external course catalog ingestion UI
- Push notifications, texting workflows, and reminders
- Payments, subscriptions, or host billing
- Consolation cup management

## 3. Schema

### Core entities

- `Tournament`: season metadata, scoring rules, schedule windows
- `Player`: player profile, optional GHIN number, Handicap Index
- `Team`: two-player team in the tournament
- `Pod`: three-team group for pod play
- `Match`: pod or playoff fixture, status, token, final result flags, and advancement links
- `Bracket`, `BracketRound`: persistent knockout structure and round sequencing
- `ActivityFeedEvent`: public timeline items for match results, scheduling, and bracket state changes
- `MatchPlayer`: per-match tee choice and computed handicap snapshot
- `HoleScore`: gross score by player and hole
- `Course`, `CourseTee`, `CourseHole`: imported course/tee/rating/slope/hole handicap structure
- `MatchAuditLog`: admin reopen/override/change history

### Key relationships

- One `Tournament` has many `Teams`, `Players`, `Pods`, `Matches`, `BracketRound` records, and `ActivityFeedEvent` rows
- One `Team` belongs to one `Tournament` and has exactly two `Players` through `TeamPlayer`
- One `Pod` belongs to one `Tournament` and has three `Teams` through `PodTeam`
- One `Match` references two `Teams`, optional `Pod`, optional bracket seed metadata, optional advancement destination, and a unique private token
- One `Bracket` owns three rounds: quarterfinals, semifinals, and championship
- One `ActivityFeedEvent` can reference a related match and carry score/course metadata
- One `Match` has four `MatchPlayer` rows that snapshot tee and handicap data at score-entry time
- One `Match` has up to 72 `HoleScore` rows in normal play, or a forfeit flag with awarded totals

## 4. Build milestones

1. Foundation: repo scaffold, domain types, scoring engine, Prisma schema, seed data
2. Tournament setup shell: admin pages for tournament, teams, pods, schedule, bracket
3. Match scoring shell: tokenized scorecard, course/tee selection, live scoring
4. Official result pipeline: submission, reopen, override, public result pages
5. Living tournament surfaces: feed-first home, pod tables, wild card logic, bracket updates
6. Hardening: edge-case handling, test expansion, auth, provider/import boundaries

## PRD

### Problem

Season-long golf tournaments usually rely on spreadsheets, texts, and manual score reconciliation. That breaks down when players use different tees, need net scoring by hole, and want transparent standings, a live tournament home, and a real bracket through a multi-month pod-and-playoff format.

### Goal

Give one tournament host a reliable way to operate the entire season from setup through championship, while players use simple private links as digital scorecards and participants/public viewers can follow the tournament story through a live feed and bracket.

### Success criteria

- A host can fully configure the 2026 tournament without code changes
- Players can complete a round on mobile without admin assistance
- Match results and pod standings are correct on first submission
- Admin can fix mistakes without corrupting standings history
- Public viewers can trust standings, results, and bracket pages as current and official
- Participants feel ongoing momentum when they open the tournament home

## User roles and permissions

### Host admin

- Create and edit the tournament
- Create, edit, archive teams and players
- Enter and update Handicap Index values manually
- Assign pods, schedule, and playoff seeds
- Reopen, override, finalize, or forfeit matches
- View audit history and public/private links

### Match scorer

- Access a match only through its private tokenized URL
- Select course and tees for each player before scoring starts
- Enter and update gross scores hole by hole
- Submit the official scorecard
- View the computed result for that match

### Public viewer

- View tournament feed, standings, results, scorecards, and bracket
- Cannot edit or access private score entry flows

## Main user flows

### Admin creates tournament

1. Host opens admin setup
2. Creates the 2026 tournament shell with dates, slug, allowance, and tiebreak rules
3. System stores tournament rules as explicit versioned values on the tournament record

### Admin creates teams, players, and pods

1. Host enters 18 teams and 36 players
2. Host enters Handicap Index and optional GHIN number for each player
3. Host assigns teams into six pods of three
4. System validates team size, pod size, and duplicate player issues

### Admin schedules matches

1. Host generates or enters the three pod-play matches for each pod
2. Host reviews quarterfinal, semifinal, and championship slots
3. System creates one private token per match
4. System also creates or refreshes activity feed events for scheduling and bracket updates

### Player opens match link

1. Player taps the match URL on mobile
2. System loads a lightweight scorecard page with team names, players, and round status
3. If the match is locked or finalized, the page becomes read-only

### Player selects course and tees

1. Before hole scoring, scorer chooses the course for the match
2. Scorer chooses a tee for each of the four players
3. System snapshots slope, rating, par, and hole handicap data into `MatchPlayer`
4. System calculates course handicap, playing handicap, and stroke allocation by hole

### Player enters scores hole by hole

1. Scorer enters gross scores for all four players
2. UI shows live net better-ball and hole result feedback
3. System stores draft progress and validates hole completeness before final submit

### System computes result

1. Engine converts Handicap Index to course handicap
2. Engine applies 90% allowance and relative stroke allocation
3. Engine computes team net better-ball hole winners and point totals
4. System finalizes standings, wildcard race, playoff advancement, and feed events

### System progresses the bracket

1. Pod winners and two wild cards are seeded automatically after pod play closes
2. Quarterfinal matchups are generated from the seed list
3. Completed knockout matches advance winners into the next round
4. Public bracket and tournament home update immediately from the new state

### Public viewer checks the tournament home

1. Viewer opens the tournament home
2. System shows the latest activity, a quick standings snapshot, and upcoming matches
3. Viewer can tap into bracket or individual scorecards from feed cards

## Edge cases

### MVP must support

- Players on different tees in the same match
- Manual Handicap Index edits before a match starts
- Round submission from one shared private link
- Match ties after 18 holes
- Forfeit with awarded 12 points and +6 holes won
- Admin reopen after submission and standings recomputation
- Asynchronous matches played weeks apart
- Bracket generation once qualifiers are known
- Winner advancement from quarterfinals to semifinals to championship
- Activity feed ordering by most recent event
- Incomplete draft scorecards before final submission
- Missing course/tee selection blocking scoring
- Max one stroke per hole despite handicap spread larger than 18

### Later

- Nine-hole matches or shortened weather rounds
- Temporary handicap freezes or date-effective Handicap Index history
- Multi-admin permissions and player login accounts
- External GHIN validation and sync conflicts
- Partial-match substitutions or roster changes mid-season
- Consolation bracket and side-game formats
- Comments, reactions, or richer social feed interactions

## System architecture

### Frontend

- Next.js App Router with server-rendered public pages
- Mobile-first route structure for fast score entry plus feed/bracket browsing
- Tailwind for fast UI iteration

### Backend

- Next.js route handlers and server actions for tournament mutations
- Prisma client for persistence
- Server-only scoring, standings, bracket, and activity feed modules

### Data boundaries

- `src/lib/scoring`: pure golf rules and standings logic
- `src/lib/server/bracket`: seed ordering, knockout progression, and bracket decoration
- `src/lib/server`: DB-backed orchestration and query composition
- `src/lib/demo`: seed-like mock data for local UI development

## Database design

### Tables

- `Tournament`
- `Player`
- `Team`
- `TeamPlayer`
- `Pod`
- `PodTeam`
- `Course`
- `CourseTee`
- `CourseHole`
- `Bracket`
- `BracketRound`
- `Match`
- `MatchPlayer`
- `HoleScore`
- `MatchAuditLog`
- `ActivityFeedEvent`

### Design notes

- Match handicap calculations are snapshotted so later Handicap Index changes do not rewrite history
- Public standings are derived, not manually edited
- `Match` contains both business status and operational status for reopen/override workflows
- Bracket progression is modeled explicitly rather than inferred only from labels
- Activity feed events are append-only records that point back to matches when possible
- Course data is normalized for future provider imports

## Scoring engine responsibilities

- Convert Handicap Index to course handicap from slope, rating, and par
- Apply tournament allowance rules
- Compute relative strokes from the low player in the match
- Cap stroke allocation at one stroke per hole
- Evaluate gross, net, and better-ball values per hole
- Produce hole points, holes won, team net better-ball total, and winner
- Handle forfeits without hole-level scoring
- Supply standing-friendly outputs for pod sorting
- Supply qualification-friendly outputs for seeding and bracket advancement

## API routes and server actions

### Admin mutations

- `POST /api/admin/tournament/bootstrap`
- `POST /api/admin/teams`
- `PATCH /api/admin/players/:playerId`
- `POST /api/admin/pods`
- `POST /api/admin/matches`
- `POST /api/admin/matches/:matchId/reopen`
- `POST /api/admin/matches/:matchId/override`

### Match scoring

- `GET /api/matches/:token/scorecard`
- `POST /api/matches/:token/course-setup`
- `PUT /api/matches/:token/hole-scores`
- `POST /api/matches/:token/submit`

### Public reads

- `GET /api/public/tournament/:slug`
- `GET /api/public/tournament/:slug/bracket`
- `GET /api/public/tournament/:slug/standings`
- `GET /api/public/tournament/:slug/bracket`
- `GET /api/public/matches/:matchId`

## Private links and public pages

- Every match gets a cryptographically random private token stored on the match row
- Private link grants access to score entry only for that match
- Public pages use stable slug and match IDs without exposing private tokens
- Finalized scorecards can be rendered publicly from a separate read-only route
- Tournament home and bracket pages stay public-safe because they only read finalized or scheduled state

## Recommended folder structure

```text
app/
  admin/
  match/[token]/
  tournament/[slug]/
  api/
prisma/
src/
  components/
  lib/
    api/
    demo/
    scoring/
    server/
  types/
tests/
docs/
```

## Step-by-step build plan

1. Lock the domain model for scoring, bracket progression, and activity feed events
2. Finalize Prisma schema and seed the 2026 tournament shell
3. Build the feed-first public tournament home
4. Build the private match scorecard shell
5. Wire score submission into server mutations
6. Add standings recomputation, bracket advancement, and feed creation
7. Harden tests around tie-breakers, forfeits, seeding, and progression

## Highest-risk technical areas

- Correct stroke allocation when four players use different tees
- Snapshotted vs live handicap data boundaries
- Tiebreaker interpretation for “lowest net better-ball score”
- Reopen and override workflows without stale standings
- Deterministic seeding and bracket advancement after asynchronous pod play
- Feed generation that stays truthful when matches are edited or reopened
- Course/tee provider abstraction without overbuilding too early

## What to build first

Build the scoring engine, standings qualification logic, and bracket/feed schema first. If those are correct, the rest of the app is mostly workflow and presentation. If those are wrong, every screen becomes expensive to unwind.

## Explicit assumptions for this scaffold

- A tied match counts as `0.5` in match record sorting
- “Lowest net better-ball score” is interpreted as the lowest 18-hole team net better-ball total recorded in pod play
- One private match link is shared by both teams for MVP
- The activity feed is public by default in this scaffold
- Course catalog comes from seeded or imported data, not manual course authoring in the first admin UI
- Authentication is deferred; admin routes are scaffolded but not yet protected
- Future GHIN sync and provider imports are marked with TODOs in code rather than implemented now

## Locked Tournament Rules v1

This section is the current source of truth for the 2026 tournament format.

### Overview

- Format: 2-man team tournament
- Teams: 18
- Structure: pod play -> playoffs -> champion
- Season window: May 1 to October 1, 2026

### Timeline

- May: pod match 1 window
- June: pod match 2 window
- July: quarterfinals
- August: semifinals
- September: championship

### Tournament structure

- 18 teams are divided into 6 pods of 3 teams
- Each team plays 2 pod matches
- 6 pod winners plus 2 wild cards advance to an 8-team playoff

### Match format

- Format: 2-man net better-ball match play
- Length: 18 holes
- Each player receives 90% of course handicap
- Course handicap is based on tee played, course rating, slope rating, and par

### Handicap rules

- Lowest handicap player in the match plays off 0
- Other players receive strokes based on the difference from the low player
- Strokes are applied using the selected tee's hole handicap allocation
- Maximum 1 stroke per hole per player
- Players may play different tees in the same match

### Pod scoring system

- Hole win: 1 point
- Hole tie: 0.5 points to each team
- Hole loss: 0 points
- Teams accumulate totals across both pod matches

### Pod standings

Teams are ranked by:

1. Match record
2. Total hole points
3. Total holes won
4. Lowest cumulative net better-ball score
5. Coin flip

Notes:

- A team going 2-0 wins the pod
- If all teams go 1-1, the tiebreakers decide the pod winner

### Wild card qualification

- The top 2 non-pod winners advance
- Wild cards are ranked by:

1. Match record
2. Total hole points
3. Total holes won
4. Lowest cumulative net better-ball score
5. Coin flip

### Playoff seeding

- Seeds 1-6 are pod winners
- Seeds 7-8 are wild cards
- Seeds 1-6 are ranked by:

1. Match record
2. Total hole points
3. Total holes won
4. Lowest cumulative net better-ball score
5. Coin flip

- Seeds 7-8 are ranked using the wild card criteria

### Bracket

- 1 vs 8
- 2 vs 7
- 3 vs 6
- 4 vs 5

### Playoff tiebreaker

If tied after 18 holes:

1. Sudden death playoff, if feasible
2. Otherwise net scorecard playoff using holes 18 backward
3. Otherwise coin flip

### Course and tee rules

- Matches are played at a mutually agreed course
- Course must be regulation and USGA-rated with slope
- Handicaps must reflect the tees actually played

### Scheduling rules

- One match per month
- Each match must be completed in its assigned month
- Teams are responsible for scheduling
- Commissioner may assign forfeits for incomplete matches

### Forfeit policy

- Win awarded to opponent
- Winning team receives 12 hole points
- Winning team receives +6 holes won
- No net better-ball score is recorded for a forfeit

### Score submission requirements

After each match, teams must submit:

- Match result
- Total hole points
- Total holes won
- Net better-ball score
- Scorecard photo or verified score entry

### Product interpretation for MVP

- The digital match scorecard is the official source of truth
- Scorecard photo support can be added, but verified digital entry is sufficient for MVP
- “Lowest cumulative net better-ball score” means the lowest team cumulative net better-ball total across pod-play matches
- Playoff matches require a winner even if the 18-hole match ends tied
- Bracket advancement is based on the final playoff winner after any tiebreak procedure
