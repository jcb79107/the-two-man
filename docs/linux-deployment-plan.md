# Linux Deployment Plan

## Goal

Move the app from the MacBook development machine to the always-on Linux PC, deploy it at the lowest reasonable cost, and make it reachable from a real website domain.

## Recommended Production Shape

- Linux PC runs:
  - Next.js production app
  - PostgreSQL
  - process manager (`systemd` or `pm2`)
- Public traffic reaches the app through:
  - a domain
  - HTTPS
  - a tunnel / reverse proxy layer

## Phase 1: Prepare the Linux PC

### Install core packages

- Git
- Node.js LTS
- npm
- PostgreSQL

### Create an app directory

- Example:
  - `/srv/fairway-match`

### Create a database

- Create a dedicated Postgres database and user for production
- Keep production credentials separate from local dev credentials

## Phase 2: Move the App Code

### Best option

- Put the project in git and clone it onto the Linux PC

### Acceptable option

- Copy the project with `rsync` or `scp`

### Do not copy

- local `node_modules`
- build output like `.next`
- machine-specific local junk

## Phase 3: Move or Rebuild the Data

### If starting fresh for launch

- Deploy the schema on Linux
- Seed only the real field / real tournament data

### If preserving current local state

- Export the local Postgres database from the Mac
- Import it into PostgreSQL on the Linux PC

### Before real launch

- Reset to a clean tournament state
- Confirm:
  - real players
  - real teams
  - real pods
  - no stale results
  - empty official standings

## Phase 4: Production Environment

Set production env vars on the Linux PC:

- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `GOLF_COURSE_API_KEY`

Use strong real production secrets, not local placeholders.

## Phase 5: Build and Run

### First production boot

- install dependencies
- run the Prisma/database setup steps used by the repo
- build the app
- start the production server

### Confirm locally on the Linux PC

- home page loads
- standings loads
- bracket loads
- admin works
- private scorecard setup works
- course search works

## Phase 6: Keep It Running

Use one of:

- `systemd`
- `pm2`

Requirements:

- app starts on boot
- app restarts after crash
- logs are easy to inspect

## Phase 7: Domain and Public Access

### Recommended cheap path

- buy a domain
- point DNS at the public access layer
- use a tunnel or reverse proxy so the Linux PC can serve the site securely

### Production requirements

- HTTPS
- stable public URL
- no broken private scorecard links
- no broken admin access

## Phase 8: Backups

At minimum:

- nightly PostgreSQL dump
- keep multiple recent backups
- store at least one backup off-machine if possible

## Phase 9: Production Smoke Test

After deploy, test:

1. public homepage
2. standings
3. playoff picture
4. bracket
5. rules page
6. public match page
7. private setup link
8. live scorecard flow
9. admin login
10. email invite flow

## Phase 10: Go-Live Sequence

1. verify production env vars
2. verify backups
3. reset to clean official tournament state
4. run final production smoke test
5. distribute scorekeeper links
6. monitor admin + public feed during first live usage

## Tomorrow's Execution Order

1. finish any final UI/UX polish
2. confirm favicon looks right in the browser tab
3. decide the exact domain/hosting path
4. prepare Linux PC packages and folders
5. move code
6. configure database and env vars
7. build and run on Linux
8. connect domain/public access
9. run production smoke tests
