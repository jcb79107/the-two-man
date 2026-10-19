# Focused preview — October 19, 2026

Compared production home, standings and bracket in the browser. Restored the results timeline, existing production AI rules judge URL and Instagram destination. Removed brand route/navigation, homepage promotional sections and slogans in page headings. Standings expose holes won and net better-ball again; bracket defaults to quarterfinal round view with the full tree still available.

Acceptance: official-only newest-first feed with working pagination and scorecards; useful league navigation; no brand page; readable mobile home and standings; round navigation and archived result links work. These were checked in Chrome at desktop and 390px mobile. No page overflow on mobile home. No browser warnings/errors in tested flows. 32 unit tests, lint, types, formatting, static build and strict UI audit pass. External rules judge destination matches production; its third-party answers were not tested. Sample data remains browser-local; no production data or deployment changes.

The feed currently derives match-date entries from official sample matches. It is not a server-pushed activity log, and draft entries do not appear. Production integration of timestamped announcements and playoff milestones remains separate from this static preview.
