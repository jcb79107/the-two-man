# Platform audit — November 9, 2026

Scope: the active static public site and fictional Season 2 demo in `preview/`.
Baseline: main `fe3d36e8ddd9dbd79287ca904f664c23a773a041`.
This branch is for review; no production deployment or merge was performed.

## Acceptance criteria

Preserve official archive data and scoring rules; fix reproduced defects at their
shared source; retain recovery paths and browser navigation; pass both build modes
and their regression suites. Perform a second review after the first fixes.

## Findings and fixes

| Finding | User effect | Fix and regression evidence |
| --- | --- | --- |
| Undated playoff matches sorted below regular-season matches; head-to-head sorting could return NaN | Career and results timelines implied the wrong tournament order | One comparator orders season, playoff round, played time and stable ID. Used by careers, results, head-to-head and archive graphics. Unit tests cover the undated quarterfinal and reversed input order; browser checks cover rendered order. No date is invented. |
| Saved course metadata was not validated | A malformed `pars` or stroke-index field could crash scorecard rendering | Shared course validation now protects snapshots, draft restoration and publication. Unit rejection cases and a browser fallback check cover malformed metadata. |
| Malformed saved drafts were silently skipped and overwritten when another draft changed | Recoverable browser data could be lost without explanation | Rejected entries survive edits to other matches. Unreadable storage stays untouched and new edits are explicitly visit-only until reset. Explicit replacement/discard removes that match's stale entry. Browser tests cover partial corruption, reload, replacement/discard, unreadable JSON and reset. |
| Shared empty-state component nested block content inside a paragraph | Invalid HTML could be reparsed differently and disrupt hydration/recovery controls | Use a block content container; both builds exercise empty search and keyboard recovery without page errors. |
| Archived pod tables widened the document at 320px | Small phones could horizontally pan the entire page | Let the grid column shrink; table scrolling stays inside its container. Both modes check document overflow at 320px and 1440px. |
| Fully tied teams displayed different competition ranks | Standings implied a tiebreak that had not occurred | Derive rank from the first equal competitive standing, independently of column sorting. Browser tests verify all unplayed teams share rank 1 before and after sorting/reload. |

Also corrected singular “1 match” in head-to-head summaries.

## Two audit passes

First pass traced scoring/domain validation, standings and qualification, bracket
progression, archives/careers, filters and return navigation, commissioner review,
score entry, browser storage, graphics recovery, publication validation/atomic
writes, static routing/metadata and release packaging. Adversarial fixtures covered
missing dates, malformed optional fields, damaged drafts and empty searches.
The first pass found the first five defects above.

Second pass reviewed the resulting diff, tested fully tied standings, and checked
replacement/discard after partial draft recovery. It found the ranking defect and
prevented a rejected draft from resurfacing after its replacement was discarded.
Both browser suites were rebuilt and rerun after these corrections.

A provisional CSS `zoom` test was rejected because it does not reproduce browser
zoom's media-query behavior. The committed check measures 720px reflow instead;
this report does not claim a manual 200% browser-zoom verification.

## Final verification

- 75 unit tests passed across domain, archive, publication, bracket, standings,
  review transitions, score entry, graphics and navigation helpers.
- 52 demo browser checks and 32 public browser checks passed in desktop/mobile
  Chromium projects, with retries disabled.
- The new sweep visits 16 representative routes at 320px and 1440px, checks three
  dense surfaces at 720px, and requests all 18 team and 36 player career routes.
  Existing tests cover archive match pages, scorecards, graphics downloads,
  filter/back/forward/reload behavior and commissioner save-failure recovery.
- Lint, typecheck, formatting, tracked-artifact security check and both static
  builds passed. Production dependency audit reported zero vulnerabilities.
- Manual desktop inspection and narrow-screen screenshot review completed.
- Archive SHA256 remains
  `b3954c209d4c604bee07c3a9fbdc15331674e0380f7887b3b4c169976dca9a87`.

## Limits and release handoff

No database actions, real result publication, merge or deployment. The retired
database app is excluded. This is not a penetration test or a guarantee of zero
bugs. Physical iOS/Safari, assistive-technology testing, real browser zoom and field
Core Web Vitals were not measured. Mobile tests use Chromium emulation.
Browser drafts remain local to one browser; no cross-tab/concurrent-write or
cross-device guarantees were added. Unknown demo match filters still return the
existing recoverable empty state.

After approval, merge only after required PR checks pass, then deploy clean synced
main using the root public build/deploy command and verify production routes.
The known pre-change deployment is `dpl_Fw5zvRM9xJYZycaTVxwaYEuxRHk8`;
retain it as the rollback target for this release.
