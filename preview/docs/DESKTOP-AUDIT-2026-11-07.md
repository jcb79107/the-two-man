# Desktop audit and clubhouse revision

Continues f04c121. Reviewed matches, standings, bracket, earnings, rules, History, records and commissioner at 1024, 1440 and 1920px. No page-wide overflow reproduced. The two-column pod standings did clip their final column at 1440px; fixed desktop table widths, wrapped headers and removed redundant team initials in these tables. All six columns now fit at 1024, 1280, 1440 and 1920px.

The previous homepage had a narrow results-only feed and promoted the AI helper beside the main heading. The revision gives the existing tournament name/mascot a stronger masthead, shows derived match progress, and places recent results beside remaining fixtures. Four results initially display, with Earlier results preserving access to the full timeline. Pending counts and progress update after publication. The sidebar links to the official Season 1 archive and rules. No data, ranking or publication contracts changed.

Verification: 56 unit tests; 20 desktop/mobile browser tests; typecheck, lint, formatting and static build all pass. Browser regressions now cover homepage links, expanding results, publication updates and fitting desktop pod columns. Homepage widths 320, 390, 768, 1024, 1280 and 1920 were measured without document overflow; screenshots reviewed at 390, 1280 and 1440. The Season 1 SHA-256 remains b3954c209d4c604bee07c3a9fbdc15331674e0380f7887b3b4c169976dca9a87.

Release: static preview only; no production promotion, database query/write, migration, credential import or archive-data change. Unrelated original worktree untouched. Limitations: Chromium desktop/mobile emulation, not physical devices or Safari/Firefox; no field performance claim. Season 2 remains sample browser-local editing.
