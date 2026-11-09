# Commissioner result workflow

Jason sends results/cards to Codex or his existing AI chat. Players coordinate tee times in group texts and use GHIN. The website is a results/graphics destination, not another scheduling or chat app.

## Season 2 preview publishing

The deployable source is `src/season2-results.json`. This is a static, fictional preview: no database connection, online write endpoint, player accounts or private evidence uploads. Git repository access and deployment access control who can publish. A hidden commissioner URL is only navigation, never authentication. Browser manual edits remain local rehearsals and are separated by publication revision so old local edits cannot mask a newly deployed revision.

1. Read the current publication and `src/data.ts` fixture identities. Resolve the exact match and season. Never infer missing scores or use a Season 1 ID.
2. Copy the publication to a temporary JSON file. Increment `revision` by one; write a concise `note` describing the change. Retain unrelated regular cards, seeds and playoff results.
3. A regular entry is the complete existing Match object with four players' 18 gross scores and supplied GHIN strokes, evidence confirmation, course, tees and `YYYY-MM-DD` played date. Each hole permits 0 or 1 stroke. A correction must include its reason in `note`. Current sample regular-season validation uses the existing June 24, 2027 simulation date; this is not a live-season time service.
4. Once all regular results are final, explicitly confirm eight Season 2 team IDs in `seeds`, in seed order. Field format remains TBD; never infer the final competition rules from sample seeding. Playoff entries contain only `id`, `a`, `b`, `winner`, `score`, `date`, `course`. IDs: q1–q4, s1–s2, final. Participants must follow confirmed seeds and feeder winners. Supported results: `4 & 2`, `1 up`, `2 up`, `19 holes`, etc. No invented playoff card. Correcting a feeder must also resolve any now-inconsistent downstream results.
5. Run `npm run results -- /absolute/path/candidate.json`. This validates, checks the immutable Season 1 hash, and prints changed/removed matches, seeds and exact result/graphic paths. Review the output against Jason's request.
6. Run the same command with `--write` only for the intended update. It writes only the Season 2 publication, rejects stale revisions, and atomically replaces the file. It does not commit or deploy.
7. Run typecheck, lint, tests and build. Verify the relevant result, bracket/standings and graphic. Commit only the authorized change; push the Season 2 branch and deploy the static preview. Do not promote production.
8. Return the verified public result and `/review?result=MATCH_ID` graphic links, with the deployment share link when required. Jason should not reselect or re-enter the match.

For another chatbot without repository/deployment access, hand off the proposed result to Codex. The preview does not pretend an arbitrary chatbot can publish directly.

## Commissioner screen

`/review` opens graphics. Regular results support Match result and Full scorecard; playoffs support Match result. Standings and Bracket remain available. An explicit unavailable result never falls back to another match. The secondary Results tab retains manual draft/review/correction as a browser-only fallback. Publication completion links directly to its graphic.

## Recovery and privacy

Keep source evidence in the existing private conversation/channel; this repository/public build is not evidence storage. Do not commit screenshots, GHIN identifiers or contact details. The current preview uses fictional participants only. Roll back an erroneous sample publication by preparing a new, incremented revision with the prior desired content, reviewing removals and redeploying. Git preserves the old revision. Do not edit `season1-public.json`; the command checks SHA-256 b3954c209d4c604bee07c3a9fbdc15331674e0380f7887b3b4c169976dca9a87.

Production live publishing still requires a separately scoped integration with the existing authenticated publication service and explicit Season 2 storage. This change establishes the complete Codex → validated file → deployment → graphic path for the requested preview, without opening access to Season 1.
