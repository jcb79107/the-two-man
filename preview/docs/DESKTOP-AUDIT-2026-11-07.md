# Desktop audit and clubhouse revision

Continues f04c121. Reviewed matches, standings, bracket, earnings, rules, History, records and commissioner at 1024, 1440 and 1920px. No page-wide overflow reproduced. The two-column pod standings did clip their final column at 1440px; fixed desktop table widths, wrapped headers and removed redundant team initials in these tables. All six columns now fit at 1024, 1280, 1440 and 1920px.

The previous homepage had a narrow results-only feed and promoted the AI helper beside the main heading. The revision gives the existing tournament name/mascot a stronger masthead, shows derived match progress, and places recent results beside remaining fixtures. Four results initially display, with Earlier results preserving access to the full timeline. Pending counts and progress update after publication. The sidebar links to the official Season 1 archive and rules. No data, ranking or publication contracts changed.

Verification: 56 unit tests; 20 desktop/mobile browser tests; typecheck, lint, formatting and static build all pass. Browser regressions now cover homepage links, expanding results, publication updates and fitting desktop pod columns. Homepage widths 320, 390, 768, 1024, 1280 and 1920 were measured without document overflow; screenshots reviewed at 390, 1280 and 1440. The Season 1 SHA-256 remains b3954c209d4c604bee07c3a9fbdc15331674e0380f7887b3b4c169976dca9a87.

Release: static preview only; no production promotion, database query/write, migration, credential import or archive-data change. Unrelated original worktree untouched. Limitations: Chromium desktop/mobile emulation, not physical devices or Safari/Firefox; no field performance claim. Season 2 remains sample browser-local editing.

## Navigation, rules and course feedback

Removed the global season selector and archive promotions outside History. Header Rules, AI judge and Instagram now use matching icon/text links. Match course names open Google Maps with course/address queries. Rules no longer have numbers or status eyebrows; format and seeding are explicitly TBD. GHIN copy requires an accurate active handicap, one app per group and the exact 90% four-ball match-play allocation. Removed the score-entry one-stroke cap and updated scorecard indicators and scenario validation for negative net totals. Season 1 data remains unchanged.

Emergency partner withdrawal is a commissioner-approved, next-match-only exception: six holes declared before tee-off, three per nine, two independently played balls; remaining holes and extra holes single-ball. This is not standard four-ball. Modified regular-season cards require manual commissioner review; the four-player demo editor does not automate this exception.

GHIN integration is not enabled. USGA offers approved third-party integration through its GPA program: https://www.usga.org/content/usga/home-page/handicapping/world-handicap-system/GPA-Approved-Vendors.html and https://form.jotform.com/222006675143146. Access, permitted features and costs need confirmation with USGA before implementation. No unofficial credentials or scraping integration added.

Verification: typecheck, lint, 56 unit tests, static build and 20 desktop/mobile browser tests passed. Inspected rules at 1280px and 390px, and match details at 390px. Maps destination URL includes The Glen Club's address. Season 1 SHA-256 remains b3954c209d4c604bee07c3a9fbdc15331674e0380f7887b3b4c169976dca9a87. No production promotion or database operations. Real-device Maps handoff and Safari were not tested.
