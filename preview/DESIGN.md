---
version: alpha
name: The Two-Man — Season 02 preview
colors:
  primary: '#073e2f'
  background: '#f6f4eb'
  surface: '#fffef9'
  text: '#182d26'
  muted: '#607068'
  border: '#d5dbd1'
  accent: '#dce8b3'
  attention: '#ac4d32'
typography:
  display:
    fontFamily: 'Impact, Arial Narrow, Helvetica Neue, sans-serif'
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
A local golf competition with a real identity: two sunglass-wearing golf balls, a flat cap and a bucket hat. Athletic condensed lettering gives the tournament presence. Operational pages emphasize results, next actions and source evidence. This is an isolated proposal, not a replacement for Season 1's design contract.

## Colors
Pine and cream retain the supplied assets' identity. Pale green supports the mascot's negative space. Clay means attention, brass recognizes awards. Status always has text. Runtime token owner: `app/globals.css` `:root`; every shared primitive inherits these variables. No external fonts or image services are required.

## Typography
Impact (available locally on the reviewed Mac) supplies athletic display lettering; Helvetica-based fallback remains usable across systems. Avenir/Helvetica body text and monospace competition labels differentiate information. Display faces are reserved for page titles and the brand; data remains readable and tabular. A final licensed/self-hosted display font remains a design decision before production.

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
Archive pages use the same pine/cream tokens and typography as the active season. A year-led season list, quiet tab navigation and dense records tables take precedence over decorative charts. Champions receive a single framed year panel with direct links to the final and both player records. Repeated pod and match tables use the same spacing and score notation. On mobile, tables scroll within their region, and the record book keeps names visible while scrolling. Fictional archive provenance appears beside the content, not only in a footer.

## October 14 refinement
Results replace the oversized promotional hero. The existing palette and typography remain unchanged. Focused hole entry and a nine-column mobile hole selector prioritize readable inputs; the full card remains available. The bracket keeps the connected desktop tree and adds a readable mobile overview. This deliberately resolves the earlier promotional layout drift without a new visual identity.
