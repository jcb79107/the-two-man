# Decision record — Season 2 preview

October 13, 2026. Latest user request authorizes autonomous implementation of a staged preview before any merge to production, superseding the earlier planning-only constraint. It also overrides AGENTS.md's direct push-to-main instruction for this work.

Confirmed: two guaranteed regular-season matches; players use GHIN on the correct course/tees; strokes locked at least 24 hours before tee time; simple logo based on the supplied pair; substantial improvement to scorecard and site UI; show earned prize money; preview before merge.

Proposed: optional April play, regular season through June, published extension procedure. AI/OCR, player submission and GHIN retrieval have been removed from the current scope. Buy-in, payout amounts, expanded field, exact format allowances and unresolved-tie procedure need approval. Preview uses 18 fictional teams and a clearly labeled $250/team example ($4,500 total: six $250 pod awards, $2,000 first, $1,000 second).

Architecture choice: a standalone static Next.js app under preview/, not imported by the production app. No production credentials, data, environments, services or live cards copied. The new flow uses supplied hole strokes, not a recreated Handicap Index/Course Handicap engine. Net better-ball arithmetic is deterministic over staged inputs.

Logo: generated with the built-in image tool using the user's golf-ball duo reference. Prompt: simplify to one pine-green ink; flat cap left/bucket hat right, sunglasses, 3–4 dimples each, transparent negative space, no text/gradients/shadows. Saved as public/two-man-mark.png. The asset is a raster concept; vector/embroidery validation remains after design selection. User originals untouched.

Nothing is merged or deployed to production. No global Vercel project setting may be changed to serve this standalone preview. The hosted preview deploys only static output in preview scope.

## October 14 scope correction

Latest commissioner direction supersedes the earlier player workflow: everybody browses the same public site; only the commissioner will log in to edit the real application. Players arrange matches directly and text/email the card and GHIN screenshots for all four players, course and tees. No player submission links, upload form, scheduling form, role toggle, OCR or custom handicap engine. The 24-hour stroke agreement is recorded from outside the app.

This local slice replaces those preview workflows with match selection, manual gross scores and supplied hole strokes, independent saved drafts, review, publish and correction. Existing scoring math and immutable archives are retained. Corrections require a reason and preserve the old official result until publication. No playoff editing is introduced; playoff card completeness and bracket-change rules need a separate decision. Field size, payout amounts and tie rules remain illustrative or unresolved, never new approved defaults.

The static commissioner demo is openly accessible, has no authentication, and browser-local records are not private. Fictional data only; no real images or personal information. Production needs server authorization, private evidence storage, revision-safe transactional publishing and durable correction history. Jason subsequently authorized committing and pushing this preview branch and publishing its tested static output to Vercel preview. Production writes, main-branch changes and production deployment remain outside scope.

## Connected bracket slice

Current and archived brackets now share the existing eight-slot mirrored path. Later rounds resolve only from feeder winners. No new field, tie or playoff reporting rules were adopted; current unplayed rounds remain placeholders. Legacy completed-scenario links use the existing fictional 2026 archive instead of claiming a Season 02 champion. See BRACKET-VERIFICATION.md for checks and delivery limits.
