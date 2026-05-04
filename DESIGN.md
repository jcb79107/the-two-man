---
version: "alpha"
name: "The Two Man"
description: "Mobile-first private golf tournament app for players and the commissioner."
colors:
  primary: "#133B2C"
  secondary: "#1F6B4F"
  accent: "#D9B86C"
  background: "#F3EAD7"
  surface: "#FFFCF7"
  surface-muted: "#F7F1E3"
  text: "#112017"
  border: "#DCE7DF"
  success-bg: "#E3F1EA"
  success-text: "#174F38"
  warning-bg: "#FFF1C9"
  warning-text: "#8A6B08"
  playoff-bg: "#EFE7FF"
  playoff-text: "#5F47A6"
typography:
  page-title:
    fontFamily: "Avenir Next"
    fontSize: "2rem"
    fontWeight: 650
    lineHeight: "1.05"
    letterSpacing: "0"
  section-title:
    fontFamily: "Avenir Next"
    fontSize: "1.35rem"
    fontWeight: 650
    lineHeight: "1.15"
    letterSpacing: "0"
  body:
    fontFamily: "Avenir Next"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.55"
    letterSpacing: "0"
  label-caps:
    fontFamily: "Avenir Next"
    fontSize: "0.6875rem"
    fontWeight: 650
    lineHeight: "1.1"
    letterSpacing: "0.18em"
rounded:
  sm: "12px"
  md: "18px"
  lg: "24px"
  xl: "28px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  surface-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.xl}"
    padding: "{spacing.md}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "12px"
  pill-active:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
  pill-muted:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
---

## Overview
The Two Man should feel like a private tournament board: warm, official, calm, and quick to scan from a phone on a golf course. The product is for a small trusted group, so the interface should prioritize status, next action, and leaderboard clarity over marketing copy.

## Colors
Pine is the core action color. Fairway green is for secondary status and metadata. Gold is an accent for tournament identity, dividers, and scorecard heritage. Purple is reserved for playoff/bracket state so it does not compete with the main brand.

## Typography
Use Avenir Next throughout. Keep headings strong but compact. Letter spacing is normal for headings and body text. Uppercase labels may use generous tracking, but they should be short and functional.

## Layout
Mobile is the primary surface. Pages should use a single-column rhythm with compact sections, sticky navigation, and no horizontally scrolling controls unless the content itself is a table or bracket. Desktop can widen tables and bracket views without changing the mobile hierarchy.

## Elevation & Depth
Use soft shadows only to separate major surfaces from the sand background. Repeated rows and table entries should stay flatter and denser than page-level cards.

## Shapes
Rounded corners are part of the identity, but repeated operational UI should stay between 12px and 24px. Reserve 28px+ radii for page-level surfaces and brand moments.

## Components
Primary actions are pine filled buttons. Secondary actions are bordered or sand-filled pills. Tabs should be fixed-width segmented controls on mobile, not side-scrolling pill rows. Tables should favor compact text rows with clear status markers.

## Do's and Don'ts
Do make the next action obvious on every page.
Do keep public player pages warmer and admin pages denser.
Do remove duplicate feed events when a stronger event already communicates the same outcome.
Don't add marketing-style hero copy to operational screens.
Don't use large cards for information that should be scanned as a list.
Don't introduce a new color family unless it represents a new status category.
