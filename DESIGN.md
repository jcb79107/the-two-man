# fairway-match DESIGN.md

A project-specific design system for fairway-match.

Base inspiration: Linear's precision, dark surfaces, and disciplined spacing.
Adaptation: tournament operations, scoreboard readability, mobile-first live use, and calm player-facing flows.

## 1. Visual Theme & Atmosphere

fairway-match should feel like a serious tournament tool, not a flashy sports app and not a generic SaaS dashboard.

The product needs two modes that still feel like one system:
- operational mode: setup, admin, score entry, match control
- public mode: tournament home, match status, player-facing score views

The shared feeling should be:
- sharp
- calm
- legible under time pressure
- premium without being precious
- mobile-first in posture, even on desktop

Use Linear's discipline, not its literal brand costume.

## 2. Product-Specific Design Priorities

Order matters.

1. readability in bright conditions
2. glanceability during live scoring
3. obvious status and progress cues
4. clean hierarchy for setup/admin flows
5. polished public presentation

If a design move hurts readability, speed, or touch usability, reject it.

## 3. Color Palette & Roles

### Core dark surfaces
- **Canvas**: `#0b0f10`
- **Panel**: `#111617`
- **Elevated surface**: `#171d1f`
- **Soft surface**: `#1e2528`

### Core light surfaces
- **Paper**: `#f7f8f6`
- **Card light**: `#ffffff`
- **Muted light panel**: `#eef2ee`

### Text
- **Primary dark-mode text**: `#f4f6f4`
- **Secondary text**: `#c7d0ca`
- **Muted text**: `#8d9791`
- **Dark text on light**: `#122019`

### Brand and functional accents
- **Pine primary**: `#124c3a`
- **Pine hover**: `#1a664f`
- **Pine soft**: `#edf5ef`
- **Tournament gold**: `#b48a2c`
- **Lavender secondary team**: `#5f4b8b`
- **Lavender soft**: `#f0ebfb`

### State colors
- **Success**: `#1f8a46`
- **Warning**: `#d59a1a`
- **Danger**: `#b43a32`
- **Info**: `#3d6fd6`

### Borders
- **Subtle dark border**: `rgba(255,255,255,0.07)`
- **Standard dark border**: `rgba(255,255,255,0.10)`
- **Light border**: `#d8dfd9`

## 4. Typography Rules

### Font family
Use a clean modern sans stack.

Preferred stack:
`Inter Variable, Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif`

### Tone
- concise headings
- compact operational labels
- slightly more generous spacing on public-facing content
- avoid decorative type choices

### Hierarchy
- **Display**: 40px to 56px, weight 600, tight tracking
- **Page title**: 28px to 36px, weight 600
- **Section title**: 20px to 24px, weight 600
- **Card title**: 16px to 18px, weight 600
- **Body**: 15px to 16px, weight 400 to 500
- **Operational label**: 13px to 14px, weight 500 to 600
- **Tiny metadata**: 11px to 12px, weight 500
- **Score numerals**: large, high-contrast, tabular when possible

### Typography rules
- prioritize legibility over style flourishes
- keep paragraph width controlled on public pages
- in scoring and setup interfaces, text should be short and scannable
- use stronger weight shifts instead of color overload to establish hierarchy

## 5. Layout Principles

### General layout
- use strong card grouping
- prefer clear vertical flow on mobile
- keep maximum content widths controlled on marketing/public pages
- for operational screens, let content breathe but keep controls close to the action

### Spacing scale
Use an 8px system.

Common values:
- 4
- 8
- 12
- 16
- 24
- 32
- 40
- 48

### Density rules
- public pages: medium breathing room
- admin/setup pages: tighter, but never cramped
- scoring UI: compact but touch-safe

## 6. Component Styling

### Buttons

#### Primary button
- background: pine primary
- text: white
- shape: rounded, but not bubbly
- feel: confident, quiet, obvious

#### Secondary button
- dark mode: translucent dark surface with subtle white border
- light mode: white or muted light surface with visible border
- should feel precise, not ghostly or weak

#### Destructive button
- use danger sparingly
- never make destructive actions visually dominant unless urgency requires it

### Cards
- rounded corners in the 10px to 14px range
- visible grouping
- subtle border before shadow
- light elevation only when it improves hierarchy

### Inputs
- clear borders
- strong focus state using pine or info blue ring
- avoid low-contrast placeholder text
- mobile tap targets must feel generous

### Status pills and badges
- compact, readable, semibold
- use pine, gold, lavender, warning, or success sparingly and intentionally
- status should be understandable at a glance

### Score cells and score markers
This is a signature interaction area.

- score values must remain the highest-clarity element in the row
- use shape and border treatment, not only color, to communicate score states
- preserve strong contrast in sunlight and on low-brightness mobile screens
- do not over-style score cells with gradients or decorative effects

### Tables and scoreboards
- preserve alignment at all costs
- emphasize totals, team states, and current hole cleanly
- use muted backgrounds to group sections without reducing contrast
- horizontal overflow is acceptable on mobile if the experience remains predictable and readable

## 7. Public vs Operational Surfaces

### Public-facing tournament views
- more spacious
- slightly more refined presentation
- stronger hero moments and status summaries
- still grounded in the same type and color system

### Operational views
- more compact
- higher information density
- stronger boundaries between sections
- controls should feel immediate and reliable

These are different modes of one product, not two different apps.

## 8. Responsive Behavior

This product is mobile-first.

### Rules
- every important workflow must work comfortably on a phone
- setup and score entry should be usable with one hand when practical
- touch targets should usually be at least 44px high
- avoid tiny side-by-side controls on narrow screens
- stack before shrinking text into uselessness

### Breakpoint behavior
- mobile: prioritize flow, glanceability, sticky context where helpful
- tablet: allow richer grouped panels
- desktop: use width for clarity, not for filling space for its own sake

## 9. Do's and Don'ts

### Do
- borrow Linear's precision and visual restraint
- keep the pine color family as the main product accent
- use lavender intentionally for team differentiation where it already exists
- make operational UI feel calm and trustworthy
- treat score readability as sacred
- keep public pages polished but grounded

### Don't
- do not turn the app into a pure Linear clone
- do not import Linear's indigo as the main accent
- do not make golf UI look like entertainment media UI
- do not use washed-out contrast on key match or score surfaces
- do not add decorative gradients where solid hierarchy would work better
- do not sacrifice mobile clarity for desktop aesthetics

## 10. Agent Prompt Guide

When doing UI work in fairway-match:
- read this file first
- preserve the existing golf/tournament identity
- apply Linear-like precision to spacing, hierarchy, and component discipline
- keep player-facing screens calm and obvious
- keep admin and setup screens sharp, quiet, and fast to scan
- verify visual coherence after implementation, not just functional correctness

## 11. Project-Specific Notes

- fairway-match is not a generic SaaS tool. It is a live-use tournament product.
- design should support real-world pressure, outdoor readability, and quick decisions.
- a clean scoreboard or setup flow is more valuable than a fashionable landing page.
- if forced to choose, optimize for confidence and clarity.
