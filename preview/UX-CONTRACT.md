# Season 02 preview behavior contract

This contract applies only to the standalone `preview` app. Visual intent is in DESIGN.md. Business source: the commissioner's October 13 conversation, captured in `docs/DECISIONS.md`. Production Season 1 remains unchanged.

## Canonical UI Map
| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Select/Listbox | Native select | This contract | Role and match chooser, OS popup accepted | Browser keyboard and selection |
| Date | Native date/time input in ScheduleForm | Confirmed 24-hour rule | Staged Central daylight dates | Cutoff unit tests, browser rejection |
| Form | Workflows forms and domain validation | Commissioner direction | Submission, review, schedule | Error and success browser passes |
| Scrollbar | app/globals.css root + engine fallbacks | DESIGN.md | Table horizontal regions | Narrow viewport inspection |
| Toast | PreviewProvider notice + App status | This contract | Success and storage failure | Browser live status |
| CRUD | PreviewProvider save/reset | Staged-only boundary | Review update and reversible reset | Unit + browser |

## State and navigation
Every route is a real link with refresh/back support. Match filters and search, standings view, bracket round and scenario live in URL parameters. Local scoring mode/front-back switches are temporary presentation state. The entire staged field is 18 teams/18 matches; render all with explicit counts rather than fake pagination. Original fixture evidence is immutable; review drafts never alter it.

Sample changes are saved only to browser localStorage, with schema validation on restore and an honest memory-only message if storage fails. Review edits survive in-app navigation through provider draft state; explicit Save review draft persists them. Dirty review edits warn on page unload. No cross-user or cross-tab concurrency guarantee; this is not the production write architecture. Real selected photos are blob URLs in memory, associated with one match and never sent to a server. Reload loses the selected photo; UI says so.

Player and commissioner roles are preview controls, not authentication. The whole review UI is deliberately visible to the owner. A live application needs separate server-side authorization, access-scoped storage and revision-safe writes before reuse.

## Workflow ledger
- Submit sample card → agreement validation → review status → success page → review or match. Simulated failure retains input.
- Review → editable gross values → explicit source attestation → official result → queue disappears and standings recompute. Missing/invalid entries are rejected. No messages are sent.
- Correction → required note → correction state; not included in official standings. No email/SMS claimed.
- Schedule → valid staged date/course → saved fixture. Changing date/course invalidates the existing lock. Lock requires agreement and at least 24 hours before the staged tee time.
- Reset → inline app-owned confirmation → original fixtures and draft state restored. No production records exist here.

## Boundaries
No database, server actions, API routes, telemetry, authentication secrets, payment integration, live OCR, GHIN lookup, or messaging provider. Sample amounts reconcile to the sample pool but are not approved prize terms. Completed bracket scenario is labeled separately and does not mutate the active season. Historical index and playing-stroke evidence must eventually be captured at lock time; never reconstructed from current values silently.

## Accessibility and resilience
Semantic links, buttons, tables, labels, native controls, visible focus, text status, aria-current/pressed, reduced motion and forced-color support. No modal needed. No network pending state is simulated as live work. Local load has a status; empty filters and empty review queue have recovery links. Upload accepts JPG/PNG/WebP to 8MB with browse alternative to drag/drop. No external file transmission. Validation preserves inputs. Performance and accessibility compliance require broader production testing.

## League history
History navigation, the record book and career pages are owned by `src/history.tsx`; season snapshots and career aggregation by `src/history-data.ts`. Season identity belongs in the route, not a mutable global current-year variable. Search/ranking/entity/scope live in URL query parameters. Archive cards use the shared Scorecard with historical participant labels. Immutable sample history stays separate from editable current-season storage. Unknown playoff hole data renders an explicit unavailable state. See docs/SEASON-HISTORY.md for metric definitions and production migration boundaries.
