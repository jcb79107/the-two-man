# Mobile audit — November 7

Continues commit 01db188 and its official read-only Season 1 archive. Audited the deployed preview at 390px and 320px: home, matches, standings, bracket, records, commissioner entry, scorecards and History. No document overflow reproduced. The More menu dismissed correctly on navigation.

Fixed the reproducible scorecard bug where changing nines retained horizontal scroll and left hole 10 offscreen. Added mobile swipe instructions to standings, the shared scorecard and full bracket. Expanded the season picker to the available width with 16px text and a shorter season label, removed excess vertical padding, and arranged footer links into two columns with existing 44px targets.

Verified: 56 unit tests (including archive fingerprint, official outcomes, cards and feeder graph), 18 desktop/mobile browser tests, typecheck, lint, formatting and static build. The main-route mobile regression now runs at 320px; the archived scorecard regression checks scroll reset on changing nines. Revised screenshots reviewed at 320px and 390px. Season 1 source JSON, import, outcome calculations and database remain unchanged. Deployment contains static files only and does not promote production.

Limits: Chromium phone-size emulation, not a physical iPhone/Safari test. Season 2 commissioner edits remain browser-local sample data. Share access is limited to the preview deployment.
