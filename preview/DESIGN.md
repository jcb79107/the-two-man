---
version: alpha
name: The Two-Man — Season 02 preview
colors:
  primary: '#073e2f'
  background: '#f6f4eb'
  surface: '#fffef9'
  text: '#182d26'
  muted: '#56665e'
  border: '#d5dbd1'
  accent: '#dce8b3'
  attention: '#ac4d32'
typography:
  display:
    fontFamily: 'Anton, Arial Narrow, sans-serif'
  body:
    fontFamily: 'Avenir Next, Avenir, Helvetica Neue, Arial, sans-serif'
  utility:
    fontFamily: 'SFMono-Regular, Consolas, monospace'
rounded:
  control: '4px'
  panel: '6px'
spacing:
  compact: '12px'
  standard: '24px'
  section: '44px'
components:
  primary-button:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.surface}'
    rounded: '{rounded.control}'
---

## Overview
A local golf competition with a real identity: two sunglass-wearing golf balls, a flat cap and a bucket hat. Athletic condensed lettering gives the tournament presence. Operational pages emphasize results, next actions and source evidence. Season 2 remains a sample workspace; History contains a read-only official Season 1 archive.

## Colors
Pine and cream retain the supplied assets' identity. Pale green supports the mascot's negative space. Clay means attention, brass recognizes awards. Status always has text. Runtime token owner: `app/globals.css` `:root`; every shared primitive inherits these variables. No external fonts or image services are required.

## Typography
Anton supplies consistent athletic display lettering. Its Latin WOFF2 ships with the app through @fontsource/anton under the SIL Open Font License; no third-party font request is needed. Avenir/Helvetica body text and monospace competition labels differentiate information. Display faces are reserved for page titles and the brand; data remains readable and tabular.

## Layout
A compact season heading and recent results lead the clubhouse, followed by match rows and navigable data. Desktop uses up to 1,360px. At 900px, navigation becomes a bottom bar plus an explicit More menu. At 560px, page columns stack. Tables own their horizontal scroll; the document owns vertical scroll. No global overflow hiding. Preview controls remain visibly separate from product UI.

## Elevation & Depth
Flat surfaces with borders. Only the illustrative paper card and temporary status message use shadows. No glass panels, background gradients or decorative charts.

## Shapes
4px controls, 6px panels; circles only for team initials, score notation and a small establishment stamp. No nested pill cards.

## Components
`src/ui.tsx` owns icons, logo, heading, badge, team avatar, match row, section title and empty state. `src/workflows.tsx` owns the single reusable scorecard. Native selects and date/time pickers deliberately retain OS-owned geometry. Scope: en-US, Central daylight time for the staged April–June 2027 dates.

## Do's and Don'ts
Do keep the mascot recognizable at header scale. Do show earned separately from paid. Do show original evidence separately from editable draft. Do preserve the same labels across match lists and detail. Don't represent sample data as real GHIN or AI output. Don't invent official qualification when cards/ties remain unresolved.

## Intentional differences from Season 1
| Existing rule | Preview choice | Reason |
| --- | --- | --- |
| Avenir for all roles | Condensed athletic display + readable sans body | User requested a distinctive modern identity |
| 12–28px rounded cards | 4–6px surfaces | Reduce generic stacked-card appearance |
| Sand/gold throughout | Cream/pine with pale green and restrained brass | Simplify the supplied brand while preserving recognition |
| Live score setup as main player journey | Public results; commissioner enters cards received outside the site | Latest commissioner direction |

## History and recognition
Archive pages use the same pine/cream tokens and typography as the active season. A year-led season list, quiet tab navigation and dense records tables take precedence over decorative charts. Champions receive a single framed year panel with direct links to the final and both player records. Repeated pod and match tables use the same spacing and score notation. On mobile, tables scroll within their region, and the record book keeps names visible while scrolling. Archive provenance and unknown values appear beside the content. Sample Season 2 records never contribute to official all-time records.

## Current interaction direction

The default bracket is the full connected seven-match tree, with optional round views and table-owned scrolling on phones. Historical feeder relationships come from the preserved season, not the demo seed layout. Mobile navigation uses Home, Matches, Standings, Bracket and the header More menu. More closes on Escape and restores focus.

The home feed uses a desktop date rail and stacked mobile metadata. Points align in fixed columns. Operational labels use sentence case and at least 12px type; filter inputs use 16px, controls target 44px, and focus is always visible. Respect reduced motion.

The purse is a compact ledger with explicit sample amounts and earned/pending states, never a payment claim. Commissioner Results and Instagram graphics are separate tabs. Manual entry is collapsed until requested; draft, review and durable-save feedback remain explicit.

The scorebook identity overrides marketing-oriented skill defaults: no promotional hero, generic dashboard tiles, global overflow clipping or removed table data. References: [Hallmark](https://github.com/Nutlope/hallmark), [Awesome DESIGN.md](https://github.com/VoltAgent/awesome-design-md) Nike hierarchy study, and [Unslop](https://github.com/heydamir/unslop), CC BY 4.0. These guide restraint and hierarchy, not copied branding. Superseded iteration notes live in docs/DESIGN-HISTORY.md.
