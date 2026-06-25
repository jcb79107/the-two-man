# Microsoft Clarity UX Audit

Passive audit from Microsoft Clarity for `www.thetwoman.site`.

Reviewed on June 24, 2026. Date range: Last 3 days.

## Summary

Clarity does not capture opinions directly, but it gives strong behavioral signals about what visitors are trying to do, where they pause, and which UI areas attract dead taps.

Overall health looked good: 19 sessions, 13 unique users, zero JavaScript-error sessions, zero rage-click sessions, zero excessive-scrolling sessions, and high average scroll depth at 77.23%. The useful friction signals were 5 dead-click sessions and 7 quick-back sessions.

## What Is Working

| Signal | Evidence | Inference |
|---|---|---|
| Standings are the main destination | Standings had 30 visits, ahead of home at 18 and bracket at 4. | Visitors are finding and repeatedly using the core tournament surface. |
| Users explore tournament views | Recordings showed quick movement among Standings, Playoff, Teams, Bracket, and Rules. | The navigation model is understandable enough for visitors to compare views. |
| Instagram traffic is useful | `l.instagram.com` sent 3 sessions, including a bracket deep link that led to multi-page exploration. | Social links are bringing visitors into relevant tournament pages. |
| Long dwell is concentrated on standings and match detail | Clarity AI summarized extended dwell on Standings and Match pages. | Visitors are reading tournament state rather than bouncing immediately. |
| No obvious runtime breakage | Clarity showed 0 JavaScript errors and Sentry had no current production issue groups during the observability pass. | The current concern is UX clarity, not app stability. |

## Friction Found

| Area | Evidence | Likely issue | Fix |
|---|---|---|---|
| Standings tabs | Mobile heatmap for `/tournament/the-two-man-2026/standings` showed `Playoff` as the top tap target, plus one dead tap on `Playoff`. | The already-active tab was still rendered as a link, so repeat taps could look like missed navigation. | Active standings tabs now render as inert current-state controls with `aria-current="page"` instead of links to themselves. |
| Standings leader/status labels | Dead taps included `CURRENT POD LEADER`, and recordings showed taps inside standings/stat cards. | Some status badges and ranking cards look touchable even when they are informational. | Left the cards informational, but reduced the clearest same-page dead tap source by making the active tab non-clickable. Continue watching this hotspot before adding team-detail links. |
| Rules Judge CTA | Home dead-tap heatmap showed 3 dead taps on `Launch rules judge`, its icon/text, and `OPEN`. | The CTA is an external ChatGPT launch; Clarity may classify the current page as unchanged, and the generic `Open` label did not state the destination. | Rules Judge CTAs now label the destination as `ChatGPT`, include an explicit accessibility label, and use `noopener noreferrer`. |
| Quick backs | 7 sessions showed quick backs, mainly among standings, tabs, and bracket. | This mostly matches expected tournament exploration, but it should be watched after tab polish. | No routing architecture change. Retest after more production traffic. |

## Retest Plan

1. Recheck Clarity after 3 to 7 days of production traffic.
2. Compare dead taps on:
   - `/tournament/the-two-man-2026/standings`
   - `/`
   - `/tournament/the-two-man-2026/rules`
3. Expected improvement:
   - Active standings tab dead taps should drop or disappear.
   - Rules Judge dead taps may remain if Clarity classifies external launches as dead, but the CTA should be clearer to users.
4. If standings-card taps remain frequent, the next safe product decision is whether team/status cards should open a team/match detail page or be visually flattened as purely informational rows.
