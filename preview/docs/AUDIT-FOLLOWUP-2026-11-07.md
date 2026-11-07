# Season 2 audit follow-up

Approved findings 1–6 are implemented on the latest Season 2 preview base (4d02aa3): official public Season 1 History, removal of obsolete styles/exports, a consolidated current design contract, self-hosted Anton display type, reproducible browser CI, and an AI rules prompt without fabricated certification or assumed local rules.

CSS dropped from 5,649 to 4,335 lines. Removed 259 rules belonging to unused hero, upload, brand, old bracket and other obsolete layouts, plus superseded exact-selector declarations. Responsive rules and dynamic bracket/status selectors were retained. Old design iterations moved to DESIGN-HISTORY.md; DESIGN.md now states the current contract.

The wider audit fixed actual Season 1 feeder geometry and labels, course-specific card pars/stroke indexes, archived standings tiebreak ordering, sample/real identity separation, and restoration that overwrote damaged saved drafts before the user edited anything. Pending commissioner rows now expose Enter result directly. New tests exercise draft persistence, publish failure/retry and PNG generation.

Next.js and eslint-config-next were patched from 15.5.27 to 15.5.29 after the registry reported GHSA-2464-fhr4-w9xw and GHSA-p3m5-59mp-jv5r. The static export does not expose Image Optimization or Server Actions, but the dependency was updated. TypeScript ESLint packages are pinned to the compatible 8.72.1 versions. Six moderate development-chain findings remain for minimatch through typescript-estree; npm's proposed fix downgrades to an ESLint-9-incompatible v6 parser and was not retained. No forced major override was applied.

Verification: 56 unit tests, typecheck, lint, Prettier and production static build pass. All 18 Chromium desktop/mobile browser tests pass, covering journeys described in USER-JOURNEYS.md. Screenshots of History and the commissioner desk were visually reviewed. No production writes or changes to the original dirty worktree were made.

Known data limits: Season 1 prize amounts are absent; QF3 has no date; QF2 has a tiebreak winner but no extra-hole count; playoff player cards are absent. These are represented explicitly rather than invented. The current-season commissioner remains a sample demo pending production integration.

Skills informed the pass: Hallmark, Unslop, Awesome DESIGN.md's Nike hierarchy reference, Google DESIGN.md, anti-slop, no-ai-slop, and the relevant workflow guidance from the supplied design/e2e repositories. Product-specific scorebook labels and athletic display type were retained. The e2e framework itself was not installed; existing Playwright regression logic was integrated into a conventional test runner. No broad style reset, schema migration or new platform architecture was introduced.
