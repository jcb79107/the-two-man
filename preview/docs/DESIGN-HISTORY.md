# Superseded design iteration notes

## October 14 refinement
Results replace the oversized promotional hero. The existing palette and typography remain unchanged. Focused hole entry and a nine-column mobile hole selector prioritize readable inputs; the full card remains available. The bracket keeps the connected desktop tree and adds a readable mobile overview. This deliberately resolves the earlier promotional layout drift without a new visual identity.

## Focus revision
Prefer a single results timeline and direct utility links over promotional panels. Use literal page titles. Keep season history and commissioner entry accessible; remove public brand-direction content. Round-by-round playoffs are the default.

## Phone controls
Hole selection uses an adaptive grid with at least 44px targets rather than a fixed number of columns. Score entry keeps large numerals and compact player labels; bottom navigation labels stay readable at 12px. Scorecard toggles and the More control have 44px targets. Phone standings keep team names pinned while statistics scroll. Preserve table-owned scrolling and the existing results-first layout.

## Unslop polish — November 4, 2026
Preserve the mascot, pine/cream palette, athletic headings and results-first timeline. Utility disclosure and result metadata use readable 12px sentence-case text; scores remain the visual priority. Feed shortcuts, scorecard links, reset and phone Rules controls have 44px minimum targets. More navigation supports Escape and returns focus to its trigger. Guidance: Unslop by Damir Sokolovsky, https://github.com/heydamir/unslop (CC BY 4.0); reviewed as text only, with no installation or scripts.

## Scorebook refinement — November 4, 2026
Design references: Hallmark (https://github.com/Nutlope/hallmark) and the Nike study bundled with Awesome DESIGN.md (https://github.com/VoltAgent/awesome-design-md). These are guidance and static design analysis, not copied branding or a claim about Nike's current site. Adapted: athletic hierarchy, quiet utility typography, flat content surfaces, consistent spacing and a single product-specific focal point. No external software, fonts or imagery added.

The chronological results feed is a scorebook: date/status rail on desktop, stacked metadata on phones, two team rows with a fixed-width tabular points column. A textual Won label and tinted score cell identify the winner from the existing result calculation; ties have no winner label. Course and scorecard actions remain beside each result. The home title is Results rather than Live feed. The season label is sentence case; shared page labels are 14px and standings headers 12px. Mascot, pine/cream tokens, athletic headings, navigation and all existing destinations remain.

The existing app contract takes precedence over Hallmark's marketing-page defaults: no hero, theme generator, photo placeholders, global overflow clipping, or removed table data. Tables still own horizontal scroll. Keep the scorebook in chronological order and avoid turning it into promotional tiles.

## Earnings ledger — November 4, 2026
Prize money uses a compact two-column summary for total sample purse and earned awards. A six-row pod ledger leads the page, with team names, explicit earned/pending status and right-aligned tabular amounts. Award breakdown is a single definition list beside the ledger on desktop and after it on phones. No oversized monetary hero, decorative award icons or repeated cards. Proposed amounts, stacking and untracked payment status remain visible above the summary.

## Product-wide Unslop pass — November 5, 2026
Product: local two-person golf results and commissioner score entry. Character: assured, readable, club-like. World: a printed golf scorebook. Moments: the supplied mascots and aligned score columns. Signature: a pine rule separating context from competition data.

The audit found undersized tracked utility labels, inconsistent spacing, and a horizontally squeezed commissioner match picker. Shared utility type now uses readable body text, page headings repeat the scorebook rule, match cards align points in a fixed column, and standings use larger data type. Commissioner selection is a two-column desktop list and one-column phone list, with pod, partnership and action clearly separated. Round-view bracket links have comfortable targets without changing the connected bracket geometry. Rules have readable status labels and body copy. The earnings ledger and storage-recovery behavior are preserved.

Guidance: Unslop by Damir Sokolovsky, https://github.com/heydamir/unslop (CC BY 4.0), reviewed as instructions. Installed in Codex at `/Users/jason/.codex/skills/unslop`; contents reviewed as text, no skill scripts or hooks executed. Ponytail informed the shared-selector changes; no new runtime dependency, external font, hook, telemetry or data integration.


## Complete scorebook pass — November 4, 2026
The existing brand and section order remain the direction. Athletic display headings and the original Season 2 mascot are deliberate brand exceptions to generic typography guidance. Use sentence case for operational labels, 600 for interface emphasis, tabular figures and a 12px minimum for secondary scorecard/history text. Team initials use one neutral treatment; their previous rotating colors carried no meaning. Scores and semantic outcome colors retain priority.

History, record filters, career links, scorecard controls and commissioner entry now share comfortable targets and wrapping behavior. Inputs in record filters are 16px to avoid automatic phone zoom. Textareas can resize vertically. The shared muted ink is darker so small text on the mist surface exceeds 4.5:1. Color transitions share one 160ms easing curve and respect the existing reduced-motion rules. The browser icon reuses the supplied mascot asset. The loading state reserves a viewport of content height so the footer does not jump out of view when saved sample data becomes available.

No earnings structure, calculations, fixture data, draft storage or publication recovery logic changed. No dependency, font download, image generation, hook or production integration was added. Verification and limitations: `docs/UNSLOP-VERIFICATION.md`.


## November 5 feedback

Keep the Season 2 mascot, earnings design and reliability flows. Remove the locality label and repetitive footer copy. Use a gavel for the rules judge and the camera mark for Instagram. Standings use operable column headings; playoff field and bubble lists lead into a clearly labeled scenario calculator. The default bracket uses connecting lines across seven matches, with local horizontal scrolling on phones and optional round views. Best-ball scorecard cells use a quiet green fill and underline with a text legend and accessible labels.
